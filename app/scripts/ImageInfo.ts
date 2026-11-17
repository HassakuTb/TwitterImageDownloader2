import moment, { Moment } from 'moment'
import { TagUserId, TagTweetId, TagImageIndex, TagOriginal, TagExtension, TagUserName } from "./Setting";
import { TagYear, TagMonth, TagDay, TagHour, TagMin, TagSec } from "./Setting";
import { TagPostYear, TagPostMonth, TagPostDay, TagPostHour, TagPostMin, TagPostSec } from "./Setting";

import { Extension, originalUrl } from "./Twimg";
export { Extension, parseTwimgUrl, guessExtension, originalUrl } from "./Twimg";

/**
 * Result of resolving the right-clicked image in the content script.
 * Sent to the background as plain JSON (no Date / class instances).
 */
export interface ResolvedMedia {
	/** pbs.twimg.com/media/<mediaId> */
	readonly mediaId: string;
	/** "format" shown in the page's src (jpg / png / webp). Used only when probing fails. */
	readonly srcFormat?: string;
	readonly userId?: string;
	readonly tweetId?: string;
	/** 0-based (photo/N - 1) */
	readonly imageIndex?: number;
	readonly displayName?: string;
	/** epoch milliseconds */
	readonly postTime?: number;
}

/**
 * Emoji sequences (ZWJ / skin tone / variation selector / tags), flags and keycaps.
 * Based on \p{Emoji} (not Extended_Pictographic, which also covers symbols such as ♡ ♪ ★
 * that are shown as text). ASCII and (c) (r) TM are kept unless they carry an emoji
 * variation selector / keycap.
 */
