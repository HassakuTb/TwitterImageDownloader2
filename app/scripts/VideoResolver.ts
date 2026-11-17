/**
 * Resolve the right-clicked video / GIF (video download, beta). Runs in the content script.
 *
 *  1. keys of the video from the page: poster urls (img src / video poster), GIF <video src>, info.srcUrl
 *  2. ask the page-world script (PageWorld.ts) for its media in X's data (PageProtocol.ts)
 *  3. user id / tweet id / index from the media's expanded_url (".../status/<id>/video/<n>"),
 *     or from the tweet's permalink in the article and the position of the media cell
 *
 * No dependency on chrome api.
 */
import { FindVideoRequest, FindVideoResponse, exchange, findVideoEvent, newRequestId, videoFoundEvent } from "./PageProtocol";
import { VideoKeys, VideoMedia, bestMp4, gifKeyOf, isVideoOnlyPoster, mp4NameOf, numericIdOf, parseMediaPath, posterKeyOf } from "./VideoMedia";
import { resolveDisplayName, snowflakeToTime } from "./ResolveCore";

const maxClimb: number = 12;
const mediaCellSelector: string = '[data-testid=tweetPhoto]';
const tweetPathPattern: RegExp = /^\/([^\/]+)\/status\/(\d+)\/?$/;
/** marks of a video cell (old client: before / while playing) */
const videoMarkSelector: string = 'video, [data-testid=playButton], [data-testid=videoPlayer], [data-testid=previewInterstitial]';
/** an ancestor holding these is outside the media area (the tweet itself) */
const outsideMediaSelector: string = 'time, [data-testid=tweetText], [data-testid=User-Name]';

/** Result sent to the background (plain JSON) */
export interface ResolvedVideo {
	/** https://video.twimg.com/....mp4 (highest bitrate) */
	readonly url: string;
	/** "video" | "animated_gif" */
	readonly mediaType: string;
	/** file name of the mp4 without ".mp4" (<original>) */
	readonly original: string;
	readonly userId?: string;
	readonly tweetId?: string;
	/** 0-based position in the tweet (counts photos and videos) */
	readonly index?: number;
	readonly displayName?: string;
	/** epoch milliseconds */
	readonly postTime?: number;
}

export interface VideoResolveFailure {
	/** shown to the user */
	readonly error: string;
}

export const messageNotVideo: string = 'This is not a video or GIF.';
export const messageNotReady: string = 'Video download is not ready in this tab. Reload the page and try again.';
export const messageNotFound: string = 'Could not find the video data. Open the post and try again.';
export const messageNoMp4: string = 'This video has no mp4 to download.';

interface PageKeys {
	readonly keys: VideoKeys;
	/** the element that shows the video (media cell or closest container) */
	readonly cell?: Element;
}

function addUnique(list: string[], value: string | undefined): void {
	if (value !== undefined && value.length > 0 && list.indexOf(value) < 0) list.push(value);
}

function keysOfElements(elements: Element[]): VideoKeys {
	const posterKeys: string[] = [];
	const numericIds: string[] = [];
	const mp4Urls: string[] = [];
	elements.forEach(e => {
		const urls: string[] = [];
		if (e.tagName === 'IMG') urls.push((e as HTMLImageElement).src);
		if (e.tagName === 'VIDEO') {
			urls.push(e.getAttribute('poster') || '');
			const src = (e as HTMLVideoElement).currentSrc || e.getAttribute('src') || '';
			if (mp4NameOf(src) !== undefined) mp4Urls.push(src);
			addUnique(posterKeys, gifKeyOf(src));
		}
		urls.forEach(url => {
			addUnique(posterKeys, posterKeyOf(url));
			addUnique(numericIds, numericIdOf(url));
		});
	});
	return { posterKeys, numericIds, mp4Urls };
}

function mediaElementsIn(element: Element): Element[] {
	const list: Element[] = [];
	if (element.tagName === 'IMG' || element.tagName === 'VIDEO') list.push(element);
	Array.from(element.querySelectorAll('video, img[src^="https://pbs.twimg.com/"]')).forEach(e => list.push(e));
	return list.filter(e => e.tagName === 'VIDEO' || posterKeyOf((e as HTMLImageElement).src) !== undefined);
}

