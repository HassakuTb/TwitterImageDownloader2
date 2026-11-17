import { ImageInfo, ImageInfoImpl, ImageInfoUnresolve, ResolvedMedia, VideoInfo } from "./ImageInfo";
import { Extension, guessExtension, originalUrl } from "./Twimg";
import { Setting, CreateDefaultSetting, IsLatestDataVersion, MigrateSetting1to2, ReadVideoBeta } from "./Setting";
import { injectIntoOpenTabs, syncPageScript } from "./PageScriptRegistry";
import { isVideoUrl } from "./VideoMedia";
import { ResolvedVideo, VideoResolveFailure, isVideoResolveFailure, messageNotFound, messageNotVideo } from "./VideoResolver";

const menuId: string = 'downloadTwitterImage';

function doDownload(setting: Setting, image: ImageInfo){
	console.log("start download: ");
	console.log(image);
	chrome.downloads.download({
		url: image.downloadUrl,
		filename: image.filename,
		saveAs: setting.open_save_as,
	});
}

function loadSetting(callback: (setting: Setting) => void): void {
	chrome.storage.local.get((items: any) => {
		let setting: Setting = (items.download_to === undefined || items.download_to === null) ?
			CreateDefaultSetting() : (items as Setting);

		if(!IsLatestDataVersion(setting)){
			setting = MigrateSetting1to2(setting);

			chrome.storage.local.set(setting, () =>{
				console.log("TIL-Migration done.");
				callback(setting);
			});
		}
		else{
			callback(setting);
		}
	});
}

/**
 * name=orig returns 200 only for the original format (others, including webp, return 404),
 * so ask pbs.twimg.com which one exists. (pbs returns access-control-allow-origin: *)
 */
async function probeExtension(mediaId: string, srcFormat: string | undefined): Promise<Extension> {
	const candidates: Extension[] = ['jpg', 'png'];
	for (const extension of candidates) {
		try {
			const response = await fetch(originalUrl(mediaId, extension), { method: 'HEAD', credentials: 'omit' });
			console.log(`TIL probe ${mediaId} ${extension}: ${response.status}`);
			if (response.ok) return extension;
		}
		catch (e) {
			console.warn(`TIL probe ${mediaId} ${extension} failed: ${e}`);
		}
	}
	const guessed = guessExtension(srcFormat);
	console.warn(`TIL could not determine the extension of ${mediaId}, use ${guessed} (src format: ${srcFormat})`);
	return guessed;
}

async function createImageInfo(media: ResolvedMedia, format: string): Promise<ImageInfo> {
	const extension = await probeExtension(media.mediaId, media.srcFormat);
	if (media.userId !== undefined && media.tweetId !== undefined && media.imageIndex !== undefined) {
		const postDate = media.postTime !== undefined ? new Date(media.postTime) : undefined;
		return new ImageInfoImpl(media.userId, media.tweetId, media.imageIndex, media.mediaId, extension, format, postDate, media.displayName);
	}
	return new ImageInfoUnresolve(media.mediaId, extension);
}

const documentPatterns: string[] = [
	'https://twitter.com/*',
	'https://pro.twitter.com/*',
	'https://x.com/*',
	'https://pro.x.com/*'
];

/** video download (beta) */
const videoMenuId: string = 'downloadTwitterVideo';
const videoPosterMenuId: string = 'downloadTwitterVideoPoster';
const videoMenuTitle: string = 'Download Video (beta)';
/** posters that are always videos */
const videoOnlyPosterPatterns: string[] = [
	'https://pbs.twimg.com/tweet_video_thumb/*',
	'https://pbs.twimg.com/amplify_video_thumb/*',
	'https://pbs.twimg.com/ext_tw_video_thumb/*',
];
/** /media/ is used by photos and some video posters */
const posterPatterns: string[] = ['https://pbs.twimg.com/media/*'].concat(videoOnlyPosterPatterns);

/**
 * create context menu
 *  image : old client (img is right-clicked; srcUrl is reported)
 *  link  : new client x-web (an overlay <a href=".../photo/n"> covers the img; srcUrl is not reported)
 *
 * video download (beta), only while it is active:
 *  video : <video> (src is blob: or a GIF mp4, which cannot be matched by targetUrlPatterns)
 *  image : posters. /media/ is also used for photos, so the item is shown on photos too
 *          (the content script answers "not a video").
 */
let menuQueue: Promise<void> = Promise.resolve();

/** calls are serialized so that two rebuilds do not create the same id twice */
function buildMenus(videoActive: boolean): void {
	menuQueue = menuQueue.then(() => new Promise<void>(resolve => createMenus(videoActive, resolve)));
}

function createMenus(videoActive: boolean, done: () => void): void {
	chrome.contextMenus.removeAll(() => {
		chrome.contextMenus.create({
			type: 'normal',
			id: menuId,
			title: 'Download Original Image',
			contexts: [
				'image',
				'link',
			],
			documentUrlPatterns: documentPatterns,
			targetUrlPatterns: [
				'https://pbs.twimg.com/media/*',
				'https://twitter.com/*/status/*/photo/*',
				'https://pro.twitter.com/*/status/*/photo/*',
				'https://x.com/*/status/*/photo/*',
				'https://pro.x.com/*/status/*/photo/*',
			],
		});
		if (!videoActive) {
			done();
			return;
		}
		chrome.contextMenus.create({
			type: 'normal',
			id: videoMenuId,
			title: videoMenuTitle,
			contexts: ['video'],
			documentUrlPatterns: documentPatterns,
		});
		chrome.contextMenus.create({
			type: 'normal',
			id: videoPosterMenuId,
			title: videoMenuTitle,
			contexts: ['image'],
			documentUrlPatterns: documentPatterns,
			targetUrlPatterns: posterPatterns,
		}, () => done());
	});
}

