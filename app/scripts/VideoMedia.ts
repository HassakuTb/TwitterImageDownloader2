/**
 * Video / GIF media in X's tweet data (GraphQL responses, React props) and how to match it with the page.
 *
 * A media object with video looks like (knowledges/media/video-twimg.md):
 *   { type: "video" | "animated_gif", id_str: "2122404339197030400",
 *     media_url_https: "https://pbs.twimg.com/media/HXRLj6bW0AAxO8n.jpg",           (poster)
 *     expanded_url: "https://x.com/NASA/status/2122404409292337592/video/1",
 *     video_info: { variants: [{ content_type: "video/mp4", bitrate: 10368000, url: "https://video.twimg.com/...mp4" }, ...] } }
 *
 * The poster on the page has the same key as media_url_https:
 *   pbs.twimg.com/media/<key>
 *   pbs.twimg.com/tweet_video_thumb/<key>                  (GIF; the mp4 is video.twimg.com/tweet_video/<key>.mp4)
 *   pbs.twimg.com/amplify_video_thumb/<numeric id>/img/<key>
 *   pbs.twimg.com/ext_tw_video_thumb/<numeric id>/pu/img/<key>
 *
 * No dependency on chrome api; shared by the page-world script and the content script.
 */

export interface VideoVariant {
	readonly url: string;
	readonly contentType: string;
	readonly bitrate?: number;
}

export interface VideoMedia {
	readonly type: string;
	/** numeric media id (id_str) */
	readonly idStr?: string;
	/** key of the poster (media_url_https) */
	readonly posterKey?: string;
	readonly expandedUrl?: string;
	readonly variants: VideoVariant[];
}

