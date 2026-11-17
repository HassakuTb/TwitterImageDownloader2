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

const maxDomClimb: number = 15;
const maxFiberClimb: number = 250;
const maxNodesPerProps: number = 300;
const skippedProps: string[] = ['children', '_owner', '_store', 'ref', 'style', 'className'];

function fiberOf(element: Element): any {
	const key = Object.keys(element).filter(k => k.lastIndexOf('__reactFiber$', 0) === 0)[0];
	return key !== undefined ? (element as any)[key] : undefined;
}

export function findInReactProps(start: Element, keys: VideoKeys): VideoMedia | undefined {
	let element: Element | null = start;
	let fiber: any = undefined;
	for (let i = 0; element !== null && i < maxDomClimb && fiber === undefined; i++) {
		fiber = fiberOf(element);
		element = element.parentElement;
	}

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