/**
 * The content script tells whether the mouse is on a photo or not, so that "Download Video (beta)"
 * does not fold "Download Original Image" into a submenu on photos.
 * "visible: false" does not help: Chrome still counts the hidden item and makes a submenu with one item.
 * Items whose patterns do not match are not counted, so /media/ is taken out of the poster item's
 * patterns while the mouse is on a photo. The video item (video context) appears only on <video>.
 */
chrome.runtime.onMessage.addListener((request: any) => {
	if (request === null || typeof request !== 'object' || request.name !== 'twitterImageDL:videoMenu') return;
	const onPhoto = request.visible !== true;
	chrome.contextMenus.update(videoPosterMenuId, { targetUrlPatterns: onPhoto ? videoOnlyPosterPatterns : posterPatterns }, () => {
		// not created while the beta is off
		if (chrome.runtime.lastError) return;
	});
});

/** shown in the page by the content script */
function showToast(tabId: number, message: string): void {
	chrome.tabs.sendMessage(tabId, { name: 'twitterImageDL:toast', message }, () => {
		if (chrome.runtime.lastError) console.warn(`TIL toast failed: ${chrome.runtime.lastError.message}`);
	});
}

/** download ids of videos -> tab, to tell the user when the download is interrupted */
const videoDownloads: { [id: number]: number } = {};

function downloadVideo(setting: Setting, tabId: number, video: ResolvedVideo): void {
	// the answer comes through the page world, which the page can see; accept only X's video server
	if (!isVideoUrl(video.url)) {
		console.warn(`TIL refused a video url: ${video.url}`);
		showToast(tabId, messageNotFound);
		return;
	}
	const info = new VideoInfo(video.url, video.original, setting.download_to!, video);
	console.log("start video download: ");
	console.log(info);
	chrome.downloads.download({
		url: info.downloadUrl,
		filename: info.filename,
		saveAs: setting.open_save_as,
	}, (downloadId?: number) => {
		if (chrome.runtime.lastError || downloadId === undefined) {
			const reason = chrome.runtime.lastError ? chrome.runtime.lastError.message : 'unknown';
			console.warn(`TIL video download failed: ${reason}`);
			showToast(tabId, `Could not download the video (${reason}).`);
			return;
		}
		videoDownloads[downloadId] = tabId;
	});
}

chrome.downloads.onChanged.addListener((delta: chrome.downloads.DownloadDelta) => {
	const tabId = videoDownloads[delta.id];
	if (tabId === undefined || delta.state === undefined) return;
	if (delta.state.current === 'interrupted') {
		const reason = delta.error !== undefined ? delta.error.current : 'interrupted';
		// the user cancelling the "Save As" dialog is not a failure
		if (reason !== 'USER_CANCELED') showToast(tabId, `The video download failed (${reason}).`);
	}
	if (delta.state.current !== 'in_progress') delete videoDownloads[delta.id];
});

function onClickVideo(info: chrome.contextMenus.OnClickData, tabId: number): void {
	loadSetting((setting: Setting) => {
		chrome.tabs.sendMessage(
			tabId,
			{ name: 'twitterVideoDL', srcUrl: info.srcUrl, pageUrl: info.pageUrl },
			(response: ResolvedVideo | VideoResolveFailure | null | undefined) => {
				if (chrome.runtime.lastError) {
					console.warn(`TIL send message failed: ${chrome.runtime.lastError.message}`);
					return;
				}
				console.log("TIL video response: ");
				console.log(response);
				if (response === null || response === undefined) {
					showToast(tabId, messageNotVideo);
					return;
				}
				if (isVideoResolveFailure(response)) {
					showToast(tabId, response.error);
					return;
				}
				downloadVideo(setting, tabId, response);
			}
		);
	});
}

/**
 * on click context menu
 * ask the content script which image was clicked, then download
 */
chrome.contextMenus.onClicked.addListener((info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => {
	console.log(info);
	if (tab === null || tab === undefined || tab.id === undefined) return;
	const tabId: number = tab.id;
	if (info.menuItemId === videoMenuId || info.menuItemId === videoPosterMenuId) {
		onClickVideo(info, tabId);
		return;
	}
	if (info.menuItemId !== menuId) return;

	loadSetting((setting: Setting) => {
		chrome.tabs.sendMessage(
			tabId,
			{ name: 'twitterImageDL', srcUrl: info.srcUrl, linkUrl: info.linkUrl, pageUrl: info.pageUrl },
			(response: ResolvedMedia | null | undefined) => {
				if (chrome.runtime.lastError) {
					console.warn(`TIL send message failed: ${chrome.runtime.lastError.message}`);
					return;
				}
				console.log("TIL send message response: ");
				console.log(response);

				if (response === null || response === undefined) {
					console.warn('The selected element is not a Twitter image.');
					return;
				}
				createImageInfo(response, setting.download_to!)
					.then(image => doDownload(setting, image))
					.catch(e => console.error(`TIL download failed: ${e}`));
			}
		);
	});
});

/**
 * video download (beta): keep the page-world script and the menu in sync with the setting
 */
buildMenus(false);
loadSetting((setting: Setting) => {
	syncPageScript(ReadVideoBeta(setting)).then(active => buildMenus(active));
});
chrome.storage.onChanged.addListener((changes, areaName) => {
	if (areaName !== 'local' || changes.video_beta === undefined) return;
	const enabled = changes.video_beta.newValue === true;
	const wasEnabled = changes.video_beta.oldValue === true;
	syncPageScript(enabled).then(active => {
		buildMenus(active);
		if (active && !wasEnabled) injectIntoOpenTabs();
	});
});
