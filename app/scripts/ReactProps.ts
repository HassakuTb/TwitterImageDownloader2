/**
 * Find the media of a right-clicked video in the React props of the page (old client, responsive-web).
 * Only readable from the page world: React keeps its fiber in "__reactFiber$<random>" of DOM elements.
 *
 * Seen on 2026-11-17 (knowledges/x-client/tweet-data.md): memoizedProps.mediaDetails is
 *   57 fibers above the poster <img> before playing,
 *   93 above the parent of <video> (the <video> itself has no fiber) and
 *   131 above the transparent poster <img> while playing.
 */
import { VideoKeys, VideoMedia, collectVideoMedia, matchesKeys } from "./VideoMedia";
import { TweetMediaList, toTweetMediaList } from "./TweetMedia";

const maxDomClimb: number = 15;
const maxFiberClimb: number = 250;
const maxNodesPerProps: number = 300;
const skippedProps: string[] = ['children', '_owner', '_store', 'ref', 'style', 'className'];

function fiberOf(element: Element): any {
	const key = Object.keys(element).filter(k => k.lastIndexOf('__reactFiber$', 0) === 0)[0];
	return key !== undefined ? (element as any)[key] : undefined;
}

function nearestFiber(start: Element): any {
	let element: Element | null = start;
	let fiber: any = undefined;
	for (let i = 0; element !== null && i < maxDomClimb && fiber === undefined; i++) {
		fiber = fiberOf(element);
		element = element.parentElement;
	}
	return fiber;
}

export interface TweetWanted {
	/** the tweet id, when the page shows it */
	readonly tweetId?: string;
	/** any tweet but this one (a quoted tweet whose id the page does not show; this is the quoting tweet) */
	readonly excludeId?: string;
}

function isWanted(tweetId: string, wanted: TweetWanted): boolean {
	if (wanted.tweetId !== undefined) return tweetId === wanted.tweetId;
	if (wanted.excludeId !== undefined) return tweetId !== wanted.excludeId;
	return true;
}

/**
 * The tweet that the element belongs to (old client). Seen on 2026-11-17 (knowledges/x-client/tweet-data.md):
 * climbing from the text of a tweet, the first memoizedProps.tweet is that tweet
 * (64 fibers above the text of a tweet, 35 above the text of a quoted tweet).
 * The tweet object holds id_str, user and extended_entities.media like the GraphQL legacy.
 */
export function findTweetInReactProps(start: Element, wanted: TweetWanted): TweetMediaList | undefined {
	let fiber: any = nearestFiber(start);
	for (let i = 0; fiber !== undefined && fiber !== null && i < maxFiberClimb; i++, fiber = fiber.return) {
		const props = fiber.memoizedProps;
		const tweet = props !== null && typeof props === 'object' ? props.tweet : undefined;
		if (tweet === null || typeof tweet !== 'object') continue;
		// a retweet / quote may carry the wanted tweet inside
		for (const candidate of [tweet, tweet.retweeted_status, tweet.quoted_status]) {
			if (candidate === null || typeof candidate !== 'object' || typeof candidate.id_str !== 'string') continue;
			if (!isWanted(candidate.id_str, wanted)) continue;
			const found = toTweetMediaList(candidate, true);
			if (found !== undefined) {
				console.log(`TIL page: found the tweet ${found.tweetId} in React props (${i} fibers above)`);
				return found;
			}
		}
	}
	return undefined;
}

export function findInReactProps(start: Element, keys: VideoKeys): VideoMedia | undefined {
	let fiber: any = nearestFiber(start);

	for (let i = 0; fiber !== undefined && fiber !== null && i < maxFiberClimb; i++, fiber = fiber.return) {
		const props = fiber.memoizedProps;
		if (props === null || typeof props !== 'object') continue;
		const found = collectVideoMedia(props, maxNodesPerProps, skippedProps).filter(m => matchesKeys(m, keys))[0];
		if (found !== undefined) {
			console.log(`TIL page: found the video in React props (${i} fibers above)`);
			return found;
		}
	}
	return undefined;
}
