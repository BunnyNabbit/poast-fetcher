// @ts-check
/** @import * from "vscode-webview" */
/** @import { AppBskyFeedDefs } from "@atproto/api" */

;(function () {
	const vscode = acquireVsCodeApi()

	const oldState = vscode.getState() || { colors: [] }

	// vscode.setState({})
	// vscode.postMessage({  })

	// Handle messages sent from the extension to the webview
	window.addEventListener("message", (event) => {
		/** @type {{type: string; value: AppBskyFeedDefs.FeedViewPost[]}} */
		const message = event.data
		if (message.type == "addPosts") {
			const posts = message.value
			console.log(posts)
			const postsContainer = document.getElementById("postsContainer")
			if (!postsContainer) return
			postsContainer.innerHTML = ""
			for (const feedViewPost of posts) {
				const postElement = document.createElement("div")
				const textContentElement = document.createElement("p")
				textContentElement.innerText = `${feedViewPost.post.record?.text}`
				postElement.appendChild(textContentElement)
				postsContainer.appendChild(postElement)
			}
		}
	})
})()
