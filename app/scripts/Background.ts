import { ImageInfo, ImageInfoImpl, ImageInfoUnresolve, ResolvedMedia } from "./ImageInfo";
import { Extension, guessExtension, originalUrl } from "./Twimg";
import { Setting, CreateDefaultSetting, IsLatestDataVersion, MigrateSetting1to2 } from "./Setting";

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

/**
 * create context menu
 *  image : old client (img is right-clicked; srcUrl is reported)
 *  link  : new client x-web (an overlay <a href=".../photo/n"> covers the img; srcUrl is not reported)
 */
chrome.contextMenus.removeAll()
chrome.contextMenus.create({
	type: 'normal',
	id: menuId,
	title: 'Download Original Image',
	contexts: [
		'image',
		'link',
	],
	documentUrlPatterns: [
		'https://twitter.com/*',
		'https://pro.twitter.com/*',
		'https://x.com/*',
		'https://pro.x.com/*'
	],
	targetUrlPatterns: [
		'https://pbs.twimg.com/media/*',
		'https://twitter.com/*/status/*/photo/*',
		'https://pro.twitter.com/*/status/*/photo/*',
		'https://x.com/*/status/*/photo/*',
		'https://pro.x.com/*/status/*/photo/*',
	],
});

/**
 * on click context menu
 * ask the content script which image was clicked, then download
 */
chrome.contextMenus.onClicked.addListener((info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => {
	console.log(info);
	if (tab === null || tab === undefined || tab.id === undefined) return;
	if (info.menuItemId !== menuId) return;
	const tabId: number = tab.id;

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
