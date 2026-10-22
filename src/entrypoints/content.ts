import { extractMatches } from "../scraper/extractor";
import { strategies } from "../scraper/sites";
import { CHECK_ACTIVITY_INTERVAL } from "../shared/constants";
import { logger } from "../shared/logger";

const isMatch = (host: string, d: string) =>
	host === d || host.endsWith(`.${d}`);

export default defineContentScript({
	matches: [...extractMatches(strategies)],
	allFrames: true,

	main(ctx) {
		const host = window.location.hostname;

		const metaStrategy = strategies.find((stg) =>
			stg.domains.some((domain) => isMatch(host, domain)),
		);

		const iframeStrategy = strategies.find((stg) =>
			stg.iframe_src.some((src) => isMatch(host, src)),
		);

		if (!metaStrategy && !iframeStrategy) return;

		if (iframeStrategy && window !== window.top && !metaStrategy) {
			try {
				const parentHost = new URL(document.referrer).hostname;
				const parentMatches = strategies.some((stg) =>
					stg.domains.some((domain) => isMatch(parentHost, domain)),
				);
				if (!parentMatches) return;
			} catch {
				return;
			}
		}

		const send = (message: object) => {
			browser.runtime.sendMessage(message).catch((err) => {
				logger.warn("sendMessage failed:", err);
			});
		};

		ctx.setInterval(() => {
			try {
				if (iframeStrategy) {
					const stats = iframeStrategy.getProgressStats();

					send({
						type: "TIME_UPDATE",
						currentMs: stats.currentMs,
						durationMs: stats.durationMs,
						isPaused: stats.isPaused ?? true,
					});

					return;
				}

				if (metaStrategy) {
					const meta = metaStrategy.getAnimeMetadata();

					if (!meta.title || !meta.episode) {
						send({ type: "STOPPED" });
						return;
					}

					send({
						type: "INFO_UPDATE",
						title: meta.title,
						episode: meta.episode,
						episodeName: meta.episodeName,
						coverUrl: meta.coverUrl,
					});
				}
			} catch (err) {
				logger.error("DOM scraping error:", err);
			}
		}, CHECK_ACTIVITY_INTERVAL * 1000);
	},
});
