import { ResolvedMedia } from "./ImageInfo";
import { findImageAndLink, resolveMedia } from "./ResolveCore";
import { ContextMenuSetting, ReadContextMenuSetting, Setting } from "./Setting";

/**
 * event.target of the last contextmenu event.
 * Recorded in the capture phase so that page handlers (stopPropagation) cannot hide it.
 * In x-web the right click hits the overlay <a> (img is under <div inert>), so chrome may not
 * report srcUrl; the image is found from this element instead.
 */
let lastTarget: Element | undefined = undefined;

/**
 * X shows its own menu on images (and cancels the contextmenu event), which hides the browser's
 * context menu including "Download Original Image". Depending on the setting, stop the event
 * before X receives it so that the browser's menu opens.
 */
let menuSetting: ContextMenuSetting = ReadContextMenuSetting({});

function loadMenuSetting(): void {
    chrome.storage.local.get((items: Setting) => {
        menuSetting = ReadContextMenuSetting(items);
    });
}
loadMenuSetting();
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') loadMenuSetting();
});

function useBrowserMenu(event: MouseEvent): boolean {
    return menuSetting.overrideContextMenu || (menuSetting.shiftNativeMenu && event.shiftKey);
}

function isTwitterImage(target: Element): boolean {
    const { img, link } = findImageAndLink(target, location.href);
    return img !== undefined || link !== undefined;
}

// registered at document_start, so this runs before any listener of the page
window.addEventListener('contextmenu', (event: MouseEvent) => {
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    const first = path.length > 0 ? path[0] : event.target;
    lastTarget = first instanceof Element ? first : undefined;

    if (lastTarget !== undefined && useBrowserMenu(event) && isTwitterImage(lastTarget)) {
        event.stopImmediatePropagation();
    }
}, true);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("TIL request: ");
    console.log(request);
    if (request.name === 'twitterImageDL') {
        const media: ResolvedMedia | undefined = resolveMedia(lastTarget, document, location.href, {
            srcUrl: request.srcUrl,
            linkUrl: request.linkUrl,
        });
        console.log("TIL resolved: ");
        console.log(media);
        sendResponse(media === undefined ? null : media);
    }
    return false;   //  responded synchronously
});
