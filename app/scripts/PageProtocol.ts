/**
 * Messages between the content script (isolated world) and the page-world script (MAIN world).
 *
 * DOM events are shared by both worlds and dispatched synchronously, so the content script gets the answer
 * before dispatchEvent returns. The detail is a JSON string because objects do not cross the worlds
 * (Firefox wraps them).
 *
 * The page can see and fake these events. The background checks that the url is a video.twimg.com mp4.
 */
import { VideoKeys, VideoMedia } from "./VideoMedia";
import { TweetMediaList } from "./TweetMedia";

export const findVideoEvent: string = 'twitterImageDL:findVideo';
export const videoFoundEvent: string = 'twitterImageDL:videoFound';
/** attribute put on the right-clicked element while asking, so that the page world can find it */
export const targetAttribute: string = 'data-twitter-image-dl-target';

export interface FindVideoRequest {
	readonly requestId: string;
	readonly keys: VideoKeys;
}

export interface FindVideoResponse {
	readonly requestId: string;
	readonly media: VideoMedia | null;
	/** where it was found: "data" (XHR / fetch / inline script) or "react" (props) */
	readonly source?: string;
}

/** download all media in a post (beta): the media of a tweet */
export const findTweetEvent: string = 'twitterImageDL:findTweet';
export const tweetFoundEvent: string = 'twitterImageDL:tweetFound';

export interface FindTweetRequest {
	readonly requestId: string;
	/** the tweet id, when the page shows it */
	readonly tweetId?: string;
	/** a quoted tweet whose id the page does not show: any tweet but this one (the quoting tweet) */
	readonly excludeId?: string;
}

export interface FindTweetResponse {
	readonly requestId: string;
	readonly tweet: TweetMediaList | null;
	/** "data" or "react" */
	readonly source?: string;
}

let requestCount: number = 0;

export function newRequestId(): string {
	return `r${Date.now().toString(36)}${(requestCount++).toString(36)}`;
}

/**
 * Send a request to the other world and take the answer with the same requestId.
 * The target element is marked with targetAttribute while asking.
 * undefined: no answer (the page-world script is not installed).
 */
export function exchange<Q extends { requestId: string }, R extends { requestId: string }>(
	doc: Document, target: Element | undefined, requestEvent: string, responseEvent: string, request: Q): R | undefined {
	let answer: R | undefined = undefined;
	const listener = (event: Event) => {
		try {
			const response: R = JSON.parse(String((event as CustomEvent).detail));
			if (response.requestId === request.requestId) answer = response;
		}
		catch (e) { /* not ours */ }
	};

	if (target !== undefined) target.setAttribute(targetAttribute, request.requestId);
	doc.addEventListener(responseEvent, listener);
	try {
		doc.dispatchEvent(new CustomEvent(requestEvent, { detail: JSON.stringify(request) }));
	}
	finally {
		doc.removeEventListener(responseEvent, listener);
		if (target !== undefined) target.removeAttribute(targetAttribute);
	}
	return answer;
}
