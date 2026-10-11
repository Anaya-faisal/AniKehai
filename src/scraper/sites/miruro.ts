import type { AnimeSite } from "../../shared/types";
import { getStandardVideoStats } from "../parser";

// AniList cover thumbnails in the player header; `alt` holds the clean show title
const COVER_SELECTOR =
	'img[src*="anilistcdn/media/anime/cover"][alt]:not([alt=""])';
const EPISODE_LABEL_REGEX = /^Episode\s+(\S+)$/i;
const EPISODE_NUMBER_REGEX = /^\d+(\.\d+)?$/;

// The player header is <h1>Episode name</h1><p>Episode N</p>
const getEpisodeInfo = (): { episode: string; name: string | null } | null => {
	for (const h1 of document.querySelectorAll("h1")) {
		const match = h1.nextElementSibling?.textContent
			?.trim()
			.match(EPISODE_LABEL_REGEX);
		if (match) {
			return {
				episode: `Episode ${match[1]}`,
				name: h1.textContent?.trim() || null,
			};
		}
	}
	return null;
};

export const miruroStrategy: AnimeSite = {
	domains: [
		"www.miruro.tv",
		"www.miruro.to",
		"www.miruro.cx",
		"www.miruro.bz",
		"barelystarted.miruro.tv",
	],
	iframe_src: ["strm.cx"],

	getAnimeMetadata: () => {
		// Only report activity on watch pages (not /, /info/..., ...)
		if (!window.location.pathname.startsWith("/watch/")) {
			return { title: null, episode: null, coverUrl: null };
		}

		const cover = document.querySelector<HTMLImageElement>(COVER_SELECTOR);
		const info = getEpisodeInfo();

		// Fallback: the ?ep= query param holds the episode number
		const epParam = new URLSearchParams(window.location.search).get("ep");
		const episode =
			info?.episode ??
			(epParam && EPISODE_NUMBER_REGEX.test(epParam)
				? `Episode ${epParam}`
				: null);

		return {
			title: cover?.alt.trim() || null,
			episode,
			// Skip names that just repeat "Episode N"
			episodeName: info?.name && info.name !== episode ? info.name : null,
			coverUrl: cover?.src || null,
		};
	},

	getProgressStats: () => getStandardVideoStats(),
};
