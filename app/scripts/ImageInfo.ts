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
		let filename = format
		filename = filename.replace(TagYear, String(this.dateTime.format('YYYY')));
		filename = filename.replace(TagMonth, String(this.dateTime.format('MM')));
		filename = filename.replace(TagDay, String(this.dateTime.format('DD')));
		filename = filename.replace(TagHour, String(this.dateTime.format('HH')));
		filename = filename.replace(TagMin, String(this.dateTime.format('mm')));
		filename = filename.replace(TagSec, String(this.dateTime.format('ss')));
		filename = filename.replace(TagUserId, this.username);
		filename = filename.replace(TagUserName, this.userDisplay);
		filename = filename.replace(TagTweetId, this.tweetId);
		filename = filename.replace(TagImageIndex, this.imageIndex.toString());
		filename = filename.replace(TagOriginal, this.mediaId)
		filename = filename.replace(TagExtension, this.extension);
		if(this.postDate !== undefined){
			filename = filename.replace(TagPostYear, this.postDate.getFullYear().toString());
			filename = filename.replace(TagPostMonth, (this.postDate.getMonth() + 1).toString().padStart(2, '0'));
			filename = filename.replace(TagPostDay, this.postDate.getDate().toString().padStart(2, '0'));
			filename = filename.replace(TagPostHour, this.postDate.getHours().toString().padStart(2, '0'));
			filename = filename.replace(TagPostMin, this.postDate.getMinutes().toString().padStart(2, '0'));
			filename = filename.replace(TagPostSec, this.postDate.getSeconds().toString().padStart(2, '0'));
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
