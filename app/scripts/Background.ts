import { ImageInfo } from "./ImageInfo";
import { Setting, CreateDefaultSetting, IsLatestDataVersion, MigrateSetting1to2 } from "./Setting";

function doDownload(setting: Setting, image: ImageInfo){
	chrome.downloads.download({
		url: image.downloadUrl,
		filename: image.filename,
		saveAs: setting.open_save_as,
	});
}

function downloadImage(image: ImageInfo): void {
	console.log("start download: ");
	console.log(image);
	chrome.storage.local.get((items) => {
		let setting: Setting = (items.download_to === undefined || items.download_to === null) ?
			CreateDefaultSetting() : (items as Setting);

		if(!IsLatestDataVersion(setting)){
			setting = MigrateSetting1to2(setting);

			chrome.storage.local.set(setting, () =>{
				doDownload(setting, image);
				console.log("TIL-Migration done.");
			});
		}
		else{
			doDownload(setting, image);
		}
	})
}

/**
 * create context menu
 */
chrome.contextMenus.removeAll()
chrome.contextMenus.create({
	type: 'normal',
	id: 'downloadTwitterImage',
	title: 'Download Original Image',
	contexts: [
		'image'
	],
	documentUrlPatterns: [
		'https://twitter.com/*',
		'https://pro.twitter.com/*'
	],
	targetUrlPatterns: [
		'https://pbs.twimg.com/media/*'
	],
});

const sendMessage: (name: string, pageUrl: string, format: string, tabId?: number, srcUrl?: string) => void =
(name: string, pageUrl: string, format: string, tabId?: number, srcUrl?: string) =>
{
	chrome.tabs.sendMessage(
		tabId === undefined ? 0 : tabId,
		{ name: name, srcUrl: srcUrl, pageUrl: pageUrl, format: format},
		(response: ImageInfo | null) => {
			console.log("TIL send message response: ");
			console.log(response);

			if (response === null) alert('The selected link is not a Twitter image.');
			//  event page -> current page
			else downloadImage(response);
		}
	)
}

/**
 * on click context menu
 * send message to event page script
 */
chrome.contextMenus.onClicked.addListener((info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => {
	console.log(info);
	if (tab === null || tab === undefined) return;
	let name: string = 'twitterImageDL';
	if (info.menuItemId === 'downloadTwitterImage') {
		name = 'twitterImageDL';
	}
	chrome.storage.local.get((items: any) => {
		let setting: Setting = (items.download_to === undefined || items.download_to === null) ?
			CreateDefaultSetting() : (items as Setting);

		if(!IsLatestDataVersion(setting)){
			setting = MigrateSetting1to2(setting);

			chrome.storage.local.set(setting, () =>{
				console.log("TIL-Migration done.");
				sendMessage(name, info.pageUrl, setting.download_to!, tab.id, info.srcUrl);
			});
		}
		else{
			sendMessage(name, info.pageUrl, setting.download_to!, tab.id, info.srcUrl);
		}
	});
});