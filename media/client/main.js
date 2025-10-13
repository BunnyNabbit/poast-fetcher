// @ts-check
/** @import * from "vscode-webview" */
/** @import { AppBskyFeedDefs } from "@atproto/api" */
/** @import { View } from "@atproto/api/src/client/types/app/bsky/embed/images" */

;(function () {
	const vscode = acquireVsCodeApi()

	const oldState = vscode.getState() || { colors: [] }

	// vscode.setState({})
	// vscode.postMessage({  })

	class PostGenerator {
		/** @param {AppBskyFeedDefs.FeedViewPost} feedViewPost */
		static generatePostCard(feedViewPost) {
			const postElement = document.createElement("div")
			postElement.className = "post"
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
				pronounsElement.innerText = `(${feedViewPost.post.author.pronouns})`
				pronounsElement.className = "pronouns soft"
				handleElement.appendChild(pronounsElement)
			}
			authorContainer.appendChild(handleElement)
			const textContentElement = document.createElement("p")
			textContentElement.innerText = `${feedViewPost.post.record?.text}`
			postElement.appendChild(textContentElement)
			if (feedViewPost.post.embed) {
				const embedElement = PostGenerator.generatePostEmbed(feedViewPost.post.embed)
				if (embedElement) postElement.appendChild(embedElement)
			}
			return postElement
		}
		/**@todo Use ATProto package validation?
		 * @param {import("@atproto/api").$Typed<import("@atproto/api/dist/client/types/app/bsky/embed/images").View> | import("@atproto/api").$Typed<import("@atproto/api/dist/client/types/app/bsky/embed/video").View> | import("@atproto/api").$Typed<import("@atproto/api/dist/client/types/app/bsky/embed/external").View> | import("@atproto/api").$Typed<import("@atproto/api/dist/client/types/app/bsky/embed/record").View> | import("@atproto/api").$Typed<import("@atproto/api/dist/client/types/app/bsky/embed/recordWithMedia").View> | { $type: string?; }} embed - wtf
		 */
		static generatePostEmbed(embed) {
			/** @param {View} imageView */
			function handleImageView(imageView) {
				if (typeof embed.$type == null) return
				const imagesContainer = document.createElement("div")
				imagesContainer.className = "imagesThumbnailContainer"
				for (const image of imageView.images) {
					const imageElement = document.createElement("img")
					imageElement.src = image.thumb
					imageElement.className = "postImageThumbnail"
					if (image.alt) imageElement.alt = image.alt
					imagesContainer.appendChild(imageElement)
				}
				return imagesContainer
			}
			// @ts-ignore
			if (embed.$type == "app.bsky.embed.images#view") return handleImageView(embed)
			if (embed.$type == "app.bsky.embed.recordWithMedia#view") {
				/** @type {import("@atproto/api/dist/client/types/app/bsky/embed/recordWithMedia").View} */
				// @ts-ignore
				const recordWithMediaView = embed
				// @ts-ignore
				if (recordWithMediaView.media.$type == "app.bsky.embed.images#view") return handleImageView(recordWithMediaView.media)
			}
		}
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
				const postElement = PostGenerator.generatePostCard(feedViewPost)
				postsContainer.appendChild(postElement)
			}
		}
	})
})()
