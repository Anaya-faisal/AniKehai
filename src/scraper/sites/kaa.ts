// src/scraper/sites/kaa.ts
import type { AnimeSite } from "../../shared/types";
import { getStandardVideoStats } from "../parser";

// Episode pages look like: https://kaa.lt/<show-slug>/ep-3-fc60be
// and have a <title> like:  "KickAssAnime - Magical★Explorer - Episode 03 - English Dub"
const EP_PATH_REGEX = /\/ep-(\d+(?:\.\d+)?)/;
const TITLE_REGEX =
	/^KickAssAnime\s+-\s+(.+?)\s+-\s+Episode\s+(\d+(?:\.\d+)?)/i;

// The poster loads lazily, so it can be missing for a moment after navigating.
// Remember the last good one (per title) and reuse it until the new one appears.
let cachedCover: { title: string; url: string } | null = null;

// The poster is a Vuetify <div> with an inline background-image, not an <img>
const getPosterUrl = (): string | null => {
	const el = document.querySelector<HTMLElement>(
		".v-image__image[style*='/image/poster/']",
	);
	const match = el?.style.backgroundImage.match(/url\(["']?(.+?)["']?\)/);
	return match?.[1] ?? null;
};

export const kaaStrategy: AnimeSite = {
	domains: ["kaa.lt"],
	iframe_src: ["krussdomi.com"],

	getAnimeMetadata: () => {
		// Only report activity on episode pages (not home, show pages, ...)
		const pathMatch = window.location.pathname.match(EP_PATH_REGEX);
		if (!pathMatch) {
			return { title: null, episode: null, coverUrl: null };
		}

		const titleMatch = document.title.trim().match(TITLE_REGEX);

		const title =
			document.querySelector("h1.text-h6")?.textContent?.trim() ||
			titleMatch?.[1]?.trim();

		// "03" -> 3, so we get "Episode 3"
		const episodeNumber = titleMatch?.[2] ?? pathMatch[1];
		const episode = episodeNumber ? `Episode ${Number(episodeNumber)}` : null;

		const poster = getPosterUrl();
		if (poster && title) {
			cachedCover = { title, url: poster };
		}
		const cached =
			cachedCover && cachedCover.title === title ? cachedCover.url : null;
		const coverUrl = poster ?? cached;

		return {
			title: title || null,
			episode,
			coverUrl,
		};
	},

	getProgressStats: () => getStandardVideoStats(),
};
