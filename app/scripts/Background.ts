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
chrome.runtime.onInstalled.addListener(() => {
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
    chrome.contextMenus.create({
        type : 'normal',
        id : 'downloadTwitterImageLink',
        title : 'download original image',
        contexts: [
            'image'
        ],
        documentUrlPatterns: [
            'https://tweetdeck.twitter.com/*'
        ],
        targetUrlPatterns: [
            'https://pbs.twimg.com/media/*'
        ],
    });
});

/**
 * on click context menu
 * send message to event page script
 */
chrome.contextMenus.onClicked.addListener((info : chrome.contextMenus.OnClickData, tab? : chrome.tabs.Tab) =>{
    console.log(info);
    if(tab === null || tab === undefined) return;
    let name :string = 'twitterImageDL';
    if(info.menuItemId === 'downloadTwitterImage'){
        name = 'twitterImageDL';
    }
    else if(info.menuItemId === 'downloadTwitterImageLink'){
        name = 'twitterImageDLLink';
    }
    chrome.tabs.sendMessage(
        tab.id === undefined ? 0 : tab.id,
        {name : name, srcUrl: info.srcUrl, pageUrl: info.pageUrl},
        (response : ImageInfo | null) =>{
            console.log(response);

            if(response === null) alert('Selected link is not twitter image.');
            //  event page -> current page
            else downloadImage(response);
        }
    )
});