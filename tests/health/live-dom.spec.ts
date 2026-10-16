import { expect, test } from "@playwright/test";

const SITES = [
	{
		name: "HiAnime",
		url: "https://hianime.at/watch/bocchi-the-rock-969?ep=16335",
		titleSelector: ".anisc-detail .film-name a",
		coverSelector: ".anisc-poster .film-poster img",
	},
	{
		name: "Miruro",
		url: "https://www.miruro.tv/watch/TPTXt3E40b2BdIqTk-jJbAvqnYT7eChY/oshi-no-ko?ep=3",
		titleSelector: "img[src*='anilistcdn/media/anime/cover'][alt]",
		coverSelector: "img[src*='anilistcdn/media/anime/cover'][alt]",
	},
	{
		name: "KickAssAnime",
		url: "https://kaa.lt/sousou-no-frieren-2d15/ep-1-aa83b7",
		titleSelector: "h1.text-h6",
		coverSelector: ".v-image__image",
	},
	{
		name: "Anikoto",
		url: "https://anikototv.to/watch/terror-in-resonance-o6riu/ep-1",
		titleSelector: "h1.title",
		coverSelector: "#w-info .binfo .poster img",
	},
	{
		name: "AnimePahe",
		url: "https://animepahe.pw/play/26cbf3f1-e9c7-3cad-e7d5-2c5a78e01651/83b1f05ac200e0d2540d846816a68e00250c30b87e6c25c6a98631d95f8b53a1",
		titleSelector: ".theatre-info h1 a",
		coverSelector: ".theatre-info .anime-poster img",
	},
	{
		name: "Aniwatch",
		url: "https://aniwatch.cx/episode/black-clover-season-2-1-6b42f",
		titleSelector: ".awt-watch-info-bar .awt-wib-meta h1.awt-wib-title",
		coverSelector: ".awt-watch-info-bar img.awt-wib-poster",
	},
	{
		name: "Aniwave",
		url: "https://aniwaves.ru/watch/kusuriya-no-hitorigoto-3rd-season-82762/ep-1",
		titleSelector: "h1.title.d-title",
		coverSelector: "#w-info .binfo .poster img",
	},
	{
		name: "ReAnime",
		url: "https://reanime.to/watch/overgeared-vc4j78?ep=2",
		titleSelector: "title",
		coverSelector: "meta[property='og:image']",
	},
];

test.describe("Live Production DOM Health Checks", () => {
	for (const site of SITES) {
		test(`Check ${site.name} DOM selectors`, async ({ page }) => {
			await page.setExtraHTTPHeaders({
				"Accept-Language": "en-US,en;q=0.9",
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			});

			await page.route("**/*", (route) => {
				const type = route.request().resourceType();
				if (["media", "font"].includes(type)) {
					route.abort();
				} else {
					route.continue();
				}
			});

			await page.goto(site.url, {
				waitUntil: "domcontentloaded",
				timeout: 15_000,
			});

			const isCloudflare =
				(await page
					.getByRole("heading", { name: "Performing security verification" })
					.isVisible()) ||
				(await page.getByText("Ray ID:").isVisible()) ||
				(await page.getByText("Verify you are human").isVisible());

			if (isCloudflare) {
				test.skip(
					true,
					`Skipped ${site.name}: Blocked by Cloudflare challenge.`,
				);
				return;
			}

			const title = page.locator(site.titleSelector).first();
			const cloudflareChallenge = page.getByText("Ray ID:");

			await expect(title.or(cloudflareChallenge)).toBeAttached({
				timeout: 15_000,
			});

			if (await cloudflareChallenge.isVisible()) {
				test.skip(
					true,
					`Skipped ${site.name}: Blocked by Cloudflare challenge.`,
				);
				return;
			}

			await expect(title).toBeAttached();

			const cover = page.locator(site.coverSelector).first();
			await expect(cover).toBeAttached({ timeout: 10_000 });
		});
	}
});
