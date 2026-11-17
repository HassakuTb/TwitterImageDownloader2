/**
 * Registers the page-world (MAIN world) script for video download (beta) only while the beta setting is on.
 *
 *  - registered with scripting.registerContentScripts (world MAIN, document_start), unregistered when off
 *  - synced with the setting every time the background starts
 *  - when turned on, also injected into the x.com tabs that are already open
 *
 * world MAIN needs Chrome 102+ / Firefox 128+ (knowledges/extension/main-world.md).
 * When the browser cannot do it, the reason is stored under VideoBetaUnsupportedKey and the options page
 * disables the checkbox.
 *
 * @types/chrome of this project is too old for chrome.scripting, so the part that is used is typed here.
 */
import { VideoBetaUnsupportedKey } from "./Setting";

interface RegisteredContentScript {
	id: string;
	matches?: string[];
	js?: string[];
	runAt?: 'document_start' | 'document_end' | 'document_idle';
	world?: 'ISOLATED' | 'MAIN';
	persistAcrossSessions?: boolean;
	allFrames?: boolean;
}

interface ScriptingApi {
	registerContentScripts(scripts: RegisteredContentScript[]): Promise<void>;
	unregisterContentScripts(filter?: { ids?: string[] }): Promise<void>;
	getRegisteredContentScripts(filter?: { ids?: string[] }): Promise<RegisteredContentScript[]>;
	executeScript(injection: { target: { tabId: number, allFrames?: boolean }, files: string[], world?: 'ISOLATED' | 'MAIN' }): Promise<unknown[]>;
	ExecutionWorld?: { [key: string]: string };
}

export const pageScriptId: string = 'twitterImageDL-page-world';
export const pageScriptFile: string = 'dist/page.bundle.js';
export const pageMatches: string[] = [
	'https://twitter.com/*',
	'https://pro.twitter.com/*',
	'https://x.com/*',
	'https://pro.x.com/*',
];

function scriptingApi(): ScriptingApi | undefined {
	const api = (chrome as any).scripting as ScriptingApi | undefined;
	if (api === undefined || api === null) return undefined;
	if (typeof api.registerContentScripts !== 'function' || typeof api.executeScript !== 'function') return undefined;
	return api;
}

/**
 * undefined when supported, otherwise the reason.
 * ExecutionWorld.MAIN exists on Chrome 102+ / Firefox 128+ (the enum itself is older on Firefox).
 */
function unsupportedReason(api: ScriptingApi | undefined): string | undefined {
	if (api === undefined) return 'scripting api is not available';
	if (api.ExecutionWorld === undefined || api.ExecutionWorld.MAIN !== 'MAIN') return 'scripting.ExecutionWorld.MAIN is not available';
	return undefined;
}

function storeSupport(reason: string | undefined): Promise<void> {
	return new Promise(resolve => {
		if (reason === undefined) {
			chrome.storage.local.remove(VideoBetaUnsupportedKey, () => resolve());
		}
		else {
			console.warn(`TIL video (beta) is not supported: ${reason}`);
			chrome.storage.local.set({ [VideoBetaUnsupportedKey]: reason }, () => resolve());
		}
	});
}

async function isRegistered(api: ScriptingApi): Promise<boolean> {
	const scripts = await api.getRegisteredContentScripts({ ids: [pageScriptId] });
	return scripts.some(s => s.id === pageScriptId);
}

/**
 * @returns true when the page-world script is registered after the call
 */
async function sync(enabled: boolean): Promise<boolean> {
	const api = scriptingApi();
	const reason = unsupportedReason(api);
	if (api === undefined || reason !== undefined) {
		await storeSupport(reason);
		return false;
	}

	try {
		const registered = await isRegistered(api);
		if (enabled && !registered) {
			await api.registerContentScripts([{
				id: pageScriptId,
				matches: pageMatches,
				js: [pageScriptFile],
				runAt: 'document_start',
				world: 'MAIN',
				persistAcrossSessions: true,
			}]);
			console.log('TIL page-world script registered');
		}
		else if (!enabled && registered) {
			await api.unregisterContentScripts({ ids: [pageScriptId] });
			console.log('TIL page-world script unregistered');
		}
		await storeSupport(undefined);
		return enabled;
	}
	catch (e) {
		// e.g. a browser that does not know "world" rejects the registration
		await storeSupport(`registerContentScripts failed: ${e}`);
		return false;
	}
}

/** calls are serialized so that a startup sync and a setting change do not race */
let queue: Promise<boolean> = Promise.resolve(false);

export function syncPageScript(enabled: boolean): Promise<boolean> {
	queue = queue.then(() => sync(enabled), () => sync(enabled));
	return queue;
}

/**
 * Inject the page-world script into the tabs opened before the beta was turned on.
 * (The script ignores a second injection.)
 */
export async function injectIntoOpenTabs(): Promise<void> {
	const api = scriptingApi();
	if (api === undefined || unsupportedReason(api) !== undefined) return;

	const tabs: chrome.tabs.Tab[] = await new Promise(resolve => chrome.tabs.query({ url: pageMatches }, resolve));
	for (const tab of tabs) {
		if (tab.id === undefined) continue;
		try {
			await api.executeScript({ target: { tabId: tab.id }, files: [pageScriptFile], world: 'MAIN' });
			console.log(`TIL page-world script injected into tab ${tab.id}`);
		}
		catch (e) {
			console.warn(`TIL could not inject the page-world script into tab ${tab.id}: ${e}`);
		}
	}
}