const posterPatterns: RegExp[] = [
	/^https:\/\/pbs\.twimg\.com\/media\/([^\/.?#:]+)/,
	/^https:\/\/pbs\.twimg\.com\/tweet_video_thumb\/([^\/.?#:]+)/,
	/^https:\/\/pbs\.twimg\.com\/amplify_video_thumb\/\d+\/img\/([^\/.?#:]+)/,
	/^https:\/\/pbs\.twimg\.com\/ext_tw_video_thumb\/\d+\/pu\/img\/([^\/.?#:]+)/,
];
const numericIdPattern: RegExp = /^https:\/\/pbs\.twimg\.com\/(?:amplify_video_thumb|ext_tw_video_thumb)\/(\d+)\//;
const videoFilePattern: RegExp = /^https:\/\/video\.twimg\.com\/[^?#]*\/([^\/?#]+)\.mp4(?:[?#]|$)/;
const gifVideoPattern: RegExp = /^https:\/\/video\.twimg\.com\/tweet_video\/([^\/?#]+)\.mp4(?:[?#]|$)/;

/** key of a poster url (see the header comment), undefined for other urls */
export function posterKeyOf(url: string): string | undefined {
	for (const pattern of posterPatterns) {
		const m = pattern.exec(url);
		if (m !== null) return m[1];
	}
	return undefined;
}

/** numeric media id in amplify_video_thumb / ext_tw_video_thumb urls */
export function numericIdOf(url: string): string | undefined {
	const m = numericIdPattern.exec(url);
	return m !== null ? m[1] : undefined;
}

/** true for poster urls that are always videos (not /media/, which is also used for photos) */
export function isVideoOnlyPoster(url: string): boolean {
	return posterKeyOf(url) !== undefined && url.lastIndexOf('https://pbs.twimg.com/media/', 0) !== 0;
}

/** https://video.twimg.com/.../<name>.mp4 -> <name>; undefined for other urls */
export function mp4NameOf(url: string): string | undefined {
	const m = videoFilePattern.exec(url);
	return m !== null ? m[1] : undefined;
}

/** a GIF's <video src> (video.twimg.com/tweet_video/<key>.mp4) -> <key> */
export function gifKeyOf(url: string): string | undefined {
	const m = gifVideoPattern.exec(url);
	return m !== null ? m[1] : undefined;
}

export function isVideoUrl(url: string): boolean {
	return mp4NameOf(url) !== undefined;
}

/**
 * The object is a media with video (has video_info.variants and media_url_https).
 */
export function toVideoMedia(o: any): VideoMedia | undefined {
	if (o === null || typeof o !== 'object') return undefined;
	const info = o.video_info;
	if (info === null || typeof info !== 'object' || !Array.isArray(info.variants)) return undefined;
	const mediaUrl = typeof o.media_url_https === 'string' ? o.media_url_https : undefined;
	const variants: VideoVariant[] = [];
	for (const v of info.variants) {
		if (v === null || typeof v !== 'object' || typeof v.url !== 'string') continue;
		variants.push({
			url: v.url,
			contentType: typeof v.content_type === 'string' ? v.content_type : '',
			bitrate: typeof v.bitrate === 'number' ? v.bitrate : undefined,
		});
	}
	if (variants.length === 0) return undefined;
	return {
		type: typeof o.type === 'string' ? o.type : 'video',
		idStr: typeof o.id_str === 'string' ? o.id_str : undefined,
		posterKey: mediaUrl !== undefined ? posterKeyOf(mediaUrl) : undefined,
		expandedUrl: typeof o.expanded_url === 'string' ? o.expanded_url : undefined,
		variants,
	};
}

/**
 * Collect media with video in a JSON-like tree (iterative; bounded by maxNodes).
 * `skip` names keys that are not followed (React internals such as _owner / children).
 */
export function collectVideoMedia(root: any, maxNodes: number, skip?: string[]): VideoMedia[] {
	const found: VideoMedia[] = [];
	const stack: any[] = [root];
	const seen = new Set<any>();
	let visited = 0;
	while (stack.length > 0 && visited < maxNodes) {
		const o = stack.pop();
		if (o === null || typeof o !== 'object' || seen.has(o)) continue;
		seen.add(o);
		visited++;

		const media = toVideoMedia(o);
		if (media !== undefined) {
			found.push(media);
			continue;
		}
		if (Array.isArray(o)) {
			for (let i = o.length - 1; i >= 0; i--) stack.push(o[i]);
			continue;
		}
		let keys: string[];
		try {
			keys = Object.keys(o);
		}
		catch (e) {
			continue;
		}
		for (const key of keys) {
			if (skip !== undefined && skip.indexOf(key) >= 0) continue;
			let value: any;
			try {
				value = o[key];
			}
			catch (e) {
				continue;
			}
			if (value !== null && typeof value === 'object') stack.push(value);
		}
	}
	return found;
}

/**
 * What the page shows for the right-clicked video, used to find its media in the data.
 */
export interface VideoKeys {
	/** poster keys (media/<key>, *_video_thumb/<key>) */
	readonly posterKeys: string[];
	/** numeric media ids from amplify_video_thumb / ext_tw_video_thumb */
	readonly numericIds: string[];
	/** mp4 urls already in the page (GIF <video src>) */
	readonly mp4Urls: string[];
}

export function matchesKeys(media: VideoMedia, keys: VideoKeys): boolean {
	if (media.posterKey !== undefined && keys.posterKeys.indexOf(media.posterKey) >= 0) return true;
	if (media.idStr !== undefined && keys.numericIds.indexOf(media.idStr) >= 0) return true;
	for (const url of keys.mp4Urls) {
		const name = mp4NameOf(url);
		if (name !== undefined && media.variants.some(v => mp4NameOf(v.url) === name)) return true;
	}
	return false;
}

/**
 * mp4 with the highest bitrate (GIFs have one mp4 with bitrate 0). undefined when there is no mp4.
 */
export function bestMp4(media: VideoMedia): VideoVariant | undefined {
	const mp4s = media.variants.filter(v => v.contentType === 'video/mp4' && isVideoUrl(v.url));
	if (mp4s.length === 0) return undefined;
	return mp4s.reduce((best, v) => ((v.bitrate || 0) > (best.bitrate || 0) ? v : best));
}

const mediaPathPattern: RegExp = /^\/([^\/]+)\/status\/(\d+)\/(?:photo|video)\/(\d+)\/?$/;

export interface MediaPath {
	readonly userId: string;
	readonly tweetId: string;
	/** 0-based */
	readonly index: number;
}

/**
 * expanded_url "https://x.com/<user>/status/<id>/video/<n>" (or photo) -> user, tweet, 0-based index
 */
export function parseMediaPath(url: string): MediaPath | undefined {
	let parsed: URL;
	try {
		parsed = new URL(url);
	}
	catch (e) {
		return undefined;
	}
	const m = mediaPathPattern.exec(parsed.pathname);
	if (m === null) return undefined;
	const n = parseInt(m[3], 10);
	if (!(n >= 1)) return undefined;
	return { userId: m[1], tweetId: m[2], index: n - 1 };
}

/**
 * Media objects with "video_info" in JSON text, even when the text is cut in the middle
 * (a chunk of a streamed response). Each enclosing object of a "video_info" key is parsed on its own.
 */
export function videoMediaInJsonText(text: string): VideoMedia[] {
	const found: VideoMedia[] = [];
	if (text.indexOf('"video_info"') < 0) return found;

	const starts: number[] = [];          // positions of open "{" / "["
	const candidates: boolean[] = [];     // the object holds a "video_info" key
	for (let i = 0; i < text.length; i++) {
		const c = text.charCodeAt(i);
		if (c === 0x22) {   // "
			let j = i + 1;
			while (j < text.length) {
				const d = text.charCodeAt(j);
				if (d === 0x5c) j += 2;         // backslash
				else if (d === 0x22) break;
				else j++;
			}
			if (j - i === 11 && text.substr(i, 12) === '"video_info"' && candidates.length > 0) {
				candidates[candidates.length - 1] = true;
			}
			i = j;
		}
		else if (c === 0x7b || c === 0x5b) {   // { [
			starts.push(i);
			candidates.push(false);
		}
		else if (c === 0x7d || c === 0x5d) {   // } ]
			const start = starts.pop();
			const isCandidate = candidates.pop();
			if (start !== undefined && isCandidate === true) {
				try {
					const media = toVideoMedia(JSON.parse(text.slice(start, i + 1)));
					if (media !== undefined) found.push(media);
				}
				catch (e) { /* not a complete object */ }
			}
		}
	}
	return found;
}

/**
 * Media with video in an inline <script> of x-web (TanStack Router streaming, "$_TSR" / "$R[...]").
 * The GraphQL responses are in JavaScript string literals, i.e. JSON escaped once more (\").
 */
export function videoMediaInScriptText(script: string): VideoMedia[] {
	const found: VideoMedia[] = [];
	if (script.indexOf('video_info') < 0) return found;

	const literal = /"((?:[^"\\\n]|\\.)*)"/g;
	let m: RegExpExecArray | null;
	while ((m = literal.exec(script)) !== null) {
		if (m[1].indexOf('video_info') < 0) continue;
		let decoded: string;
		try {
			decoded = JSON.parse(`"${m[1]}"`);
		}
		catch (e) {
			continue;
		}
		videoMediaInJsonText(decoded).forEach(x => found.push(x));
	}
	return found;
}
