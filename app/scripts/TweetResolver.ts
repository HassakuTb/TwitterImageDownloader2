/**
 * Download all media in a post (beta): resolve the post that was right-clicked (its text or blank area)
 * and list its media. Runs in the content script.
 *
 *  1. the post from the page: the permalink in the article, a quoted post in it, or the page url (lightbox)
 *  2. ask the page-world script (PageWorld.ts) for the post's media in X's data (PageProtocol.ts)
 *  3. list the photos / videos / GIFs in the order of the post (index = position, counts photos and videos)
 *
 * No dependency on chrome api.
 */
import { FindTweetRequest, FindTweetResponse, exchange, findTweetEvent, newRequestId, tweetFoundEvent } from "./PageProtocol";
import { TweetMediaList, isVideoItem } from "./TweetMedia";
import { bestMp4, mp4NameOf } from "./VideoMedia";
import { parsePhotoPath, resolveDisplayName, snowflakeToTime } from "./ResolveCore";
import { messageNoMp4, messageNotReady, tweetOfArticle } from "./VideoResolver";

const knownHosts: string[] = ['twitter.com', 'pro.twitter.com', 'x.com', 'pro.x.com'];
/** "/<user>/status/<id>" with an optional "/photo/<n>" or "/video/<n>" */
const statusPathPattern: RegExp = /^\/([^\/]+)\/status\/(\d+)(?:\/(?:photo|video)\/\d+)?\/?$/;
const modalSelector: string = '[aria-modal="true"], [role="dialog"]';
/** old client: a quoted post is a clickable block in the article (knowledges/x-client/responsive-web-dom.md) */
const quotedBlockSelector: string = 'div[role=link]';
const userNameSelector: string = '[data-testid=User-Name]';

export const messageNotPost: string = 'Right-click the text or a blank area of a post to download all of its media.';
export const messageNoMedia: string = 'This post has no media to download.';
export const messageNoPhotos: string = 'This post has no photos to download (videos are excluded in the options).';
export const messagePostNotFound: string = 'Could not find the media data of this post. Reload the page and try again.';

export interface BulkPhoto {
	readonly kind: 'photo';
	/** 0-based position in the post */
	readonly index: number;
	/** pbs.twimg.com/media/<mediaId> */
	readonly mediaId: string;
	/** "jpg" / "png" from X's data; probed by the background when missing */
	readonly extension?: string;
}

export interface BulkVideo {
	readonly kind: 'video';
	readonly index: number;
	/** https://video.twimg.com/....mp4 (highest bitrate) */
	readonly url: string;
	/** file name of the mp4 without ".mp4" (<original>) */
	readonly original: string;
	readonly mediaType: string;
}

export interface BulkFailed {
	readonly kind: 'failed';
	readonly index: number;
	/** shown to the user */
	readonly reason: string;
}

export type BulkItem = BulkPhoto | BulkVideo | BulkFailed;

/** Result sent to the background (plain JSON) */
export interface ResolvedPost {
	readonly userId: string;
	readonly tweetId: string;
	readonly displayName?: string;
	/** epoch milliseconds */
	readonly postTime?: number;
	readonly items: BulkItem[];
}

export interface PostResolveFailure {
	/** shown to the user */
	readonly error: string;
}

export function isPostResolveFailure(x: ResolvedPost | PostResolveFailure): x is PostResolveFailure {
	return (x as PostResolveFailure).error !== undefined;
}

export interface PostPlace {
	/** the post id, when the page shows it */
	readonly tweetId?: string;
	readonly userId?: string;
	/** a quoted post whose id the page does not show: the quoting post's id */
	readonly excludeId?: string;
	/** the article of the post (for the display name) */
	readonly article?: Element;
}

/** "/<user>/status/<id>[/photo|video/<n>]" of the page url */
function postOfUrl(pageUrl: string): { userId: string, tweetId: string } | undefined {
	try {
		const url = new URL(pageUrl);
		if (knownHosts.indexOf(url.host) < 0) return undefined;
		const m = statusPathPattern.exec(url.pathname);
		return m !== null ? { userId: m[1], tweetId: m[2] } : undefined;
	}
	catch (e) {
		return undefined;
	}
}

/** the post of the photo links directly in `root` (not in a nested article) */
function postOfPhotoLinks(root: Element, article: Element, pageUrl: string): { userId: string, tweetId: string } | undefined {
	const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href*="/photo/"]')).filter(a => a.closest('article') === article);
	for (const a of links) {
		const photo = parsePhotoPath(a.getAttribute('href') || '', pageUrl);
		if (photo !== undefined) return { userId: photo.userId, tweetId: photo.tweetId };
	}
	return undefined;
}

/** old client: the quoted post block holding the target (a clickable block with its own user name) */
function quotedBlockOf(target: Element, article: Element): Element | undefined {
	for (let e: Element | null = target.closest(quotedBlockSelector); e !== null && e !== article; e = e.parentElement === null ? null : e.parentElement.closest(quotedBlockSelector)) {
		if (e.closest('article') !== article) break;
		if (e.querySelector(userNameSelector) !== null) return e;
	}
	return undefined;
}

