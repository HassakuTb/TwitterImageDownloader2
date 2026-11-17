/**
 * Resolve the right-clicked image of twitter / x.com.
 *
 * Works the same way for the old client (responsive-web) and the new client (x-web):
 *  - user id / tweet id / image index : from the "/<user>/status/<id>/photo/<n>" link
 *      old : <a href=".../photo/n"><... <img></a>      (link is an ancestor of img)
 *      new : <div inert>...<img></div><a href=".../photo/n" class="absolute inset-0"> (overlay sibling)
 *    or from the page url (lightbox)
 *  - post time    : tweet id (snowflake)
 *  - display name : a[href="/<user>"] in the tweet's article -> document.title -> (undefined)
 *
 * No dependency on chrome api / jQuery so it can be injected into a page for testing.
 */
import { parseTwimgUrl } from "./Twimg";
import { ResolvedMedia } from "./ImageInfo";

const knownHosts: string[] = ['twitter.com', 'pro.twitter.com', 'x.com', 'pro.x.com'];
const photoPathPattern: RegExp = /^\/([^\/]+)\/status\/(\d+)\/photo\/(\d+)\/?$/;
const mediaImageSelector: string = 'img[src^="https://pbs.twimg.com/media/"]';
const photoLinkSelector: string = 'a[href*="/photo/"]';
/** climbing ancestors stops at these */
const boundarySelector: string = 'article, [aria-modal="true"], [role="dialog"], main, body';
const modalSelector: string = '[aria-modal="true"], [role="dialog"]';
const maxClimb: number = 8;

const twitterEpoch: number = 1288834974657;
/** ids below this (timestamp part < 1 day) are pre-snowflake sequential ids */
const minSnowflakeShifted: number = 24 * 60 * 60 * 1000;

export interface PhotoPath {
	readonly userId: string;
	readonly tweetId: string;
	/** 0-based */
	readonly imageIndex: number;
}

export interface ResolveHints {
	/** info.srcUrl of chrome.contextMenus (image context) */
	readonly srcUrl?: string;
	/** info.linkUrl of chrome.contextMenus (link context) */
	readonly linkUrl?: string;
}

/**
 * "/<user>/status/<id>/photo/<n>" (relative or absolute, query / hash ignored)
 */
export function parsePhotoPath(href: string, baseUrl: string): PhotoPath | undefined {
	let url: URL;
	try {
		url = new URL(href, baseUrl);
	}
	catch (e) {
		return undefined;
	}
	if (knownHosts.indexOf(url.host) < 0) return undefined;

	const m = photoPathPattern.exec(url.pathname);
	if (m === null) return undefined;
	const n = parseInt(m[3], 10);
	if (!(n >= 1)) return undefined;
	return { userId: m[1], tweetId: m[2], imageIndex: n - 1 };
}

/**
 * tweet id (snowflake) -> epoch ms. undefined for pre-snowflake ids.
 */
export function snowflakeToTime(tweetId: string): number | undefined {
	if (!/^\d+$/.test(tweetId)) return undefined;
	const shifted = Number(BigInt(tweetId) / BigInt(4194304));  // id >> 22
	if (shifted < minSnowflakeShifted) return undefined;
	return shifted + twitterEpoch;
}

function isMediaImage(element: Element): element is HTMLImageElement {
	return element.tagName === 'IMG' && (element.getAttribute('src') || '').lastIndexOf('https://pbs.twimg.com/media/', 0) === 0;
}

function photoLinksIn(root: Element, baseUrl: string): HTMLAnchorElement[] {
	return Array.from(root.querySelectorAll<HTMLAnchorElement>(photoLinkSelector))
		.filter(a => parsePhotoPath(a.getAttribute('href') || '', baseUrl) !== undefined);
}

/**
 * Climb ancestors of `start` until an ancestor holds exactly one media image and at most one photo link
 * (= one media cell). Gives up when an ancestor holds several images / links (ambiguous).
 */
