export interface Setting{
    readonly download_to : string;
    readonly open_save_as : false;
}

export class LocalStorageSetting implements Setting{
    public readonly download_to : string;
    public readonly open_save_as : false;

    constructor(localStorage : any){
        this.download_to = localStorage.download_to ? localStorage.download_to : 'TwitterImageDLer';
        this.open_save_as = localStorage.open_save_as ? localStorage.open_save_as : false;
    }
}