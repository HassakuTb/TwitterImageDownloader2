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
