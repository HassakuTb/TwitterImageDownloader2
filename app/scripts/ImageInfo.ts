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
        this.baseUrl =srcUrl.split("?")[0];
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
        let url : string = this.baseUrl;
        url += "?";
        for(const key in queryParamsKVS){
            url += `${key}=${queryParamsKVS[key]}`
        }
        this.downloadUrl = url;

        //  construction filename
        this.filename = `${this.username}-${this.tweetId}-${this.imageIndex}.${this.extension}`;
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

        const prefix : string = baseUrl.slice('https://pbs.twimg.com/media/'.length);

        //  construction filename
        this.filename = `TID-unknown-${prefix}.${this.extension}`;
    }
}