import moment, { Moment } from 'moment'
import { TagUserId, TagTweetId, TagImageIndex, TagOriginal, TagExtension, TagUserName } from "./Setting";
import { TagYear, TagMonth, TagDay, TagHour, TagMin, TagSec } from "./Setting";
import { TagPostYear, TagPostMonth, TagPostDay, TagPostHour, TagPostMin, TagPostSec } from "./Setting";

const twimgBase: string = 'https://pbs.twimg.com/media/';

/**
 * Url resolver
 */
class TwimgUrl {

	baseUrl: string = "";
	path: string = "";
	extension: "jpg" | "png" = "png";
	downloadUrl: string;

	constructor(srcUrl: string) {
		if (srcUrl.indexOf("?") > -1) {
			this.initializeForNewUrl(srcUrl);
		}
		else {
			this.initializeForOldUrl(srcUrl);
		}

		this.downloadUrl = `${this.baseUrl}?format=${this.extension}&name=orig`;
	}

	private initializeForNewUrl(srcUrl: string): void {
		this.baseUrl = srcUrl.split("?")[0];

		const queryParams: string = srcUrl.split("?")[1];
		queryParams.split("&").forEach(x => {
			if (x.lastIndexOf("format=", 0) === 0) {
				const ext = x.slice("format=".length)
				if (ext === "jpg" || ext === "jpeg" || ext === "webp") {
					this.extension = 'jpg';
				}
				else {
					this.extension = 'png';
				}
			}
		});

		this.path = this.baseUrl.slice(twimgBase.length);
		if (this.path.indexOf('.') > -1) {
			this.path = this.path.split('.')[0];
		}
	}

	private initializeForOldUrl(srcUrl: string): void {
		const suffix = srcUrl.slice(twimgBase.length);
		const split: string[] = suffix.split('.');
		let extension: string = split[split.length - 1].toLowerCase();
		const extensionSplit: string[] = extension.split(':');
		if (extensionSplit.length >= 2) {
			extension = extensionSplit[0];
		}
		this.path = split[0];
		this.baseUrl = twimgBase + this.path;

		if (extension === "jpg" || extension === "jpeg" || extension === "webp") {
			this.extension = 'jpg';
		}
		else {
			this.extension = 'png';
		}
	}
}

export interface ImageInfo {
	readonly downloadUrl: string;
	readonly filename: string;
}

export class ImageInfoImpl implements ImageInfo {
	private username: string;
	private tweetId: string;
	private imageIndex: number;
	private twimgUrl: TwimgUrl;
	private dateTime: Moment;
	private postDate: Date | undefined;
	private userDisplay: string;

	public readonly filename: string;
	public readonly downloadUrl: string;

	private static removeUnsupportedChar(src: string): string{
		return src.trim().replace(/[\\\/#:,*?"|]/g, '');
	}

	constructor(username: string, tweetId: string, imageIndex: number, srcUrl: string, format: string, postDate: Date | undefined, userDisplay: string | undefined) {
		//  parse query parameter (twimg.com)
		// console.log(srcUrl);

		this.username = username;
		this.tweetId = tweetId;
		this.imageIndex = imageIndex;
		this.twimgUrl = new TwimgUrl(srcUrl);
		this.dateTime = moment();
		this.postDate = postDate;
		this.userDisplay = userDisplay === undefined ? username : ImageInfoImpl.removeUnsupportedChar(userDisplay);

		this.downloadUrl = this.twimgUrl.downloadUrl;
		console.log(`downloadUrl : ${this.downloadUrl}`);

		this.filename = this.createFileName(format);
	}

	createFileName(format: string): string{
		let filename = format
		filename = filename.replace(TagYear, String(this.dateTime.format('YYYY')));
		filename = filename.replace(TagMonth, String(this.dateTime.format('MM')));
		filename = filename.replace(TagDay, String(this.dateTime.format('DD')));
		filename = filename.replace(TagHour, String(this.dateTime.format('HH')));
		filename = filename.replace(TagMin, String(this.dateTime.format('mm')));
		filename = filename.replace(TagSec, String(this.dateTime.format('ss')));
		filename = filename.replace(TagUserId, this.username);
		filename = filename.replace(TagUserName, this.userDisplay);
		filename = filename.replace(TagTweetId, this.tweetId);
		filename = filename.replace(TagImageIndex, this.imageIndex.toString());
		filename = filename.replace(TagOriginal, this.twimgUrl.path)
		filename = filename.replace(TagExtension, this.twimgUrl.extension);
		if(this.postDate !== undefined){
			filename = filename.replace(TagPostYear, this.postDate.getFullYear().toString());
			filename = filename.replace(TagPostMonth, (this.postDate.getMonth() + 1).toString().padStart(2, '0'));
			filename = filename.replace(TagPostDay, this.postDate.getDate().toString().padStart(2, '0'));
			filename = filename.replace(TagPostHour, this.postDate.getHours().toString().padStart(2, '0'));
			filename = filename.replace(TagPostMin, this.postDate.getMinutes().toString().padStart(2, '0'));
			filename = filename.replace(TagPostSec, this.postDate.getSeconds().toString().padStart(2, '0'));
		}
		else{
			filename = filename.replace(TagPostYear, '');
			filename = filename.replace(TagPostMonth, '');
			filename = filename.replace(TagPostDay, '');
			filename = filename.replace(TagPostHour, '');
			filename = filename.replace(TagPostMin, '');
			filename = filename.replace(TagPostSec, '');
		}
		return filename;
	}
}

/**
 * error case
 */
export class ImageInfoUnresolve implements ImageInfo {
	public readonly downloadUrl: string;
	public readonly filename: string;
	private twimgUrl: TwimgUrl;

	constructor(srcUrl: string) {
		this.twimgUrl = new TwimgUrl(srcUrl);

		this.downloadUrl = this.twimgUrl.downloadUrl;
		console.log("downloadUrl : " + this.downloadUrl);

		this.filename = `TID-unknown-${this.twimgUrl.path}.${this.twimgUrl.extension}`;
	}
	
}