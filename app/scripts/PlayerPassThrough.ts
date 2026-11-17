/**
 * Video download (beta): let a right click on X's video player reach the <video> / poster under it.
 *
 * While the mouse is on a player (after "play" was pressed once), a transparent layer of controls covers
 * the video, and a right click hits a plain <div>. The browser then shows no image / video context,
 * so "Download Video (beta)" is not in the menu.
 * On the right button's mousedown, the elements above the video are made "pointer-events: none"
 * for a moment, so that the following contextmenu hits the video (or the transparent poster <img>).
 *
 * Decision 2026-11-17: try this; if it does not work, the player is not supported (no menu in "page" context).
 */
const playerSelector: string = '[data-testid=videoPlayer]';
/**
 * restore even if no contextmenu event follows. Long enough for a slow right click on Windows,
 * where contextmenu comes on mouseup.
 */
const restoreAfterMs: number = 5000;

interface Changed {
	readonly element: HTMLElement;
	readonly value: string;
	readonly priority: string;
}

let changed: Changed[] = [];
let restoreTimer: number | undefined = undefined;

function isMedia(element: Element): boolean {
	if (element.tagName === 'VIDEO') return true;
	return element.tagName === 'IMG' && ((element as HTMLImageElement).src || '').lastIndexOf('https://pbs.twimg.com/', 0) === 0;
}

export function restorePlayer(): void {
	if (restoreTimer !== undefined) {
		window.clearTimeout(restoreTimer);
		restoreTimer = undefined;
	}
	changed.forEach(c => c.element.style.setProperty('pointer-events', c.value, c.priority));
	changed = [];
}

/**
 * @returns true when layers were made transparent to the pointer
 */
export function passThroughPlayer(event: MouseEvent): boolean {
	restorePlayer();
	const target = event.target instanceof Element ? event.target : null;
	const player = target !== null ? target.closest(playerSelector) : null;
	if (player === null || isMedia(target!)) return false;
	if (typeof document.elementsFromPoint !== 'function') return false;

	// top to bottom; stop at the first media of this player
	const stack = document.elementsFromPoint(event.clientX, event.clientY);
	const mediaIndex = stack.findIndex(e => player.contains(e) && isMedia(e));
	if (mediaIndex <= 0) return false;
	const media = stack[mediaIndex];

	stack.slice(0, mediaIndex)
		.filter(e => player.contains(e) && !e.contains(media) && e instanceof HTMLElement)
		.forEach(e => {
			const element = e as HTMLElement;
			changed.push({
				element,
				value: element.style.getPropertyValue('pointer-events'),
				priority: element.style.getPropertyPriority('pointer-events'),
			});
			element.style.setProperty('pointer-events', 'none', 'important');
		});
	if (changed.length === 0) return false;

	restoreTimer = window.setTimeout(restorePlayer, restoreAfterMs);
	console.log(`TIL player: ${changed.length} layers pass the right click through to ${media.tagName}`);
	return true;
}
