const twimgBase : string = 'https://pbs.twimg.com/media/';

export interface ImageInfo{
    readonly downloadUrl : string;
    readonly filename : string;
}

export class ImageInfoImpl implements ImageInfo {
    private username : string;
    private tweetId : string;
    private imageIndex : number | null;
    private extension : 'jpg' | 'png';
    private baseUrl : string;

    public readonly downloadUrl : string;
    public readonly filename : string;

    constructor(username : string, tweetId : string, imageIndex : number | null, srcUrl : string){
        this.username = username;
        this.tweetId = tweetId;
        this.imageIndex = imageIndex;

        //  parse query parameter (twimg.com)
        console.log(srcUrl);

        let queryParamsKVS : {[param : string] : string} = {};

        //  new twimg url
        if(srcUrl.indexOf("?") > -1){
            this.baseUrl =srcUrl.split("?")[0];
            const queryParams : string = srcUrl.split("?")[1];
            for(const q in queryParams.split("&")){
                const kvs : string[] = q.split("=");
                queryParamsKVS[kvs[0]] = kvs[1];
            }
    
            //  select extension
            if("format" in queryParamsKVS){
                if(queryParamsKVS["format"] === "jpg" || queryParamsKVS["format"] === "jpeg"){
                    this.extension = 'jpg';
                }
                else{
                    this.extension = 'png';
                }
            }
            else{
                this.extension = 'png';
            }
        }
        //  old twimg url
        else{
            const suffix = srcUrl.slice(twimgBase.length);
            const split : string[] = srcUrl.split('.');
            let extension : string = split[split.length - 1].toLowerCase();
            const extensionSplit : string[] = extension.split(':');
            if(extensionSplit.length >= 2){
                extension = extensionSplit[0];
            }
            this.baseUrl = twimgBase + suffix.split(".")[0];

            if(extension === "jpg" || extension === "jpeg"){
                this.extension = 'jpg';
            }
            else{
                this.extension = 'png';
            }
            queryParamsKVS["format"] = this.extension;
        }
    
        //  construction download src url
        queryParamsKVS["name"] = "orig";
        let url : string = this.baseUrl;
        url += "?";
        let i: number = 0;
        const keyCount = Object.keys(queryParamsKVS).length;
        for(const key in queryParamsKVS){
            url += `${key}=${queryParamsKVS[key]}`
            if(i < keyCount - 1) url +='&';
            i ++;
        }
        this.downloadUrl = url;
        console.log("downloadUrl : " + this.downloadUrl);

        //  construction filename
        this.filename = `${this.username}-${this.tweetId}-${this.imageIndex}.${this.extension}`;
        console.log("filename : " + this.filename);
    }
}

/**
 * error case
 */
export class ImageInfoUnresolve implements ImageInfo{
    public readonly downloadUrl : string;
    public readonly filename : string;
    private extension : 'jpg' | 'png';

    constructor(srcUrl : string){
        //  parse query parameter (twimg.com)
        const baseUrl =srcUrl.split("?")[0];
        const queryParams : string = srcUrl.split("?")[1];
        var queryParamsKVS : {[param : string] : string} = {};
        for(const q in queryParams.split("&")){
            const kvs : string[] = q.split("=");
            queryParamsKVS[kvs[0]] = kvs[1];
        }

        //  select extension
        if("format" in queryParamsKVS){
            if(queryParamsKVS["format"] === "jpg" || queryParamsKVS["format"] === "jpeg"){
                this.extension = 'jpg';
            }
            else{
                this.extension = 'png';
            }
        }
        else{
            this.extension = 'png';
        }

        //  construction download src url
        queryParamsKVS["name"] = "orig";
        let url : string = baseUrl;
        url += "?";
        for(const key in queryParamsKVS){
            url += `${key}=${queryParamsKVS[key]}`
        }
        this.downloadUrl = url;

        const suffix : string = baseUrl.slice(twimgBase.length);

        //  construction filename
        this.filename = `TID-unknown-${suffix}.${this.extension}`;
    }
}