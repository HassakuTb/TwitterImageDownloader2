import { ImageInfo, ImageInfoImpl, ImageInfoUnresolve, ResolvedMedia, VideoInfo } from "./ImageInfo";
import { Extension, guessExtension, originalUrl } from "./Twimg";
import { Setting, CreateDefaultSetting, IsLatestDataVersion, MigrateSetting1to2, ReadVideoBeta, ReadBulkIncludeVideo, BulkFilenameFormat } from "./Setting";
import { injectIntoOpenTabs, syncPageScript } from "./PageScriptRegistry";
import { isVideoUrl } from "./VideoMedia";
import { ResolvedVideo, VideoResolveFailure, isVideoResolveFailure, messageNotFound, messageNotVideo } from "./VideoResolver";
import { PostResolveFailure, ResolvedPost, isPostResolveFailure, messagePostNotFound } from "./TweetResolver";

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

/** download all media in a post (beta): right-click the text or a blank area of a post */
const bulkMenuId: string = 'downloadTwitterPostMedia';
const bulkMenuTitle: string = 'Download All Media in Post (beta)';

/**
 * create context menu
 *  image : old client (img is right-clicked; srcUrl is reported)
 *  link  : new client x-web (an overlay <a href=".../photo/n"> covers the img; srcUrl is not reported)
 *
 * video download (beta), only while it is active:
 *  video : <video> (src is blob: or a GIF mp4, which cannot be matched by targetUrlPatterns)
 *  image : posters. /media/ is also used for photos, so the item is shown on photos too
 *          (the content script answers "not a video").
 *
 * download all media in a post (beta), only while it is active:
 *  page / selection : the text or a blank area of a post. No other item of this extension appears there,
 *                     so the item does not fold the photo / video items into a submenu.
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
		});
		// shown only while the mouse is on a post (the content script switches it)
		chrome.contextMenus.create({
			type: 'normal',
			id: bulkMenuId,
			title: bulkMenuTitle,
			contexts: ['page', 'selection'],
			documentUrlPatterns: documentPatterns,
			visible: false,
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
	if (request === null || typeof request !== 'object' || request.name !== 'twitterImageDL:bulkMenu') return;
	// "visible" is missing in the old @types/chrome; the api has it (Chrome 62+, Firefox 63+)
	const changes: chrome.contextMenus.UpdateProperties & { visible: boolean } = { visible: request.visible === true };
	chrome.contextMenus.update(bulkMenuId, changes, () => {
		// not created while the beta is off
		if (chrome.runtime.lastError) return;
	});
});

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

/**
 * download all media in a post (beta): one batch per click. A toast is shown once, after every download
 * of the batch has ended, and only when something could not be saved.
 */
interface BulkBatch {
	readonly tabId: number;
	readonly total: number;
	readonly failures: string[];
	/** downloads started and not ended yet */
	pending: number;
	/** every item has been handed to chrome.downloads (or failed) */
	started: boolean;
}

/** download ids of a post -> its batch */
const bulkDownloads: { [id: number]: BulkBatch } = {};

function finishBulkIfDone(batch: BulkBatch): void {
	if (!batch.started || batch.pending > 0) return;
	const failed = batch.failures.length;
	if (failed === 0) return;
	const reasons = batch.failures.filter((r, i, all) => all.indexOf(r) === i).join(' ');
	showToast(batch.tabId, `Saved ${batch.total - failed} of ${batch.total}. ${failed} could not be saved: ${reasons}`);
}

function startDownload(batch: BulkBatch, url: string, filename: string): Promise<void> {
	return new Promise<void>(resolve => {
		chrome.downloads.download({ url, filename, saveAs: false }, (downloadId?: number) => {
			if (chrome.runtime.lastError || downloadId === undefined) {
				const reason = chrome.runtime.lastError ? chrome.runtime.lastError.message : 'unknown';
				console.warn(`TIL post download failed: ${reason}`);
				batch.failures.push(`Could not start a download (${reason}).`);
			}
			else {
				batch.pending++;
				bulkDownloads[downloadId] = batch;
			}
			resolve();
		});
	});
}

/**
 * Save every item of the post, in order. "Save As" is not used (one dialog per file would open),
 * and the format gets "-<imageindex>" when it would give every file the same name.
 */
async function downloadPost(setting: Setting, tabId: number, post: ResolvedPost): Promise<void> {
	const format = BulkFilenameFormat(setting.download_to!);
	const postDate = post.postTime !== undefined ? new Date(post.postTime) : undefined;
	const batch: BulkBatch = { tabId, total: post.items.length, failures: [], pending: 0, started: false };
	console.log("start post download: ");
	console.log(post);

	for (const item of post.items) {
		if (item.kind === 'failed') {
			batch.failures.push(item.reason);
			continue;
		}
		if (item.kind === 'photo') {
			const extension: Extension = item.extension === 'jpg' || item.extension === 'png' ? item.extension : await probeExtension(item.mediaId, undefined);
			const image = new ImageInfoImpl(post.userId, post.tweetId, item.index, item.mediaId, extension, format, postDate, post.displayName);
			await startDownload(batch, image.downloadUrl, image.filename);
			continue;
		}
		// the answer comes through the page world, which the page can see; accept only X's video server
		if (!isVideoUrl(item.url)) {
			console.warn(`TIL refused a video url: ${item.url}`);
			batch.failures.push(messageNotFound);
			continue;
		}
		const video = new VideoInfo(item.url, item.original, format, {
			userId: post.userId, tweetId: post.tweetId, index: item.index, displayName: post.displayName, postTime: post.postTime,
		});
		await startDownload(batch, video.downloadUrl, video.filename);
	}
	batch.started = true;
	finishBulkIfDone(batch);
}

function onClickBulk(tabId: number): void {
	loadSetting((setting: Setting) => {
		chrome.tabs.sendMessage(
			tabId,
			{ name: 'twitterBulkDL', includeVideo: ReadBulkIncludeVideo(setting) },
			(response: ResolvedPost | PostResolveFailure | null | undefined) => {
				if (chrome.runtime.lastError) {
					console.warn(`TIL send message failed: ${chrome.runtime.lastError.message}`);
					return;
				}
				console.log("TIL post response: ");
				console.log(response);
				if (response === null || response === undefined) {
					showToast(tabId, messagePostNotFound);
					return;
				}
				if (isPostResolveFailure(response)) {
					showToast(tabId, response.error);
					return;
				}
				downloadPost(setting, tabId, response).catch(e => {
					console.error(`TIL post download failed: ${e}`);
					showToast(tabId, `Could not download the media of this post (${e}).`);
				});
			}
		);
	});
}

chrome.downloads.onChanged.addListener((delta: chrome.downloads.DownloadDelta) => {
	const batch = bulkDownloads[delta.id];
	if (batch === undefined || delta.state === undefined) return;
	if (delta.state.current === 'in_progress') return;
	if (delta.state.current === 'interrupted') {
		const reason = delta.error !== undefined ? delta.error.current : 'interrupted';
		batch.failures.push(`A download was interrupted (${reason}).`);
	}
	delete bulkDownloads[delta.id];
	batch.pending--;
	finishBulkIfDone(batch);
});

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
	if (info.menuItemId === bulkMenuId) {
		onClickBulk(tabId);
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
