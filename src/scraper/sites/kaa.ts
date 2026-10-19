import type { AnimeSite } from "../../shared/types";
import { getStandardVideoStats } from "../parser";

const EP_PATH_REGEX = /\/ep-(\d+(?:\.\d+)?)/;
const TITLE_REGEX =
	/^KickAssAnime\s+-\s+(.+?)\s+-\s+Episode\s+(\d+(?:\.\d+)?)/i;

let cachedCover: { title: string; url: string } | null = null;

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
		const pathMatch = window.location.pathname.match(EP_PATH_REGEX);
		if (!pathMatch) {
			return { title: null, episode: null, coverUrl: null };
		}

		const titleMatch = document.title.trim().match(TITLE_REGEX);

		const title =
			document.querySelector("h1.text-h6")?.textContent?.trim() ||
			titleMatch?.[1]?.trim();

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
