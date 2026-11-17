/**
 * pbs.twimg.com/media url helpers (no dependencies; shared by content script and background)
 */
export const twimgBase: string = 'https://pbs.twimg.com/media/';

export type Extension = "jpg" | "png";

export interface TwimgMedia {
	readonly mediaId: string;
	readonly format?: string;
}

/**
 * Parse a pbs.twimg.com/media url.
 *  new style: https://pbs.twimg.com/media/<id>?format=jpg&name=small
 *  old style: https://pbs.twimg.com/media/<id>.jpg:large
 */
export function parseTwimgUrl(srcUrl: string): TwimgMedia | undefined {
	if (srcUrl.lastIndexOf(twimgBase, 0) !== 0) return undefined;

	const [base, query] = srcUrl.split("?");
	const file = base.slice(twimgBase.length).split('/')[0];
	const mediaId = file.split('.')[0];
	if (mediaId.length === 0) return undefined;

	let format: string | undefined = undefined;
	if (query !== undefined) {
		query.split("&").forEach(x => {
			if (x.lastIndexOf("format=", 0) === 0) format = x.slice("format=".length);
		});
	}
	else if (file.indexOf('.') > -1) {
		format = file.split('.')[1].split(':')[0].toLowerCase();
	}
	return { mediaId, format };
}

/**
 * Extension guessed from the src format (behavior before probing was introduced).
 */
export function guessExtension(format: string | undefined): Extension {
	return (format === "jpg" || format === "jpeg" || format === "webp") ? 'jpg' : 'png';
}

export function originalUrl(mediaId: string, extension: Extension): string {
	return `${twimgBase}${mediaId}?format=${extension}&name=orig`;
}
