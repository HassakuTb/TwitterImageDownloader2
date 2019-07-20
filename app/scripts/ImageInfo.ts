const twimgBase : string = 'https://pbs.twimg.com/media/';

/**
 * Url resolver
 */
class TwimgUrl{

    baseUrl : string = "";
    path : string = "";
    extension : "jpg" | "png" = "png";
    downloadUrl : string;

    constructor(srcUrl : string){
        if(srcUrl.indexOf("?") > -1){
            this.initializeForNewUrl(srcUrl);
        }
        else{
            this.initializeForOldUrl(srcUrl);
        }
        
        this.downloadUrl = `${this.baseUrl}?format=${this.extension}&name=orig`;
    }

    private initializeForNewUrl(srcUrl : string) : void{
        this.baseUrl =srcUrl.split("?")[0];

        const queryParams : string = srcUrl.split("?")[1];
        queryParams.split("&").forEach(x =>{
            if(x.lastIndexOf("format=", 0) === 0){
                const ext = x.slice("format=".length)
                if(ext === "jpg" || ext === "jpeg"){
                    this.extension = 'jpg';
                }
                else{
                    this.extension = 'png';
                }
            }
        });

        this.path = this.baseUrl.slice(twimgBase.length);
    }

    private initializeForOldUrl(srcUrl : string) : void{
        const suffix = srcUrl.slice(twimgBase.length);
        const split : string[] = suffix.split('.');
        let extension : string = split[split.length - 1].toLowerCase();
        const extensionSplit : string[] = extension.split(':');
        if(extensionSplit.length >= 2){
            extension = extensionSplit[0];
        }
        this.path = split[0];
        this.baseUrl = twimgBase + this.path;

        if(extension === "jpg" || extension === "jpeg"){
            this.extension = 'jpg';
        }
        else{
            this.extension = 'png';
        }
    }
}

export interface ImageInfo{
    readonly downloadUrl : string;
    readonly filename : string;
}

export class ImageInfoImpl implements ImageInfo {
    private username : string;
    private tweetId : string;
    private imageIndex : number | null;
    private twimgUrl : TwimgUrl;

    public readonly downloadUrl : string;
    public readonly filename : string;

    constructor(username : string, tweetId : string, imageIndex : number | null, srcUrl : string){
        //  parse query parameter (twimg.com)
        console.log(srcUrl);

        this.username = username;
        this.tweetId = tweetId;
        this.imageIndex = imageIndex;
        this.twimgUrl = new TwimgUrl(srcUrl);

        this.downloadUrl = this.twimgUrl.downloadUrl;
        console.log("downloadUrl : " + this.downloadUrl);

        //  construction filename
        this.filename = `${this.username}-${this.tweetId}-${this.imageIndex}.${this.twimgUrl.extension}`;
        console.log("filename : " + this.filename);
    }
}

/**
 * error case
 */
export class ImageInfoUnresolve implements ImageInfo{
    public readonly downloadUrl : string;
    public readonly filename : string;
    private twimgUrl : TwimgUrl;

    constructor(srcUrl : string){
        this.twimgUrl = new TwimgUrl(srcUrl);

        this.downloadUrl = this.twimgUrl.downloadUrl;
        console.log("downloadUrl : " + this.downloadUrl);

        //  construction filename
        this.filename = `TID-unknown-${this.twimgUrl.path}.${this.twimgUrl.extension}`;
        console.log("filename : " + this.filename);
    }
}