function findMediaCell(start: Element, baseUrl: string): { img?: HTMLImageElement, link?: HTMLAnchorElement } {
	let element: Element | null = start;
	for (let i = 0; element !== null && i < maxClimb; i++) {
		const images = Array.from(element.querySelectorAll<HTMLImageElement>(mediaImageSelector));
		const links = photoLinksIn(element, baseUrl);
		if (images.length > 1 || links.length > 1) break;
		if (images.length === 1 && links.length === 1) return { img: images[0], link: links[0] };
		if (element.matches(boundarySelector)) break;
		element = element.parentElement;
	}
	return {};
}

/**
 * From the right-clicked element, find the media <img> and its "/photo/n" <a>.
 */
export function findImageAndLink(target: Element, baseUrl: string): { img?: HTMLImageElement, link?: HTMLAnchorElement } {
	let img: HTMLImageElement | undefined = isMediaImage(target) ? target : undefined;
	let link: HTMLAnchorElement | undefined = undefined;

	const closestLink = target.closest<HTMLAnchorElement>(photoLinkSelector);
	if (closestLink !== null && parsePhotoPath(closestLink.getAttribute('href') || '', baseUrl) !== undefined) {
		link = closestLink;
	}

	if (link !== undefined && img === undefined) {
		// old client: img inside the link
		const inner = Array.from(link.querySelectorAll<HTMLImageElement>(mediaImageSelector));
		if (inner.length === 1) img = inner[0];
	}

	if (img === undefined || link === undefined) {
		// new client: overlay link is a sibling of the img container
		const cell = findMediaCell(img !== undefined ? img : (link !== undefined ? link : target), baseUrl);
		if (img === undefined && (link === undefined || cell.link === link)) img = cell.img;
		if (link === undefined && (img === undefined || cell.img === img)) link = cell.link;
	}
	return { img, link };
}

function hrefIsUser(anchor: Element, userId: string, baseUrl: string): boolean {
	const href = anchor.getAttribute('href');
	if (href === null) return false;
	try {
		const url = new URL(href, baseUrl);
		return knownHosts.indexOf(url.host) >= 0 && url.pathname.toLowerCase() === `/${userId.toLowerCase()}`;
	}
	catch (e) {
		return false;
	}
}

/** "/<user>/status/<id>" or below it */
function hrefIsTweet(anchor: Element, photo: PhotoPath, baseUrl: string): boolean {
	const href = anchor.getAttribute('href');
	if (href === null) return false;
	try {
		const segments = new URL(href, baseUrl).pathname.split('/');
		return segments[1].toLowerCase() === photo.userId.toLowerCase() && segments[2] === 'status' && segments[3] === photo.tweetId;
	}
	catch (e) {
		return false;
	}
}

/**
 * Display name in an article: the a[href="/<user>"] right before the "@<user>" link,
 * or the first such link whose text does not start with "@".
 * Links inside a nested (quoted) article are ignored.
 */
function displayNameInArticle(article: Element, userId: string, baseUrl: string): string | undefined {
	const links = Array.from(article.querySelectorAll('a[href]'))
		.filter(a => a.closest('article') === article && hrefIsUser(a, userId, baseUrl))
		.map(a => (a.textContent || '').trim());

	const handle = `@${userId.toLowerCase()}`;
	const handleIndex = links.map(t => t.toLowerCase()).indexOf(handle);
	const isName = (t: string) => t.length > 0 && t.charAt(0) !== '@';
	if (handleIndex > 0) {
		for (let i = handleIndex - 1; i >= 0; i--) {
			if (isName(links[i])) return links[i];
		}
	}
	const first = links.filter(isName)[0];
	return first;
}

