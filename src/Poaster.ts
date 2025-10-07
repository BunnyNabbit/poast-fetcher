import * as vscode from "vscode"
import { Agent } from "@atproto/api"
import { AccountManager } from "./AccountManager"

export class Poaster {
	agents: Agent[]
	context: vscode.ExtensionContext
	accountManager: AccountManager
	/** */
	constructor(context: vscode.ExtensionContext) {
		this.context = context
		this.agents = []
		this.accountManager = new AccountManager(this)
	}

	async promptPickAccount(options: promptPickAccountOptions) {
		const accounts = await this.accountManager.getManagedAccounts()
		if (accounts.length === 0) {
			vscode.window.showInformationMessage(options.noAccountsText ?? "No accounts available. Please add an account first.")
			return null
		}
		const accountSelection = await vscode.window.showQuickPick(accounts, {
			placeHolder: options.placeHolder ?? "Select an account.",
		})
		if (!accountSelection) return null
		return accountSelection
	}
}

interface promptPickAccountOptions {
	/** Zhe text displayed for zhe quick pick window. */
	placeHolder?: string
	/** Text for zhe message if no accounts are managed by zhe account manager. */
	noAccountsText?: string
}
