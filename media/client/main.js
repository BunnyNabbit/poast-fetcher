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
		/** @param {AppBskyFeedDefs.FeedViewPost | import("@atproto/api/dist/client/types/app/bsky/embed/record").View} viewPost */
		static generatePostCard(viewPost, isQuoted = false) {
			console.log(viewPost)
			let post
			let record
			if (viewPost.$type == "app.bsky.embed.record#view") {
				post = viewPost.record
				record = viewPost.record.value
			} else if (viewPost.$type == "app.bsky.embed.record#viewRecord") {
				post = viewPost
				record = viewPost.value
			} else {
				post = viewPost.post
				record = viewPost.post.record
			}
			const postElement = document.createElement("div")
			postElement.className = "post"
			const authorContainer = document.createElement("div")
			authorContainer.className = "authorContainer"
			postElement.appendChild(authorContainer)
			const avatarElement = document.createElement("img")
			avatarElement.src = post.author.avatar ?? ""
			avatarElement.className = "avatar"
			authorContainer.appendChild(avatarElement)
			const displayNameElement = document.createElement("strong")
			displayNameElement.innerText = `${post.author.displayName ?? post.author.handle}`
			authorContainer.appendChild(displayNameElement)
			const handleElement = document.createElement("span")
			handleElement.innerText = `@${post.author.handle}`
			handleElement.className = "soft"
			if (post.author.pronouns) {
				const pronounsElement = document.createElement("span")
				pronounsElement.innerText = ` (${post.author.pronouns})`
				pronounsElement.className = "pronouns soft"
				handleElement.appendChild(pronounsElement)
			}
			authorContainer.appendChild(handleElement)
			const textContentElement = document.createElement("p")
			textContentElement.innerText = `${record?.text}`
			postElement.appendChild(textContentElement)
			if (post.embed) {
				const embedElement = PostGenerator.generatePostEmbed(post.embed, isQuoted)
				if (embedElement) postElement.appendChild(embedElement)
			} else if (post.embeds) {
				for (const embed of post.embeds) {
					const embedElement = PostGenerator.generatePostEmbed(embed, isQuoted)
					if (embedElement) postElement.appendChild(embedElement)
				}
			}
			return postElement
		}
		/**@todo Use ATProto package validation?
		 * @param {import("@atproto/api").$Typed<import("@atproto/api/dist/client/types/app/bsky/embed/images").View> | import("@atproto/api").$Typed<import("@atproto/api/dist/client/types/app/bsky/embed/video").View> | import("@atproto/api").$Typed<import("@atproto/api/dist/client/types/app/bsky/embed/external").View> | import("@atproto/api").$Typed<import("@atproto/api/dist/client/types/app/bsky/embed/record").View> | import("@atproto/api").$Typed<import("@atproto/api/dist/client/types/app/bsky/embed/recordWithMedia").View> | { $type: string?; }} embed - wtf
		 */
		static generatePostEmbed(embed, isQuoted = false) {
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
				const quotedPostElement = PostGenerator.generatePostCard(recordWithMediaView.record.record, true)
				const divElement = document.createElement("div")
				if (recordWithMediaView.media.$type == "app.bsky.embed.images#view") {
					const imagesContainer = handleImageView(recordWithMediaView.media)
					if (imagesContainer) divElement.appendChild(imagesContainer)
				}
				quotedPostElement.className += " quotedPost"
				divElement.appendChild(quotedPostElement)
				return divElement
			}
			if (embed.$type == "app.bsky.embed.record#view") {
				/** @type {import("@atproto/api/dist/client/types/app/bsky/embed/record").View} */
				// @ts-ignore
				const recordView = embed
				if (recordView.record) {
					const quotedPostElement = PostGenerator.generatePostCard(recordView, true)
					quotedPostElement.className += " quotedPost"
					return quotedPostElement
				}
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