/**
 * The post that holds the right-clicked element. undefined when it is not in a post.
 *  - lightbox (modal on a ".../status/<id>/photo/<n>" page): the page url
 *  - article: the permalink (the link with <time>)
 *    - quoted post of the old client (a block in the article): its photo links, or "not the quoting post"
 *    - quoted post of x-web (a nested article): its own permalink / photo links
 */
export function findPostPlace(target: Element, pageUrl: string): PostPlace | undefined {
	const article = target.closest('article');
	if (article === null) {
		if (target.closest(modalSelector) === null) return undefined;
		const post = postOfUrl(pageUrl);
		return post !== undefined ? { tweetId: post.tweetId, userId: post.userId } : undefined;
	}

	const quoted = quotedBlockOf(target, article);
	if (quoted !== undefined) {
		const post = postOfPhotoLinks(quoted, article, pageUrl);
		if (post !== undefined) return { tweetId: post.tweetId, userId: post.userId, article };
		const quoting = tweetOfArticle(article, pageUrl);
		return quoting !== undefined ? { excludeId: quoting.tweetId, article } : undefined;
	}

	const own = tweetOfArticle(article, pageUrl) || postOfPhotoLinks(article, article, pageUrl);
	if (own !== undefined) return { tweetId: own.tweetId, userId: own.userId, article };

	// a nested article (quoted post of x-web) without a permalink
	const outer = article.parentElement !== null ? article.parentElement.closest('article') : null;
	const quoting = outer !== null ? tweetOfArticle(outer, pageUrl) : undefined;
	return quoting !== undefined ? { excludeId: quoting.tweetId, article } : undefined;
}

/** the element is in a post (or in the lightbox of a post); used to show the menu item */
export function isInPost(target: Element, pageUrl: string): boolean {
	if (target.closest('article') !== null) return true;
	return target.closest(modalSelector) !== null && postOfUrl(pageUrl) !== undefined;
}

/**
 * Ask the page-world script. null: it answered "not found"; undefined: no answer (not installed).
 */
export function askPost(doc: Document, target: Element | undefined, place: PostPlace): TweetMediaList | null | undefined {
	const request: FindTweetRequest = { requestId: newRequestId(), tweetId: place.tweetId, excludeId: place.excludeId };
	const response = exchange<FindTweetRequest, FindTweetResponse>(doc, target, findTweetEvent, tweetFoundEvent, request);
	if (response === undefined) return undefined;
	console.log(`TIL post found by the page world: ${response.source}`);
	return response.tweet;
}

export function listItems(post: TweetMediaList, includeVideo: boolean): BulkItem[] {
	const items: BulkItem[] = [];
	post.media.forEach((media, index) => {
		if (isVideoItem(media)) {
			if (!includeVideo) return;
			const mp4 = media.video !== undefined ? bestMp4(media.video) : undefined;
			const original = mp4 !== undefined ? mp4NameOf(mp4.url) : undefined;
			if (mp4 === undefined || original === undefined) {
				items.push({ kind: 'failed', index, reason: messageNoMp4 });
				return;
			}
			items.push({ kind: 'video', index, url: mp4.url, original, mediaType: media.type });
			return;
		}
		if (media.key === undefined) {
			items.push({ kind: 'failed', index, reason: 'This photo has no url.' });
			return;
		}
		const extension = media.extension === 'jpg' || media.extension === 'png' ? media.extension : undefined;
		items.push({ kind: 'photo', index, mediaId: media.key, extension });
	});
	return items;
}

export function resolvePost(target: Element | undefined, doc: Document, pageUrl: string, includeVideo: boolean): ResolvedPost | PostResolveFailure {
	const place = target !== undefined ? findPostPlace(target, pageUrl) : undefined;
	console.log('TIL post place: ', place);
	if (place === undefined) return { error: messageNotPost };

	const answer = askPost(doc, target, place);
	if (answer === undefined) return { error: messageNotReady };
	if (answer === null) return { error: messagePostNotFound };
	if (answer.media.length === 0) return { error: messageNoMedia };

	const userId = place.userId !== undefined && place.tweetId === answer.tweetId ? place.userId : answer.userId;
	if (userId === undefined) return { error: messagePostNotFound };

	const items = listItems(answer, includeVideo);
	if (items.length === 0) return { error: messageNoPhotos };

	const tweetId = answer.tweetId;
	const fromPage = resolveDisplayName(doc, { userId, tweetId, imageIndex: 0 }, pageUrl, place.article !== undefined ? place.article : null);
	return {
		userId,
		tweetId,
		displayName: fromPage !== undefined ? fromPage : answer.displayName,
		postTime: snowflakeToTime(tweetId),
		items,
	};
}
