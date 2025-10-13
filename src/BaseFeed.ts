import { Agent, AppBskyFeedDefs } from "@atproto/api"
import { EventEmitter } from "vscode"

export class FeedResult {
	posts: AppBskyFeedDefs.FeedViewPost[]
	cursor: string | undefined
	/** */
	constructor(posts: AppBskyFeedDefs.FeedViewPost[], cursor: string | undefined) {
		this.posts = posts
		this.cursor = cursor
	}
}

export class BaseFeed {
	cursor: string | undefined
	posts: AppBskyFeedDefs.FeedViewPost[]
	agent: Agent
	feedOptions: any
	addPosts = new EventEmitter<AppBskyFeedDefs.FeedViewPost[]>()
	setPosts = new EventEmitter<AppBskyFeedDefs.FeedViewPost[]>()
	/** */
	constructor(agent: Agent, feedOptions: any) {
		this.cursor = (<typeof BaseFeed>this.constructor).defaultCursor
		this.posts = []
		this.agent = agent
		this.feedOptions = feedOptions
	}
	/** @abstract */
	async getPosts(cursor: string): Promise<FeedResult> {
		throw new Error("Method not implemented.")
	}

	async refresh() {
		this.posts = []
		this.cursor = (<typeof BaseFeed>this.constructor).defaultCursor
		const result = await this.getPosts(this.cursor)
		this.posts = result.posts
		this.cursor = result.cursor
		this.setPosts.fire(this.posts)
		return this.posts
	}

	async checkIfFeedUpdated() {
		if (this.posts.length === 0) return false
		const feedResult = await this.getPosts((<typeof BaseFeed>this.constructor).defaultCursor)
		if (feedResult.posts.length === 0) return false
		if (feedResult.posts[0].post.uri === this.posts[0].post.uri) return false
	}
	/** Get more posts and append to feed. */
	async loadMore() {
		if (this.cursor != null) {
			const feedResult = await this.getPosts(this.cursor)
			this.posts = this.posts.concat(feedResult.posts)
			this.cursor = feedResult.cursor
			this.addPosts.fire(feedResult.posts)
		}
	}

	static defaultCursor = "0"
}

export class TimelineFeed extends BaseFeed {
	/** */
	async getPosts(cursor: string) {
		const response = await this.agent.getTimeline({ cursor, limit: 100 })
		return new FeedResult(response.data.feed, response.data.cursor)
	}

	static defaultCursor = ""
}
