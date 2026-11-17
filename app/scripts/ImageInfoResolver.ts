import { ResolvedMedia } from "./ImageInfo";
import { resolveMedia } from "./ResolveCore";

/**
 * event.target of the last contextmenu event.
 * Recorded in the capture phase so that page handlers (stopPropagation) cannot hide it.
 * In x-web the right click hits the overlay <a> (img is under <div inert>), so chrome may not
 * report srcUrl; the image is found from this element instead.
 */
let lastTarget: Element | undefined = undefined;

window.addEventListener('contextmenu', (event: MouseEvent) => {
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    const first = path.length > 0 ? path[0] : event.target;
    lastTarget = first instanceof Element ? first : undefined;
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
