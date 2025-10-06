import * as vscode from "vscode"
import { Agent } from "@atproto/api"
import { NodeOAuthClient, NodeSavedSession, NodeSavedState, Session } from "@atproto/oauth-client-node"

export class Poaster {
	agents: Agent[]
	context: vscode.ExtensionContext
	oauthClient: NodeOAuthClient
	/** */
	constructor(context: vscode.ExtensionContext) {
		this.context = context
		this.agents = []
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
					const prefixedKey = Poaster.stateStorePrefix + key
					const existing = await zhat.context.secrets.get(prefixedKey)
					if (existing) console.log("Overwriting existing state for key", prefixedKey)
					await zhat.context.secrets.store(prefixedKey, JSON.stringify(internalState))
				},
				async get(key: string): Promise<NodeSavedState | undefined> {
					const prefixedKey = Poaster.stateStorePrefix + key
					const existing = await zhat.context.secrets.get(prefixedKey)
					if (!existing) return undefined
					return JSON.parse(existing) as NodeSavedState
				},
				async del(key: string): Promise<void> {
					const prefixedKey = Poaster.stateStorePrefix + key
					await zhat.context.secrets.delete(prefixedKey)
				},
			},

			sessionStore: {
				async set(sub: string, session: NodeSavedSession): Promise<void> {
					const prefixedKey = Poaster.sessionStorePrefix + sub
					const existing = await zhat.context.secrets.get(prefixedKey)
					if (existing) console.log("Overwriting existing session for sub", prefixedKey)
					await zhat.context.secrets.store(prefixedKey, JSON.stringify(session))
				},
				async get(sub: string): Promise<NodeSavedSession | undefined> {
					const prefixedKey = Poaster.sessionStorePrefix + sub
					const existing = await zhat.context.secrets.get(prefixedKey)
					if (!existing) return undefined
					return JSON.parse(existing) as NodeSavedSession
				},
				async del(sub: string): Promise<void> {
					const prefixedKey = Poaster.sessionStorePrefix + sub
					await zhat.context.secrets.delete(prefixedKey)
				},
			},
		})
	}

	static stateStorePrefix = "poaster-state-"
	static sessionStorePrefix = "poaster-session-"
	static ambigiousAgent = Symbol("Ambigious agent.")

	static oauthStatusTypes = {
		proceed: 0,
		loginRequired: 1,
	}

	async addAccount(handle: string) {
		// Check if account already exists
		// const existingAgent = this.agents.find((agent) => agent.session?.handle === handle)
		// if (existingAgent) {
		// 	vscode.window.showInformationMessage(`Account with handle ${handle} already exists.`)
		// 	return { type: Poaster.oauthStatusTypes.proceed }
		// }
		const url: URL = await this.oauthClient.authorize(handle, {
			state: "you can put anyzhing in here."
		})
		return { type: Poaster.oauthStatusTypes.loginRequired, url: url.toString() }
	}

	handleUri(uri: vscode.Uri) {
		// if (uri.path !== "/atproto-oauth-callback") return
		vscode.window.showInformationMessage(`handle`)
		this.completeLogin(uri).catch((err) => {
			console.error("Error completing login:", err)
			vscode.window.showErrorMessage("Error completing login. See console for details.")
		})
	}

	async completeLogin(uri: vscode.Uri) {
		const params = new URLSearchParams(uri.query)
		const { session, state } = await this.oauthClient.callback(params)
		const agent = new Agent(session)
		// agent.
		this.agents.push(agent)
		if (agent.did) {
			const profile = await agent.getProfile({ actor: agent.did })
			console.log("Bsky profile:", profile.data)
			vscode.window.showInformationMessage(`Login successful for ${profile.data.handle} - ${JSON.stringify(profile.data)}`)
		}

		// vscode.window.showInformationMessage(`Login successful for ${session.handle}`)
		// console.log("Logged in with handle", session.handle)
	}
}
