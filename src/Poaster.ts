import * as vscode from "vscode"
import { Agent } from "@atproto/api"
import { AccountManager } from "./AccountManager"
import { SavedAccount } from "./SavedAccount"
import { BaseFeed, TimelineFeed } from "./BaseFeed"

export class Poaster {
	agents: Map<string, Agent>
	context: vscode.ExtensionContext
	accountManager: AccountManager
	/** */
	constructor(context: vscode.ExtensionContext) {
		this.context = context
		this.agents = new Map()
		this.accountManager = new AccountManager(this)
	}

	async promptPickAccount(options: promptPickAccountOptions) {
		const accounts = await this.accountManager.getManagedAccounts()
		if (accounts.length === 0) {
			vscode.window.showInformationMessage(options.noAccountsText ?? "No accounts available. Please add an account first.")
			return null
		} else if (accounts.length === 1 && options.automaticallyPickSingle) {
			return accounts[0]
		}
		const accountSelection = await vscode.window.showQuickPick(accounts, {
			placeHolder: options.placeHolder ?? "Select an account.",
		})
		if (!accountSelection) return null
		return accountSelection
	}

	async ensureAgentForSavedAccount(account: SavedAccount): Promise<Agent | null> {
		let cachedAgent = this.agents.get(account.did)
		if (!cachedAgent) {
			// Attempt to restore session via OAuth
			const session = await this.accountManager.oauthClient.restore(account.did)
			const agent = new Agent(session)
			this.agents.set(account.did, agent)
			return agent
		}
		return cachedAgent
	}

	async createPost(account: SavedAccount, content: string) {
		const agent = await this.ensureAgentForSavedAccount(account)
		if (!agent) throw new Error("Could not get agent for account.")
		await agent.post({
			text: content,
		})
	}

	getFeedViewHtml(panel: vscode.WebviewPanel) {
		const scriptSrc = panel.webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, "media", "client", "main.js"))
		const styleSrc = panel.webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, "media", "client", "vscode.css"))
		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<link href="${styleSrc}" rel="stylesheet" />
	<script src="${scriptSrc}"></script>
</head>
<body>
	<div id="postsContainer"></div>
</body>`
	}

	async openFeedView(account: SavedAccount, feedClass: typeof BaseFeed, feedOptions?: any) {
		const agent = await this.ensureAgentForSavedAccount(account)
		if (!agent) throw new Error("Could not get agent for account.")
		const feed = new feedClass(agent, feedOptions)
		const panel = vscode.window.createWebviewPanel("feed", `Feed - ${account.label}`, vscode.ViewColumn.Active, {
			enableScripts: true,
			localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, "media", "client")],
			retainContextWhenHidden: true, // TODO: Retain state so zhis doesn't have to be enabled.
		})
		panel.webview.html = this.getFeedViewHtml(panel)
		panel.webview.onDidReceiveMessage(async (message) => {})
		feed.addPosts.event(async (posts) => {
			panel.webview.postMessage({ type: "addPosts", value: posts })
		})
		feed.loadMore().catch((err) => {
			vscode.window.showErrorMessage(`Failed to load feed: ${err}`)
			panel.webview.postMessage({ type: "error", value: err?.message })
		})
		return panel
	}
}

interface promptPickAccountOptions {
	/** Zhe text displayed for zhe quick pick window. */
	placeHolder?: string
	/** Text for zhe message if no accounts are managed by zhe account manager. */
	noAccountsText?: string
	/** If an account should be automatically picked if exactly one exists. */
	automaticallyPickSingle?: boolean
}