/**
 * Climb from the right-clicked element until an ancestor shows exactly one media (one poster key).
 */
export function findVideoKeys(target: Element | undefined, srcUrl: string | undefined): PageKeys {
	const hinted: VideoKeys = keysOfElements([]);
	if (srcUrl !== undefined) {
		addUnique(hinted.posterKeys, posterKeyOf(srcUrl));
		addUnique(hinted.numericIds, numericIdOf(srcUrl));
		addUnique(hinted.posterKeys, gifKeyOf(srcUrl));
		if (mp4NameOf(srcUrl) !== undefined) hinted.mp4Urls.push(srcUrl);
	}

	let element: Element | null = target !== undefined ? target : null;
	for (let i = 0; element !== null && i < maxClimb; i++) {
		if (element.querySelector(outsideMediaSelector) !== null) break;
		const keys = keysOfElements(mediaElementsIn(element));
		if (keys.posterKeys.length > 1) break;   // several media: climbed too far
		if (keys.posterKeys.length === 1 || keys.mp4Urls.length > 0) {
			// the recorded target must agree with what the browser reports
			if (hinted.posterKeys.length > 0 && hinted.posterKeys.indexOf(keys.posterKeys[0]) < 0) break;
			hinted.numericIds.forEach(x => addUnique(keys.numericIds, x));
			return { keys, cell: element };
		}
		if (element.tagName === 'ARTICLE') break;
		element = element.parentElement;
	}
	return { keys: hinted, cell: undefined };
}

/**
 * The cell shows a video or GIF (not a photo), judged from the page only.
 */
export function looksLikeVideo(cell: Element | undefined, keys: VideoKeys): boolean {
	if (keys.numericIds.length > 0 || keys.mp4Urls.length > 0) return true;
	if (cell === undefined) return false;
	if (cell.tagName === 'IMG' && isVideoOnlyPoster((cell as HTMLImageElement).src)) return true;
	if (cell.closest('[data-testid=videoPlayer], [data-testid=previewInterstitial]') !== null) return true;
	let element: Element | null = cell;
	for (let i = 0; element !== null && i < 5; i++, element = element.parentElement) {
		if (element.querySelector(videoMarkSelector) !== null) return true;
		if (element.matches(mediaCellSelector) || element.tagName === 'ARTICLE') break;
	}
	return false;
}

function hasKeys(keys: VideoKeys): boolean {
	return keys.posterKeys.length > 0 || keys.numericIds.length > 0 || keys.mp4Urls.length > 0;
}

/**
 * Ask the page-world script. null: it answered "not found"; undefined: no answer (not installed).
 */
export function askPageWorld(doc: Document, target: Element | undefined, keys: VideoKeys): VideoMedia | null | undefined {
	const request: FindVideoRequest = { requestId: newRequestId(), keys };
	const response = exchange<FindVideoRequest, FindVideoResponse>(doc, target, findVideoEvent, videoFoundEvent, request);
	if (response === undefined) return undefined;
	console.log(`TIL video found by the page world: ${response.source}`);
	return response.media;
}

/** the tweet's permalink (the link with <time>) in the article */
export function tweetOfArticle(article: Element, baseUrl: string): { userId: string, tweetId: string } | undefined {
	const links = Array.from(article.querySelectorAll<HTMLAnchorElement>('a[href*="/status/"]'))
		.filter(a => a.closest('article') === article);
	const withTime = links.filter(a => a.querySelector('time') !== null);
	for (const a of withTime.concat(links)) {
		try {
			const m = tweetPathPattern.exec(new URL(a.getAttribute('href') || '', baseUrl).pathname);
			if (m !== null) return { userId: m[1], tweetId: m[2] };
		}
		catch (e) { /* next */ }
	}
	return undefined;
}

/** position of the media cell among the cells of the article (photos and videos) */
function cellIndex(cell: Element): number | undefined {
	const own = cell.closest(mediaCellSelector) || cell;
	const article = own.closest('article');
	if (article === null) return undefined;
	const cells = Array.from(article.querySelectorAll(mediaCellSelector)).filter(c => c.closest('article') === article);
	const index = cells.indexOf(own);
	return index >= 0 ? index : undefined;
}

