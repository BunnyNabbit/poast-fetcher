import * as vscode from "vscode"
import { Poaster } from "./Poaster"
import { AccountManager } from "./AccountManager"

export function activate(context: vscode.ExtensionContext) {
	const poaster = new Poaster(context)
	context.subscriptions.push(
		vscode.window.registerUriHandler({
			handleUri: (uri: vscode.Uri) => {
				poaster.accountManager.handleUri(uri)
			},
		})
	)
	context.subscriptions.push(
		vscode.commands.registerCommand("poast-fetcher.configure", async () => {
			const configurationItems: vscode.QuickPickItem[] = [
				{ label: "Add account", description: "Login with an existing account." },
				{ label: "Remove account", description: "Remove an added account." },
			]
			vscode.window
				.showQuickPick(configurationItems, {
					placeHolder: "Pick one",
				})
				.then(async (selection) => {
					if (!selection) return
					if (selection == configurationItems[0]) {
						const handle = await vscode.window.showInputBox({
							prompt: "Enter handle.",
							placeHolder: "account.bsky.social",
						})
						if (!handle) return
						const status = await poaster.accountManager.addAccount(handle)
						if (status.type == AccountManager.oauthStatusTypes.loginRequired) {
							vscode.window.showInformationMessage("Login required. A browser window will now open.")
							vscode.env.openExternal(vscode.Uri.parse(status.url))
						}
					} else if (selection == configurationItems[1]) {
						const accountSelection = await poaster.promptPickAccount({
							placeHolder: "Select an account to remove.",
							noAccountsText: "No accounts to remove.",
						})
						if (!accountSelection) return
						await poaster.accountManager.removeManagedAccount(accountSelection.did)
						vscode.window.showInformationMessage(`Removed account ${accountSelection}.`)
					}
				})
		})
	)
}

// This method is called when your extension is deactivated
export function deactivate() {}
