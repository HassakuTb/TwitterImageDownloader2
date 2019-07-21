export interface Setting{
    readonly download_to : string;
    readonly open_save_as : false;
}

export class LocalStorageSetting implements Setting{
    public readonly download_to : string;
    public readonly open_save_as : false;

    constructor(localStorage : any){
        this.download_to = localStorage.download_to !== null && localStorage.download_to !== undefined ? localStorage.download_to : 'TwitterImageDLer';
        this.open_save_as = localStorage.open_save_as !== null && localStorage.open_save_as !== undefined ? localStorage.open_save_as : false;
    }
}