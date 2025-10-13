// @ts-check
/** @import * from "vscode-webview" */
/** @import { AppBskyFeedDefs } from "@atproto/api" */

;(function () {
	const vscode = acquireVsCodeApi()

	const oldState = vscode.getState() || { colors: [] }

	// vscode.setState({})
	// vscode.postMessage({  })


	/** @param {AppBskyFeedDefs.FeedViewPost} feedViewPost */
	function generatePostCard(feedViewPost) {
		const postElement = document.createElement("div")
		const authorContainer = document.createElement("div")
		authorContainer.className = "authorContainer"
		postElement.appendChild(authorContainer)
		const avatarElement = document.createElement("img")
		avatarElement.src = feedViewPost.post.author.avatar ?? ""
		avatarElement.className = "avatar"
		authorContainer.appendChild(avatarElement)
		const displayNameElement = document.createElement("strong")
		displayNameElement.innerText = `${feedViewPost.post.author.displayName ?? feedViewPost.post.author.handle}`
		authorContainer.appendChild(displayNameElement)
		const handleElement = document.createElement("span")
		handleElement.innerText = `@${feedViewPost.post.author.handle}`
		handleElement.className = "soft"
		if (feedViewPost.post.author.pronouns) {
			const pronounsElement = document.createElement("span")
			pronounsElement.innerText = ` (${feedViewPost.post.author.pronouns})`
			pronounsElement.className = "pronouns soft"
			handleElement.appendChild(pronounsElement)
		}
		authorContainer.appendChild(handleElement)
		const textContentElement = document.createElement("p")
		textContentElement.innerText = `${feedViewPost.post.record?.text}`
		postElement.appendChild(textContentElement)
		return postElement
		// if (feedViewPost.post.record.)
	}

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
				if (feedViewPost.reply) {
					// skip replies for now
					continue
				}
				const postElement = generatePostCard(feedViewPost)
				postsContainer.appendChild(postElement)
			}
		}
	})
})()
