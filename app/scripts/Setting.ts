const LatestDataVersion: number = 2;

export const TagYear: string = "<year>";
export const TagMonth: string = "<month>";
export const TagDay: string = "<day>";
export const TagPostYear: string = "<postyear>"
export const TagPostMonth: string = "<postmonth>"
export const TagPostDay: string = "<postday>"
export const TagUserId: string = "<userid>";
export const TagTweetId: string = "<tweetid>";
export const TagImageIndex: string = "<imageindex>";
export const TagOriginal: string = "<original>"
export const TagExtension: string = "<ext>";

export const DefaultFilename: string = `${TagYear}-${TagMonth}/${TagUserId}-${TagTweetId}-${TagImageIndex}.${TagExtension}`;

export const CreateDefaultSetting: () => Setting = () => {
	return {
		download_to: `Twitter/${DefaultFilename}`,
		open_save_as: false,
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
	data_version?: number;
}