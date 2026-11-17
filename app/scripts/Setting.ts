const LatestDataVersion: number = 2;

export const TagYear: string = "<year>";
export const TagMonth: string = "<month>";
export const TagDay: string = "<day>";
export const TagHour: string = "<dlh>";
export const TagMin: string = "<dlm>";
export const TagSec: string = "<dls>";
export const TagPostYear: string = "<postyear>"
export const TagPostMonth: string = "<postmonth>"
export const TagPostDay: string = "<postday>"
export const TagPostHour: string = "<posthour>"
export const TagPostMin: string = "<postmin>"
export const TagPostSec: string = "<postsec>"
export const TagUserId: string = "<userid>";
export const TagUserName: string = "<username>"
export const TagTweetId: string = "<tweetid>";
export const TagImageIndex: string = "<imageindex>";
export const TagOriginal: string = "<original>"
export const TagExtension: string = "<ext>";

export const DefaultFilename: string = `${TagYear}-${TagMonth}/${TagUserId}-${TagTweetId}-${TagImageIndex}.${TagExtension}`;

/** Shift + right click on an image opens the browser's context menu instead of X's own menu */
export const DefaultShiftNativeMenu: boolean = true;
/** Right click on an image always opens the browser's context menu instead of X's own menu */
export const DefaultOverrideContextMenu: boolean = false;
/** Download videos and GIFs, and all media in a post (beta). Off by default. */
export const DefaultVideoBeta: boolean = false;
/** "Download All Media in Post" (beta) also saves videos and GIFs. On by default. */
export const DefaultBulkIncludeVideo: boolean = true;

/**
 * storage.local key written by the background when the browser cannot run the page-world
 * (MAIN world) script that video download needs. The value is the reason (for logs / options page).
 */
export const VideoBetaUnsupportedKey: string = 'video_beta_unsupported';

export const CreateDefaultSetting: () => Setting = () => {
	return {
		download_to: `Twitter/${DefaultFilename}`,
		open_save_as: false,
		shift_native_menu: DefaultShiftNativeMenu,
		override_context_menu: DefaultOverrideContextMenu,
		video_beta: DefaultVideoBeta,
		bulk_include_video: DefaultBulkIncludeVideo,
		data_version: LatestDataVersion,
	}
};

export const MigrateSetting1to2: (old: Setting) => Setting = (old: Setting) =>{
	const download_to = old.download_to!.length === 0 ?
		`${DefaultFilename}` :
		`${old.download_to}/${DefaultFilename}`;

	return {
		download_to: download_to,
		open_save_as: old.open_save_as,
		data_version: LatestDataVersion,
	}
}

export const IsLatestDataVersion: (setting: Setting) => boolean = (setting: Setting) =>{
	return setting.data_version === LatestDataVersion;
}

export interface Setting {
	download_to?: string;
	open_save_as?: boolean;
	/** added after data_version 2; undefined means the default */
	shift_native_menu?: boolean;
	/** added after data_version 2; undefined means the default */
	override_context_menu?: boolean;
	/** added after data_version 2; undefined means the default (off) */
	video_beta?: boolean;
	/** added after data_version 2; undefined means the default (on) */
	bulk_include_video?: boolean;
	data_version?: number;
}

export interface ContextMenuSetting {
	shiftNativeMenu: boolean;
	overrideContextMenu: boolean;
}

export const ReadContextMenuSetting: (setting: Setting) => ContextMenuSetting = (setting: Setting) =>{
	return {
		shiftNativeMenu: typeof setting.shift_native_menu === 'boolean' ? setting.shift_native_menu : DefaultShiftNativeMenu,
		overrideContextMenu: typeof setting.override_context_menu === 'boolean' ? setting.override_context_menu : DefaultOverrideContextMenu,
	}
}

export const ReadVideoBeta: (setting: Setting) => boolean = (setting: Setting) =>{
	return typeof setting.video_beta === 'boolean' ? setting.video_beta : DefaultVideoBeta;
}

export const ReadBulkIncludeVideo: (setting: Setting) => boolean = (setting: Setting) =>{
	return typeof setting.bulk_include_video === 'boolean' ? setting.bulk_include_video : DefaultBulkIncludeVideo;
}

/**
 * "Download All Media in Post" (beta): the files of a post must not share a name, so when the format
 * has neither <imageindex> nor <original>, "-<imageindex>" is put before ".<ext>" (or at the end).
 */
export const BulkFilenameFormat: (format: string) => string = (format: string) =>{
	if (format.indexOf(TagImageIndex) >= 0 || format.indexOf(TagOriginal) >= 0) return format;
	const ext = `.${TagExtension}`;
	const at = format.lastIndexOf(ext);
	if (at < 0) return `${format}-${TagImageIndex}`;
	return `${format.slice(0, at)}-${TagImageIndex}${format.slice(at)}`;
}
