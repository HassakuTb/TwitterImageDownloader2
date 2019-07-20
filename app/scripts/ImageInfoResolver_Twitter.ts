import { ImageInfo, ImageInfoUnresolve, ImageInfoImpl } from "./ImageInfo";

interface ImageInfoResolver{
    resolveImageInfo(srcUrl : string) : ImageInfo;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) =>{
    console.log(request);
    if(request.name === 'twitterImageDL'){
        const resolver : ImageInfoResolver = ResolverSelector.getResolver(request.srcUrl, request.pageUrl);
        const image : ImageInfo = resolver.resolveImageInfo(request.srcUrl);
        sendResponse(image);
    }
    return true;    //  sync
});

class ResolverSelector{
    public static getResolver(srcUrl : string, pageUrl : string) : ImageInfoResolver{
        const targets : JQuery = $(`img[src*="${srcUrl}"]`);

        if(pageUrl.lastIndexOf("https://twitter.com", 0) === 0){
            if(targets.closest('article').length > 0){
                console.log("TIL use resolver for new twitter");
                return new Resolever_TwitterNew(targets);
            }
            else{
                console.log("TIL use resolver for old twitter");
                return new Resolver_TwitterOld(targets);
            }
        }
        else if(pageUrl.lastIndexOf("https://tweetdeck.twitter.com", 0) === 0){
            console.log("TIL use resolver for tweetdeck");
            return new Resolver_Deck();
        }
        else{
            console.log("TIL use resolver for unknown");
            return new Resolver_Unknown();
        }
    }
}

/**
 * Resolver (unknown)
 */
class Resolver_Unknown implements ImageInfoResolver{
    public resolveImageInfo(srcUrl : string) : ImageInfo{
        return new ImageInfoUnresolve(srcUrl);
    }
}

/**
 * Resolver (tweetdeck.twitter.com)
 */
class Resolver_Deck implements ImageInfoResolver{
    public resolveImageInfo(srcUrl : string) : ImageInfo{
        return new ImageInfoUnresolve(srcUrl);
    }
}

/**
 * Resolver (twitter.com new UI)
 */
class Resolever_TwitterNew implements ImageInfoResolver{

    private targets : JQuery;

    constructor(targets : JQuery){
        this.targets = targets;
    }

    public resolveImageInfo(srcUrl : string) : ImageInfo{
        const targetImage : JQuery = this.targets.first();
        const link : string | undefined = targetImage.closest('a').attr('href');
        console.log("TIL target link : " + link);

        if(link === undefined) return new ImageInfoUnresolve(srcUrl);

        const linkSplit : string[] = link.split('/');
        const username : string = linkSplit[1];
        const tweetId : string = linkSplit[3];
        const imageIndex : number = parseInt(linkSplit[5], 10) - 1;

        return new ImageInfoImpl(username, tweetId, imageIndex, srcUrl);
    }
}

/**
 * Resolver (twitter.com old UI)
 */
class Resolver_TwitterOld implements ImageInfoResolver{

    private targets : JQuery;

    constructor(targets : JQuery){
        this.targets = targets;
    }

    public resolveImageInfo(srcUrl : string) : ImageInfo{
        const images = this.targets;

        let isAdaptiveImage = false;
        let targetImage = images.first();
        let i, len;
        for(i = 0, len = images.length; i < len; ++i){
            var target = images.eq(i);
            if(target.closest('.AdaptiveMedia-container').length > 0){
                isAdaptiveImage = true;
                targetImage = target;
                break;
            }
        }

        if(isAdaptiveImage){
            return this.getInfoFromTimeline(targetImage, srcUrl);
        }
        else if(targetImage.parent('.Gallery-media').length > 0){
            return this.getInfoFromGallery(targetImage, srcUrl);
        }
        else if(targetImage.parent('.QuoteMedia-photoContainer').length > 0){
            return this.getinfoFromNotification(targetImage, srcUrl);
        }
        else if(targetImage.hasClass('MomentMediaItem-entity')){
            return this.getInfoFromMoment(targetImage, srcUrl);
        }
        else{
            return new ImageInfoUnresolve(srcUrl);
        }
    }


    //  download from single gallery
    //  param image : jquery object <img>
    //  param srcUrl : twimg url
    private getInfoFromGallery(image : JQuery, srcUrl : string) : ImageInfo{
        console.log("download from gallery")
    
        const imageIndex = 0; //  in gallery, always single image
        const username = image.parent().siblings().find('[data-screen-name]').attr('data-screen-name');
        const tweetId = image.parent().siblings().find('[data-item-id]').attr('data-item-id');

        if(username === undefined || username === null){
            return new ImageInfoUnresolve(srcUrl);
        }
        if(tweetId === undefined || username === null){
            return new ImageInfoUnresolve(srcUrl);
        }
    
        return new ImageInfoImpl(username, tweetId, imageIndex, srcUrl);
    }
    
    //  download from timeline of tweet detail
    //  param image : jquery object <img>
    //  param srcUrl : twimg url
    private getInfoFromTimeline(image : JQuery, srcUrl : string) : ImageInfo{
        console.log("download from timeline")
    
        const mediaContainer = image.closest('.AdaptiveMedia-container');
        //  in notification, there is only single image
        let imageIndex = 0;
        mediaContainer.find('[data-image-url]').each(function(index, element){
            if($(element).attr('data-image-url') === srcUrl){
                imageIndex = index;
            }
        });
    
        const username = image.closest(`[data-screen-name]`).attr('data-screen-name');
        const tweetId = image.closest(`[data-item-id]`).attr('data-item-id');

        if(username === undefined || username === null){
            return new ImageInfoUnresolve(srcUrl);
        }
        if(tweetId === undefined || username === null){
            return new ImageInfoUnresolve(srcUrl);
        }
    
        return new ImageInfoImpl(username, tweetId, imageIndex, srcUrl);
    }
    
    //  download from notification and quote
    //  param image : jquery object <img>
    //  param srcUrl : twimg url
    private getinfoFromNotification(image : JQuery, srcUrl : string) : ImageInfo{
        console.log("download from quote")
    
        const imageIndex = 0; //  in notification, always single image
        let username = image.closest(`[data-screen-name]`).attr('data-screen-name');
        let tweetId = image.closest(`[data-item-id]`).attr('data-item-id');

        if(username === undefined || username === null){
            return new ImageInfoUnresolve(srcUrl);
        }
        if(tweetId === undefined || username === null){
            return new ImageInfoUnresolve(srcUrl);
        }
    
        return new ImageInfoImpl(username, tweetId, imageIndex, srcUrl);
    }
    
    //  download from moment cover
    //  moment contents is not image
    //  param image : jquery object <img>
    //  param srcUrl : twimg url
    private getInfoFromMoment(image : JQuery, srcUrl : string) : ImageInfo{
        console.log("download from moment cover")
    
        const coverContainer = image.closest('.MomentCapsuleCover-media');
        const username = coverContainer.find('[data-screen-name]').attr('data-screen-name');
        const tweetId = coverContainer.find('[data-tweet-id]').attr('data-tweet-id');
    
        const imageIndex = null; //  cover image is not certain index

        if(username === undefined || username === null){
            return new ImageInfoUnresolve(srcUrl);
        }
        if(tweetId === undefined || username === null){
            return new ImageInfoUnresolve(srcUrl);
        }
    
        return new ImageInfoImpl(username, tweetId, imageIndex, srcUrl);
    }
}