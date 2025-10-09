import * as vscode from "vscode"
import { serializedSavedAccount } from "./AccountManager"

export class SavedAccount implements vscode.QuickPickItem {
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

export default SavedAccount