function escapeRegExp(src: string): string {
	return src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * "NASA（@NASA）さんの画像 / X", "(3) NASA (@NASA) / X" ...
 */
function displayNameInTitle(title: string, userId: string): string | undefined {
	const stripped = title.replace(/^\(\d+\+?\)\s*/, '');
	const m = new RegExp(`^(.+?)\\s*[（(]@${escapeRegExp(userId)}[)）]`, 'i').exec(stripped);
	if (m === null) return undefined;
	const name = m[1].trim();
	return name.length > 0 ? name : undefined;
}

/**
 * Display name: (1) article of the tweet  (2) document.title  (3) undefined (caller uses the user id)
 */
export function resolveDisplayName(doc: Document, photo: PhotoPath, baseUrl: string, nearArticle?: Element | null): string | undefined {
	const articles: Element[] = [];
	if (nearArticle !== undefined && nearArticle !== null) articles.push(nearArticle);
	Array.from(doc.querySelectorAll(`a[href*="/status/${photo.tweetId}"]`)).forEach(a => {
		if (!hrefIsTweet(a, photo, baseUrl)) return;
		const article = a.closest('article');
		if (article !== null && articles.indexOf(article) < 0) articles.push(article);
	});

	for (const article of articles) {
		const name = displayNameInArticle(article, photo.userId, baseUrl);
		if (name !== undefined) return name;
	}
	return displayNameInTitle(doc.title, photo.userId);
}

function findByHints(doc: Document, hints: ResolveHints): Element | undefined {
	if (hints.srcUrl !== undefined) {
		const img = Array.from(doc.querySelectorAll<HTMLImageElement>(mediaImageSelector)).filter(i => i.src === hints.srcUrl)[0];
		if (img !== undefined) return img;
	}
	if (hints.linkUrl !== undefined) {
		const link = Array.from(doc.querySelectorAll<HTMLAnchorElement>(photoLinkSelector)).filter(a => a.href === hints.linkUrl)[0];
		if (link !== undefined) return link;
	}
	return undefined;
}

/**
 * @param target  event.target of the last contextmenu event (may be undefined)
 * @returns undefined when no twitter media image is found
 */
export function resolveMedia(target: Element | undefined, doc: Document, pageUrl: string, hints: ResolveHints): ResolvedMedia | undefined {
	let start: Element | undefined = target;

	// the recorded target must agree with what chrome reports
	const hinted = hints.srcUrl !== undefined ? parseTwimgUrl(hints.srcUrl) : undefined;
	if (start !== undefined && hinted !== undefined) {
		const found = findImageAndLink(start, pageUrl).img;
		const foundMedia = found !== undefined ? parseTwimgUrl(found.src) : undefined;
		if (foundMedia !== undefined && foundMedia.mediaId !== hinted.mediaId) {
			console.warn(`TIL recorded target (${foundMedia.mediaId}) differs from srcUrl (${hinted.mediaId}), use srcUrl`);
			start = undefined;
		}
	}
	if (start === undefined) start = findByHints(doc, hints);
	if (start === undefined && hinted === undefined) return undefined;

	const { img, link } = start !== undefined ? findImageAndLink(start, pageUrl) : { img: undefined, link: undefined };

	const media = img !== undefined ? parseTwimgUrl(img.src) : hinted;
	if (media === undefined) return undefined;

	let photo: PhotoPath | undefined = link !== undefined ? parsePhotoPath(link.getAttribute('href') || '', pageUrl) : undefined;
	if (photo === undefined) {
		// lightbox: image in a modal (or outside any article) on a ".../photo/n" page
		const inLightbox = img === undefined || img.closest(modalSelector) !== null || img.closest('article') === null;
		if (inLightbox) photo = parsePhotoPath(pageUrl, pageUrl);
	}
	if (photo === undefined) {
		return { mediaId: media.mediaId, srcFormat: media.format };
	}

	const nearArticle = link !== undefined ? link.closest('article') : (img !== undefined ? img.closest('article') : null);
	return {
		mediaId: media.mediaId,
		srcFormat: media.format,
		userId: photo.userId,
		tweetId: photo.tweetId,
		imageIndex: photo.imageIndex,
		displayName: resolveDisplayName(doc, photo, pageUrl, nearArticle),
		postTime: snowflakeToTime(photo.tweetId),
	};
}
