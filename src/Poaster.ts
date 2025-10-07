import * as vscode from "vscode"
import { Agent } from "@atproto/api"
import { NodeOAuthClient, NodeSavedSession, NodeSavedState, Session } from "@atproto/oauth-client-node"
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
}
