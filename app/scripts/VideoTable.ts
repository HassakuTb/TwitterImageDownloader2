/**
 * Media with video seen in X's tweet data, looked up by what the page shows (VideoKeys).
 * Lives in the page-world script. Bounded: the oldest media are dropped first.
 */
import { VideoKeys, VideoMedia, mp4NameOf } from "./VideoMedia";

const maxMedia: number = 3000;

function merge(a: VideoMedia, b: VideoMedia): VideoMedia {
	return {
		type: b.type !== undefined ? b.type : a.type,
		idStr: b.idStr !== undefined ? b.idStr : a.idStr,
		posterKey: b.posterKey !== undefined ? b.posterKey : a.posterKey,
		expandedUrl: b.expandedUrl !== undefined ? b.expandedUrl : a.expandedUrl,
		variants: b.variants.length >= a.variants.length ? b.variants : a.variants,
	};
}

function keysOf(media: VideoMedia): string[] {
	const keys: string[] = [];
	if (media.posterKey !== undefined) keys.push(`p:${media.posterKey}`);
	if (media.idStr !== undefined) keys.push(`i:${media.idStr}`);
	media.variants.forEach(v => {
		const name = mp4NameOf(v.url);
		if (name !== undefined) keys.push(`m:${name}`);
	});
	return keys;
}

export class VideoTable {
	/** key -> slot number; slot -> media */
	private index: Map<string, number> = new Map();
	private slots: Map<number, VideoMedia> = new Map();
	private nextSlot: number = 0;

	public get size(): number {
		return this.slots.size;
	}

	public add(media: VideoMedia): void {
		const keys = keysOf(media);
		let slot: number | undefined = undefined;
		for (const key of keys) {
			const s = this.index.get(key);
			if (s !== undefined && this.slots.has(s)) {
				slot = s;
				break;
			}
		}
		if (slot !== undefined) {
			const merged = merge(this.slots.get(slot)!, media);
			// move to the newest position
			this.slots.delete(slot);
			this.slots.set(slot, merged);
			keysOf(merged).forEach(k => this.index.set(k, slot!));
			return;
		}

		const newSlot = this.nextSlot++;
		this.slots.set(newSlot, media);
		keys.forEach(k => this.index.set(k, newSlot));
		this.evict();
	}

	public find(keys: VideoKeys): VideoMedia | undefined {
		const candidates: string[] = [];
		keys.posterKeys.forEach(k => candidates.push(`p:${k}`));
		keys.numericIds.forEach(k => candidates.push(`i:${k}`));
		keys.mp4Urls.forEach(url => {
			const name = mp4NameOf(url);
			if (name !== undefined) candidates.push(`m:${name}`);
		});
		for (const key of candidates) {
			const slot = this.index.get(key);
			const media = slot !== undefined ? this.slots.get(slot) : undefined;
			if (media !== undefined) return media;
		}
		return undefined;
	}

	private evict(): void {
		while (this.slots.size > maxMedia) {
			const oldest = this.slots.keys().next().value as number;
			const media = this.slots.get(oldest)!;
			this.slots.delete(oldest);
			keysOf(media).forEach(k => {
				if (this.index.get(k) === oldest) this.index.delete(k);
			});
		}
	}
}
