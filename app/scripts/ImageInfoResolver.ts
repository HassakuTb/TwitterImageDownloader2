import { ResolvedMedia } from "./ImageInfo";
import { findImageAndLink, resolveMedia } from "./ResolveCore";
import { ContextMenuSetting, ReadContextMenuSetting, ReadVideoBeta, Setting } from "./Setting";
import { findVideoKeys, looksLikeVideo, resolvePosterPlace, resolveVideo } from "./VideoResolver";
import { showToast } from "./Toast";
import { passThroughPlayer, restorePlayer } from "./PlayerPassThrough";

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
/** video download (beta) is on: video / GIF cells also open the browser's menu */
let videoBeta: boolean = false;

function loadMenuSetting(): void {
    chrome.storage.local.get((items: Setting) => {
        menuSetting = ReadContextMenuSetting(items);
        videoBeta = ReadVideoBeta(items);
    });
}
loadMenuSetting();
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
        loadMenuSetting();
        lastVideoMenuVisible = undefined;
    }
});
// the background rebuilds the menu (visible again) when the setting changes; resend on the next pointerover
document.addEventListener('visibilitychange', () => { lastVideoMenuVisible = undefined; });

function useBrowserMenu(event: MouseEvent): boolean {
    return menuSetting.overrideContextMenu || (menuSetting.shiftNativeMenu && event.shiftKey);
}

function isTwitterImage(target: Element): boolean {
    const { img, link } = findImageAndLink(target, location.href);
    return img !== undefined || link !== undefined;
}

function isTwitterVideo(target: Element): boolean {
    const { keys, cell } = findVideoKeys(target, undefined);
    return cell !== undefined && looksLikeVideo(cell, keys);
}

/**
 * video download (beta): Chrome folds two items of an extension into a submenu, so
 * "Download Video (beta)" is hidden while the mouse is on a photo, and shown elsewhere
 * (on videos, and anywhere else so that a menu opened from the keyboard misses nothing).
 * The menu is switched when the mouse enters a cell, well before the right click.
 */
const hoverCellSelector: string = '[data-testid=tweetPhoto], [data-testid=videoPlayer], a[href*="/photo/"]';
/** undefined: send on the next pointerover (the menu is shared by all tabs and windows) */
let lastVideoMenuVisible: boolean | undefined = undefined;

function videoMenuVisibleFor(target: Element): boolean {
    const isMediaElement = target.tagName === 'IMG' || target.tagName === 'VIDEO';
    if (!isMediaElement && target.closest(hoverCellSelector) === null) return true;
    if (isTwitterVideo(target)) return true;
    return !isTwitterImage(target);
}

window.addEventListener('pointerover', (event: PointerEvent) => {
    if (!videoBeta || !(event.target instanceof Element)) return;
    // the pointer came from outside this window (another tab / window may have switched the menu)
    if (event.relatedTarget === null) lastVideoMenuVisible = undefined;
    const visible = videoMenuVisibleFor(event.target);
    if (visible === lastVideoMenuVisible) return;
    lastVideoMenuVisible = visible;
    try {
        chrome.runtime.sendMessage({ name: 'twitterImageDL:videoMenu', visible }, () => {
            if (chrome.runtime.lastError) { /* the background may be restarting; the next change resends */ }
        });
    }
    catch (e) {
        // the extension was reloaded; this content script is orphaned
    }
}, true);

// video download (beta): on X's video player, let the right click reach the video under the controls
window.addEventListener('mousedown', (event: MouseEvent) => {
    if (event.button === 2 && videoBeta && useBrowserMenu(event)) passThroughPlayer(event);
}, true);

// registered at document_start, so this runs before any listener of the page
window.addEventListener('contextmenu', (event: MouseEvent) => {
    // the menu is decided by now; put the player's layers back
    window.setTimeout(restorePlayer, 0);

    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    const first = path.length > 0 ? path[0] : event.target;
    lastTarget = first instanceof Element ? first : undefined;

    if (lastTarget !== undefined && useBrowserMenu(event) &&
        (isTwitterImage(lastTarget) || (videoBeta && isTwitterVideo(lastTarget)))) {
        event.stopImmediatePropagation();
    }
}, true);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("TIL request: ");
    console.log(request);
    if (request.name === 'twitterImageDL') {
        let media: ResolvedMedia | undefined = resolveMedia(lastTarget, document, location.href, {
            srcUrl: request.srcUrl,
            linkUrl: request.linkUrl,
        });
        if (videoBeta && media !== undefined && media.tweetId === undefined) {
            // a video poster has no "/photo/n" link; name it like the video (beta only)
            const place = resolvePosterPlace(lastTarget, document, location.href, request.srcUrl);
            if (place !== undefined) {
                media = {
                    ...media,
                    userId: place.userId,
                    tweetId: place.tweetId,
                    imageIndex: place.index,
                    displayName: place.displayName,
                    postTime: place.postTime,
                };
            }
        }
        console.log("TIL resolved: ");
        console.log(media);
        sendResponse(media === undefined ? null : media);
    }
    else if (request.name === 'twitterVideoDL') {
        // video download (beta): ResolvedVideo or VideoResolveFailure
        const video = resolveVideo(lastTarget, document, location.href, request.srcUrl);
        console.log("TIL resolved video: ");
        console.log(video);
        sendResponse(video);
    }
    else if (request.name === 'twitterImageDL:toast' && typeof request.message === 'string') {
        // a failure of video download (beta), sent by the background
        showToast(request.message);
        sendResponse(true);
    }
    return false;   //  responded synchronously
});