const emojiPatterns: RegExp[] = [
	/[0-9#*]️?⃣/gu,
	/[©®™]️/gu,
	/(?![\u0000-\u007F©®™])\p{Emoji}(?:️|\p{Emoji_Modifier})?(?:‍(?![\u0000-\u007F])\p{Emoji}(?:️|\p{Emoji_Modifier})?)*[\u{E0020}-\u{E007F}]*/gu,
	/[️⃣]/gu,
];

export function removeEmoji(src: string): string {
	return emojiPatterns.reduce((s, re) => s.replace(re, ''), src);
}

function removeUnsupportedChar(src: string): string {
	return src.trim().replace(/[\\\/#:,*?"|]/g, '');
}

/**
 * <username>: emoji removed (same as the old client, which renders emoji as <img>),
 * unsupported chars removed, falls back to user id when nothing is left.
 */
export function sanitizeDisplayName(displayName: string | undefined, userId: string): string {
	if (displayName === undefined) return userId;
	const name = removeUnsupportedChar(removeEmoji(displayName));
	return name.length > 0 ? name : userId;
}

export interface ImageInfo {
	readonly downloadUrl: string;
	readonly filename: string;
}

export class ImageInfoImpl implements ImageInfo {
	private username: string;
	private tweetId: string;
	private imageIndex: number;
	private mediaId: string;
	private extension: Extension;
	private dateTime: Moment;
	private postDate: Date | undefined;
	private userDisplay: string;

	public readonly filename: string;
	public readonly downloadUrl: string;

	constructor(username: string, tweetId: string, imageIndex: number, mediaId: string, extension: Extension, format: string, postDate: Date | undefined, userDisplay: string | undefined) {
		this.username = username;
		this.tweetId = tweetId;
		this.imageIndex = imageIndex;
		this.mediaId = mediaId;
		this.extension = extension;
		this.dateTime = moment();
		this.postDate = postDate;
		this.userDisplay = sanitizeDisplayName(userDisplay, username);

		this.downloadUrl = originalUrl(mediaId, extension);
		console.log(`downloadUrl : ${this.downloadUrl}`);

		this.filename = this.createFileName(format);
	}

	createFileName(format: string): string{
		return buildFilename(format, {
			now: this.dateTime,
			userId: this.username,
			userDisplay: this.userDisplay,
			tweetId: this.tweetId,
			index: this.imageIndex,
			original: this.mediaId,
			extension: this.extension,
			postDate: this.postDate,
		});
	}
}

export interface FilenameFields {
	readonly now: Moment;
	readonly userId: string;
	/** already sanitized (sanitizeDisplayName) */
	readonly userDisplay: string;
	readonly tweetId: string;
	readonly index: number;
	readonly original: string;
	readonly extension: string;
	readonly postDate: Date | undefined;
}

/**
 * Replace the tags of the "download_to" format. Shared by images and videos.
 */
export function buildFilename(format: string, f: FilenameFields): string {
	let filename = format
	filename = filename.replace(TagYear, String(f.now.format('YYYY')));
	filename = filename.replace(TagMonth, String(f.now.format('MM')));
	filename = filename.replace(TagDay, String(f.now.format('DD')));
	filename = filename.replace(TagHour, String(f.now.format('HH')));
	filename = filename.replace(TagMin, String(f.now.format('mm')));
	filename = filename.replace(TagSec, String(f.now.format('ss')));
	filename = filename.replace(TagUserId, f.userId);
	filename = filename.replace(TagUserName, f.userDisplay);
	filename = filename.replace(TagTweetId, f.tweetId);
	filename = filename.replace(TagImageIndex, f.index.toString());
	filename = filename.replace(TagOriginal, f.original)
	filename = filename.replace(TagExtension, f.extension);
	if(f.postDate !== undefined){
		filename = filename.replace(TagPostYear, f.postDate.getFullYear().toString());
		filename = filename.replace(TagPostMonth, (f.postDate.getMonth() + 1).toString().padStart(2, '0'));
		filename = filename.replace(TagPostDay, f.postDate.getDate().toString().padStart(2, '0'));
		filename = filename.replace(TagPostHour, f.postDate.getHours().toString().padStart(2, '0'));
		filename = filename.replace(TagPostMin, f.postDate.getMinutes().toString().padStart(2, '0'));
		filename = filename.replace(TagPostSec, f.postDate.getSeconds().toString().padStart(2, '0'));
	}
	else{
		filename = filename.replace(TagPostYear, '');
		filename = filename.replace(TagPostMonth, '');
		filename = filename.replace(TagPostDay, '');
		filename = filename.replace(TagPostHour, '');
		filename = filename.replace(TagPostMin, '');
		filename = filename.replace(TagPostSec, '');
	}
	return filename;
}

/**
 * video / GIF (beta): the mp4 url comes from X's data; <original> is the mp4 file name, <ext> is "mp4"
 */
export class VideoInfo implements ImageInfo {
	public readonly downloadUrl: string;
	public readonly filename: string;

	constructor(url: string, original: string, format: string, place: { userId?: string, tweetId?: string, index?: number, displayName?: string, postTime?: number }) {
		this.downloadUrl = url;
		console.log(`downloadUrl : ${this.downloadUrl}`);

		if (place.userId === undefined || place.tweetId === undefined) {
			this.filename = `TID-unknown-${original}.mp4`;
			return;
		}
		this.filename = buildFilename(format, {
			now: moment(),
			userId: place.userId,
			userDisplay: sanitizeDisplayName(place.displayName, place.userId),
			tweetId: place.tweetId,
			index: place.index !== undefined ? place.index : 0,
			original,
			extension: 'mp4',
			postDate: place.postTime !== undefined ? new Date(place.postTime) : undefined,
		});
	}
}

/**
 * error case
 */
export class ImageInfoUnresolve implements ImageInfo {
	public readonly downloadUrl: string;
	public readonly filename: string;

	constructor(mediaId: string, extension: Extension) {
		this.downloadUrl = originalUrl(mediaId, extension);
		console.log("downloadUrl : " + this.downloadUrl);

		this.filename = `TID-unknown-${mediaId}.${extension}`;
	}
}
