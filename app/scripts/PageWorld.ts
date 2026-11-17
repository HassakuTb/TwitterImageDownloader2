/**
 * Page-world (MAIN world) script for video download (beta).
 *
 * Registered by the background only while the beta setting is on (PageScriptRegistry.ts).
 * It runs in X's own JavaScript world, so it can see what the isolated content script cannot:
 *  B: the responses of X's XMLHttpRequest / fetch (GraphQL tweet data with video_info) and,
 *     on x-web, the data streamed in inline <script> ($_TSR)
 *  A: the React props of the right-clicked element (when B has not seen the tweet,
 *     e.g. in a tab opened before the script was injected)
 *
 * The content script asks for a video with a DOM event (PageProtocol.ts).
 * No chrome.* api is available here.
 */
import { VideoTable } from "./VideoTable";
import { videoMediaInJsonText, videoMediaInScriptText, VideoMedia } from "./VideoMedia";
import { findInReactProps } from "./ReactProps";
import { FindVideoRequest, FindVideoResponse, findVideoEvent, targetAttribute, videoFoundEvent } from "./PageProtocol";

const installedFlag: string = '__twitterImageDL_pageWorld';
const graphqlPattern: RegExp = /\/i\/api\/graphql\/[^\/]+\/([A-Za-z0-9_]+)/;

const table = new VideoTable();

/** the extension runtime is visible only in the isolated world (a browser that ignored world: MAIN) */
function isIsolatedWorld(): boolean {
	const c = (window as any).chrome;
	return c !== undefined && c !== null && c.runtime !== undefined && typeof c.runtime.id === 'string';
}

function isTargetUrl(url: string): boolean {
	return url.indexOf('/i/api/') >= 0;
}

function operationName(url: string): string {
	const m = graphqlPattern.exec(url);
	return m !== null ? m[1] : url.split('?')[0];
}

function addAll(media: VideoMedia[]): void {
	media.forEach(m => table.add(m));
}

function onResponseText(source: string, url: string, text: string): void {
	if (text.indexOf('"video_info"') < 0) return;
	const media = videoMediaInJsonText(text);
	addAll(media);
	console.log(`TIL page: ${source} ${operationName(url)} ${text.length} chars, ${media.length} videos (table ${table.size})`);
}

function hookXhr(): void {
	const proto = XMLHttpRequest.prototype;
	const originalOpen = proto.open;
	const originalSend = proto.send;
	const urls = new WeakMap<XMLHttpRequest, string>();

	proto.open = function (this: XMLHttpRequest, method: string, url: string | URL) {
		try {
			urls.set(this, String(url));
		}
		catch (e) { /* ignore */ }
		return originalOpen.apply(this, arguments as any);
	} as typeof proto.open;

	proto.send = function (this: XMLHttpRequest) {
		const url = urls.get(this);
		if (url !== undefined && isTargetUrl(url)) {
			this.addEventListener('load', () => {
				try {
					if (this.responseType === '' || this.responseType === 'text') {
						onResponseText('xhr', url, this.responseText);
					}
					else if (this.responseType === 'json' && this.response !== null) {
						onResponseText('xhr', url, JSON.stringify(this.response));
					}
				}
				catch (e) {
					console.warn(`TIL page: could not read the response of ${operationName(url)}: ${e}`);
				}
			});
		}
		return originalSend.apply(this, arguments as any);
	};
}

function hookFetch(): void {
	const originalFetch = window.fetch;
	if (typeof originalFetch !== 'function') return;

	window.fetch = function (this: any, input: RequestInfo, init?: RequestInit) {
		const promise = originalFetch.apply(this, arguments as any) as Promise<Response>;
		try {
			const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : String(input));
			if (isTargetUrl(url)) {
				promise.then(response => response.clone().text())
					.then(text => onResponseText('fetch', url, text))
					.catch(() => { /* the page handles its own errors */ });
			}
		}
		catch (e) { /* ignore */ }
		return promise;
	} as typeof window.fetch;
}

/**
 * x-web streams the server data in inline <script>s that remove themselves after running,
 * so keep the elements when they are added and read them later (their text may still be growing).
 */
const pendingScripts: HTMLScriptElement[] = [];

function readPendingScripts(): void {
	while (pendingScripts.length > 0) {
		const script = pendingScripts.shift()!;
		const media = videoMediaInScriptText(script.textContent || '');
		if (media.length > 0) {
			addAll(media);
			console.log(`TIL page: inline script, ${media.length} videos (table ${table.size})`);
		}
	}
}

function watchInlineScripts(): void {
	const collect = (node: Node) => {
		if (node.nodeName === 'SCRIPT' && !(node as HTMLScriptElement).src) pendingScripts.push(node as HTMLScriptElement);
	};
	Array.from(document.querySelectorAll('script')).forEach(collect);
	const observer = new MutationObserver(records => {
		records.forEach(r => Array.from(r.addedNodes).forEach(collect));
	});
	observer.observe(document, { childList: true, subtree: true });

	const stop = () => {
		readPendingScripts();
		// later scripts are only the app's own; responses after this come through XHR / fetch
		window.setTimeout(() => {
			observer.disconnect();
			readPendingScripts();
		}, 10000);
	};
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', stop, { once: true });
	else stop();
}

function respond(response: FindVideoResponse): void {
	document.dispatchEvent(new CustomEvent(videoFoundEvent, { detail: JSON.stringify(response) }));
}

function onFindVideo(event: Event): void {
	let request: FindVideoRequest;
	try {
		request = JSON.parse(String((event as CustomEvent).detail));
	}
	catch (e) {
		return;
	}
	if (request === null || typeof request.requestId !== 'string' || request.keys === undefined) return;

	readPendingScripts();
	const fromData = table.find(request.keys);
	if (fromData !== undefined) {
		respond({ requestId: request.requestId, media: fromData, source: 'data' });
		return;
	}

	const target = document.querySelector(`[${targetAttribute}="${request.requestId}"]`);
	const fromReact = target !== null ? findInReactProps(target, request.keys) : undefined;
	if (fromReact !== undefined) table.add(fromReact);
	respond({ requestId: request.requestId, media: fromReact !== undefined ? fromReact : null, source: fromReact !== undefined ? 'react' : undefined });
}

(function main(): void {
	if (isIsolatedWorld()) {
		console.warn('TIL page: not running in the page world; video download (beta) is not available');
		return;
	}
	const w = window as any;
	if (w[installedFlag] === true) return;   // injected twice (registered script + executeScript)
	Object.defineProperty(w, installedFlag, { value: true, enumerable: false });

	hookXhr();
	hookFetch();
	watchInlineScripts();
	document.addEventListener(findVideoEvent, onFindVideo);
	console.log(`TIL page: installed (${document.readyState})`);
})();
