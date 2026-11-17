/**
 * All media of a tweet (download all media in a post, beta), from X's tweet data.
 *
 * A tweet's data has the media in order (knowledges/x-client/tweet-data.md):
 *   GraphQL "legacy":       { id_str: "<tweet id>", extended_entities: { media: [ ... ] }, ... }
 *   React props "tweet":    { id_str, user: { screen_name, name }, extended_entities: { media: [ ... ] }, ... }
 * Each media: { type: "photo" | "video" | "animated_gif", media_url_https: "https://pbs.twimg.com/media/<key>.jpg",
 *               video_info?: { variants: [...] } }
 *
 * The tweet is identified by its own id (id_str), not by expanded_url of the media
 * (a tweet that reuses another tweet's media points to the other tweet).
 *
 * No dependency on chrome api; shared by the page-world script and the content script.
 */
import { VideoMedia, posterKeyOf, toVideoMedia } from "./VideoMedia";
import { decodedLiteralsWith, objectsWithKeyInJsonText } from "./JsonScan";

export interface TweetMediaItem {
	/** "photo" | "video" | "animated_gif" */
	readonly type: string;
	/** pbs.twimg.com/media/<key> (photo) or the poster key (video / GIF) */
	readonly key?: string;
	/** extension of media_url_https ("jpg" / "png"); the original format for photos */
	readonly extension?: string;
	/** video / GIF only */
	readonly video?: VideoMedia;
}

export interface TweetMediaList {
	readonly tweetId: string;
	/** screen name (React props only) */
	readonly userId?: string;
	/** display name (React props only) */
	readonly displayName?: string;
	/** in the order of the tweet (index = position, counts photos and videos) */
	readonly media: TweetMediaItem[];
}

const extensionPattern: RegExp = /\.([A-Za-z0-9]+)(?:[?#:]|$)/;

function extensionOf(url: string): string | undefined {
	const path = url.split(/[?#]/)[0];
	const file = path.slice(path.lastIndexOf('/') + 1);
	const m = extensionPattern.exec(file);
	return m !== null ? m[1].toLowerCase() : undefined;
}

export function toTweetMediaItem(o: any): TweetMediaItem | undefined {
	if (o === null || typeof o !== 'object') return undefined;
	const type = typeof o.type === 'string' ? o.type : undefined;
	const mediaUrl = typeof o.media_url_https === 'string' ? o.media_url_https : undefined;
	if (type === undefined || mediaUrl === undefined) return undefined;
	const video = type !== 'photo' ? toVideoMedia(o) : undefined;
	return {
		type,
		key: posterKeyOf(mediaUrl),
		extension: extensionOf(mediaUrl),
		video,
	};
}

const tweetIdPattern: RegExp = /^\d+$/;

function objectOrUndefined(o: any): any {
	return o !== null && typeof o === 'object' ? o : undefined;
}

function stringOrUndefined(s: any): string | undefined {
	return typeof s === 'string' ? s : undefined;
}

function toList(tweetId: string, list: any[], userId: string | undefined, displayName: string | undefined): TweetMediaList | undefined {
	const media: TweetMediaItem[] = [];
	for (const m of list) {
		const item = toTweetMediaItem(m);
		if (item === undefined) return undefined;   // keep the positions right or give up
		media.push(item);
	}
	return { tweetId, userId, displayName, media };
}

/**
 * A tweet object with its media:
 *  - GraphQL "legacy" of the old client and React props "tweet":
 *      { id_str, extended_entities: { media }, user?: { screen_name, name } }
 *    A tweet without media has no extended_entities; it is returned with an empty list only when
 *    `allowEmpty` (React props, where the object is known to be the tweet).
 *  - x-web (2026-11 SSR): { __typename: "Tweet", rest_id, media_entities2: [ ... ] (empty without media),
 *      core: { user_results: { result: { core: { screen_name, name } } } } }
 */
export function toTweetMediaList(o: any, allowEmpty?: boolean): TweetMediaList | undefined {
	if (o === null || typeof o !== 'object') return undefined;

	if (Array.isArray(o.media_entities2) && typeof o.rest_id === 'string' && tweetIdPattern.test(o.rest_id)) {
		const core = objectOrUndefined(objectOrUndefined(objectOrUndefined(objectOrUndefined(o.core)?.user_results)?.result)?.core);
		return toList(o.rest_id, o.media_entities2, stringOrUndefined(core?.screen_name), stringOrUndefined(core?.name));
	}

	if (typeof o.id_str !== 'string' || !tweetIdPattern.test(o.id_str)) return undefined;
	const entities = objectOrUndefined(o.extended_entities);
	const list = entities !== undefined && Array.isArray(entities.media) ? entities.media : undefined;
	if (list === undefined && allowEmpty !== true) return undefined;
	const user = objectOrUndefined(o.user);
	return toList(o.id_str, list || [], stringOrUndefined(user?.screen_name), stringOrUndefined(user?.name));
}

/**
 * Tweets in JSON text (GraphQL responses). Retweets / quotes hold the other tweet inside;
 * both are returned. x-web tweets without media are returned with an empty list.
 */
export function tweetMediaInJsonText(text: string): TweetMediaList[] {
	const found: TweetMediaList[] = [];
	['extended_entities', 'media_entities2'].forEach(key => {
		objectsWithKeyInJsonText(text, key).forEach(o => {
			const tweet = toTweetMediaList(o);
			if (tweet !== undefined) found.push(tweet);
		});
	});
	return found;
}

/** the text may hold tweets with media (cheap test before scanning) */
export function mayHoldTweetMedia(text: string): boolean {
	return text.indexOf('extended_entities') >= 0 || text.indexOf('media_entities2') >= 0;
}

/**
 * Tweets in an inline <script> of x-web (the GraphQL responses are JSON in string literals).
 */
export function tweetMediaInScriptText(script: string): TweetMediaList[] {
	const found: TweetMediaList[] = [];
	if (!mayHoldTweetMedia(script)) return found;
	const literals: string[] = [];
	['extended_entities', 'media_entities2'].forEach(word => {
		decodedLiteralsWith(script, word).forEach(d => {
			if (literals.indexOf(d) < 0) literals.push(d);
		});
	});
	literals.forEach(decoded => {
		tweetMediaInJsonText(decoded).forEach(x => found.push(x));
	});
	return found;
}

/** the item is a video or GIF (anything but a photo) */
export function isVideoItem(item: TweetMediaItem): boolean {
	return item.type !== 'photo';
}
