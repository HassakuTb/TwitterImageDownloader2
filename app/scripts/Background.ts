import { ImageInfo } from "./ImageInfo";
import { LocalStorageSetting, Setting } from "./Setting";

function downloadImage(image: ImageInfo) : void{
    chrome.storage.local.get((items) =>{
        const setting : Setting = new LocalStorageSetting(items);
        const useDirectory : boolean = setting.download_to.length > 0;

        chrome.downloads.download({
            url : image.downloadUrl,
            filename : useDirectory ? setting.download_to + '/' + image.filename : image.filename,
            saveAs : setting.open_save_as,
        });
    })
}

/**
 * create context menu
 */
chrome.contextMenus.create({
    type : 'normal',
    id : 'downloadTwitterImage',
    title : 'download original image',
    contexts: [
        'image'
    ],
    documentUrlPatterns: [
        'https://twitter.com/*'
    ],
    targetUrlPatterns: [
        'https://pbs.twimg.com/media/*'
    ],
});

/**
 * on click context menu
 * send message to event page script
 */
chrome.contextMenus.onClicked.addListener((info : chrome.contextMenus.OnClickData, tab? : chrome.tabs.Tab) =>{
    console.log(info);
    if(tab === null || tab === undefined) return;
    chrome.tabs.sendMessage(
        tab.id === undefined ? 0 : tab.id,
        {name : 'twitterImageDL', srcUrl: info.srcUrl, pageUrl: info.pageUrl},
        (response : ImageInfo) =>{
            console.log(response);
            //  event page -> current page
            downloadImage(response);
        }
    )
});