export interface VideoPlace {
	readonly userId?: string;
	readonly tweetId?: string;
	readonly index?: number;
	readonly displayName?: string;
	readonly postTime?: number;
}

/**
 * Where the media is: from expanded_url of the data, otherwise from the article around the cell.
 */
export function placeOfMedia(doc: Document, pageUrl: string, media: VideoMedia | undefined, cell: Element | undefined): VideoPlace {
	const fromData = media !== undefined && media.expandedUrl !== undefined ? parseMediaPath(media.expandedUrl) : undefined;
	const article = cell !== undefined ? cell.closest('article') : null;

	let userId: string | undefined = fromData !== undefined ? fromData.userId : undefined;
	let tweetId: string | undefined = fromData !== undefined ? fromData.tweetId : undefined;
	let index: number | undefined = fromData !== undefined ? fromData.index : undefined;
	if (tweetId === undefined && article !== null) {
		const tweet = tweetOfArticle(article, pageUrl);
		if (tweet !== undefined) {
			userId = tweet.userId;
			tweetId = tweet.tweetId;
			index = cell !== undefined ? cellIndex(cell) : undefined;
		}
	}
	if (userId === undefined || tweetId === undefined) return {};

	return {
		userId,
		tweetId,
		index: index !== undefined ? index : 0,
		displayName: resolveDisplayName(doc, { userId, tweetId, imageIndex: index !== undefined ? index : 0 }, pageUrl, article),
		postTime: snowflakeToTime(tweetId),
	};
}

/**
 * GIF on x-web (and while playing on the old client): the mp4 is already the <video src>.
 */
function mediaFromPage(keys: VideoKeys): VideoMedia | undefined {
	const url = keys.mp4Urls.filter(u => gifKeyOf(u) !== undefined)[0];
	if (url === undefined) return undefined;
	return { type: 'animated_gif', posterKey: gifKeyOf(url), variants: [{ url, contentType: 'video/mp4', bitrate: 0 }] };
}

export function resolveVideo(target: Element | undefined, doc: Document, pageUrl: string, srcUrl: string | undefined): ResolvedVideo | VideoResolveFailure {
	const { keys, cell } = findVideoKeys(target, srcUrl);
	console.log('TIL video keys: ', keys);
	if (!hasKeys(keys)) return { error: messageNotVideo };

	const answer = askPageWorld(doc, cell !== undefined ? cell : target, keys);
	let media: VideoMedia | undefined = answer !== null && answer !== undefined ? answer : undefined;
	if (media === undefined) media = mediaFromPage(keys);
	if (media === undefined) {
		if (answer === undefined) return { error: messageNotReady };
		// a photo has a /media/ key too
		return { error: looksLikeVideo(cell, keys) ? messageNotFound : messageNotVideo };
	}

	const mp4 = bestMp4(media);
	const original = mp4 !== undefined ? mp4NameOf(mp4.url) : undefined;
	if (mp4 === undefined || original === undefined) return { error: messageNoMp4 };

	const place = placeOfMedia(doc, pageUrl, media, cell);
	return {
		url: mp4.url,
		mediaType: media.type,
		original,
		...place,
	};
}

/**
 * "Download Original Image" on a video poster (beta, decision 6-3): where the video is, so that the poster
 * is named like the video instead of TID-unknown. undefined when the image is not a video poster.
 */
export function resolvePosterPlace(target: Element | undefined, doc: Document, pageUrl: string, srcUrl: string | undefined): VideoPlace | undefined {
	const { keys, cell } = findVideoKeys(target, srcUrl);
	if (!hasKeys(keys)) return undefined;
	const answer = askPageWorld(doc, cell !== undefined ? cell : target, keys);
	const media = answer !== null && answer !== undefined ? answer : undefined;
	if (media === undefined && !looksLikeVideo(cell, keys)) return undefined;
	const place = placeOfMedia(doc, pageUrl, media, cell);
	return place.tweetId !== undefined ? place : undefined;
}

export function isVideoResolveFailure(x: ResolvedVideo | VideoResolveFailure): x is VideoResolveFailure {
	return (x as VideoResolveFailure).error !== undefined;
}
