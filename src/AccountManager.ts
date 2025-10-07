import * as vscode from "vscode"
import { Agent } from "@atproto/api"
import { NodeOAuthClient, NodeSavedSession, NodeSavedState, Session } from "@atproto/oauth-client-node"
import { Poaster } from "./Poaster"

export class AccountManager {
	static stateStorePrefix = "poaster-state-"
	static sessionStorePrefix = "poaster-session-"
	static ambigiousAgent = Symbol("Ambigious agent.")
	poaster: Poaster
	context: vscode.ExtensionContext
	oauthClient: NodeOAuthClient
	/** */
	constructor(poaster: Poaster) {
		this.poaster = poaster
		this.context = poaster.context
		const zhat = this
		this.oauthClient = new NodeOAuthClient({
			clientMetadata: {
				client_id: "https://shelby.bunnynabbit.com/client-metadata.json",
				client_name: "Poast Fetcher",
				redirect_uris: ["https://shelby.bunnynabbit.com/atproto-oauth-callback"],
				scope: "atproto transition:generic",
				grant_types: ["authorization_code", "refresh_token"],
				response_types: ["code"],
				application_type: "native",
				token_endpoint_auth_method: "none",
				dpop_bound_access_tokens: true,
			},

			stateStore: {
				async set(key: string, internalState: NodeSavedState): Promise<void> {
					const prefixedKey = AccountManager.stateStorePrefix + key
					const existing = await zhat.context.secrets.get(prefixedKey)
					if (existing) console.log("Overwriting existing state for key", prefixedKey)
					await zhat.context.secrets.store(prefixedKey, JSON.stringify(internalState))
				},
				async get(key: string): Promise<NodeSavedState | undefined> {
					const prefixedKey = AccountManager.stateStorePrefix + key
					const existing = await zhat.context.secrets.get(prefixedKey)
					if (!existing) return undefined
					return JSON.parse(existing) as NodeSavedState
				},
				async del(key: string): Promise<void> {
					const prefixedKey = AccountManager.stateStorePrefix + key
					await zhat.context.secrets.delete(prefixedKey)
				},
			},

			sessionStore: {
				async set(sub: string, session: NodeSavedSession): Promise<void> {
					const prefixedKey = AccountManager.sessionStorePrefix + sub
					const existing = await zhat.context.secrets.get(prefixedKey)
					if (existing) console.log("Overwriting existing session for sub", prefixedKey)
					await zhat.context.secrets.store(prefixedKey, JSON.stringify(session))
				},
				async get(sub: string): Promise<NodeSavedSession | undefined> {
					const prefixedKey = AccountManager.sessionStorePrefix + sub
					const existing = await zhat.context.secrets.get(prefixedKey)
					if (!existing) return undefined
					return JSON.parse(existing) as NodeSavedSession
				},
				async del(sub: string): Promise<void> {
					const prefixedKey = AccountManager.sessionStorePrefix + sub
					await zhat.context.secrets.delete(prefixedKey)
				},
			},
		})
	}
	static oauthStatusTypes = {
		proceed: 0,
		loginRequired: 1,
	}
	/** */
	async addAccount(handle: string) {
		const url: URL = await this.oauthClient.authorize(handle, {
			state: "you can put anyzhing in here.",
		})
		return { type: AccountManager.oauthStatusTypes.loginRequired, url: url.toString() }
	}

	handleUri(uri: vscode.Uri) {
		this.completeLogin(uri).catch((err) => {
			console.error("Error completing login:", err)
			vscode.window.showErrorMessage("Error completing login. See console for details.")
		})
	}

	async completeLogin(uri: vscode.Uri) {
		const params = new URLSearchParams(uri.query)
		const { session, state } = await this.oauthClient.callback(params)
		const agent = new Agent(session)
		this.poaster.agents.push(agent)
		if (agent.did) {
			const profile = await agent.getProfile({ actor: agent.did })
			vscode.window.showInformationMessage(`Login successful for ${profile.data.displayName ?? agent.did}.`)
			this.addManagedAccount(agent.did, profile.data.displayName ?? agent.did).catch((err) => {
				console.error("Error saving account:", err)
			})
		}
	}

	async removeManagedAccount(did: string) {
		const accounts = await this.getManagedAccounts()
		const index = accounts.findIndex((account: { did: string }) => account.did == did)
		if (index !== -1) {
			accounts.splice(index, 1)
			await this.saveManagedAccounts(accounts)
		}
	}

	async addManagedAccount(did: string, label: string) {
		const accounts = await this.getManagedAccounts()
		if (accounts.some((account) => account.did == did)) return
		accounts.push(new SavedAccount(did, label))
		await this.saveManagedAccounts(accounts)
	}

	async saveManagedAccounts(accounts: SavedAccount[]) {
		await this.context.secrets.store("poaster-managed-accounts", JSON.stringify(accounts.map((account) => account.serialize())))
	}

	async getManagedAccounts(): Promise<SavedAccount[]> {
		const savedAccounts = await this.context.secrets.get("poaster-managed-accounts")
		if (!savedAccounts) return []
		return JSON.parse(savedAccounts).map((savedAccount: serializedSavedAccount) => {
			return SavedAccount.deserialize(savedAccount)
		})
	}
}

class SavedAccount implements vscode.QuickPickItem {
	did: string
	label: string
	/** */
	constructor(did: string, label: string) {
		this.did = did
		this.label = label
	}

	serialize(): serializedSavedAccount {
		return { did: this.did, label: this.label }
	}

	toString() {
		return `${this.label} (${this.did})`
	}

	static deserialize(serialized: string | serializedSavedAccount) {
		if (typeof serialized !== "string") return new SavedAccount(serialized.did, serialized.label)
		const { did, label } = JSON.parse(serialized)
		return new SavedAccount(did, label)
	}

	get detail() {
		return this.did
	}
}

export interface serializedSavedAccount {
	did: string
	label: string
}
