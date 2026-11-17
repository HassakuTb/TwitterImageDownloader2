/**
 * Tweets with their media seen in X's data, looked up by tweet id (download all media in a post, beta).
 * Lives in the page-world script. Bounded: the oldest tweets are dropped first.
 */
import { TweetMediaList } from "./TweetMedia";

const maxTweets: number = 3000;

function merge(a: TweetMediaList, b: TweetMediaList): TweetMediaList {
	const media = b.media.length >= a.media.length ? b.media : a.media;
	return {
		tweetId: b.tweetId,
		userId: b.userId !== undefined ? b.userId : a.userId,
		displayName: b.displayName !== undefined ? b.displayName : a.displayName,
		media,
	};
}

export class TweetTable {
	/** insertion order = age (Map keeps it) */
	private tweets: Map<string, TweetMediaList> = new Map();

	public get size(): number {
		return this.tweets.size;
	}

	public add(tweet: TweetMediaList): void {
		const old = this.tweets.get(tweet.tweetId);
		if (old !== undefined) this.tweets.delete(tweet.tweetId);
		this.tweets.set(tweet.tweetId, old !== undefined ? merge(old, tweet) : tweet);
		while (this.tweets.size > maxTweets) {
			const oldest = this.tweets.keys().next().value as string;
			this.tweets.delete(oldest);
		}
	}

	public find(tweetId: string): TweetMediaList | undefined {
		return this.tweets.get(tweetId);
	}
}
