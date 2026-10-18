# Adding a New Streaming Site

The most common contribution. Each site is a **strategy**: a small file that knows where the title, episode, cover and video are on that site. You will touch about six files. Follow the steps in order.

## Before you start

1. Check open issues and `src/scraper/sites/` so the site is not already supported.
2. Set up your environment ([Docker](./setup-docker.md) or [manual](./setup-manual.md)).
3. Open an episode page on the site and open your browser DevTools (F12). You will inspect the HTML.

## Step 1: Find the domains

You need two lists:

- **`domains`**: the site's own addresses (including mirrors), as bare hostnames: `example.com`, not `https://example.com/watch`.
- **`iframe_src`**: domains of the video player. In DevTools, find the `<iframe>` that contains the `<video>` and note its `src` host. Use an empty array `[]` if the video is on the main page itself.

Rules (a test enforces them):

- Bare hostnames only: no `https://`, paths, ports or `*`.
- No duplicates inside one strategy.
- A domain must not be contained in another strategy's domain, because `content.ts` matches with `host.includes(domain)`.
- A site domain must not also be a player domain.

## Step 2: Find the selectors

On an episode page, find CSS selectors for:

| Data | Needed? | Tip |
| ---- | ------- | --- |
| Anime title | Yes | Prefer stable classes/ids. Avoid long fragile chains. |
| Episode label (e.g. "Episode 3") | Yes | |
| Episode name (e.g. "Killing Magic") | Optional | Skip it if the site only repeats "Episode 3". |
| Cover image URL | Optional | Return `null` when there is none. |

In the DevTools console, test a selector: `document.querySelector("h1.title")?.textContent`.

Some sites put data in the page `<title>` or the URL instead. See `kaa.ts`, `reanime.ts` and `miruro.ts` for examples.

## Step 3: Create the strategy file

Create `src/scraper/sites/mysite.ts`:

```ts
import type { AnimeSite } from "../../shared/types";
import { getStandardVideoStats } from "../parser";

export const mysiteStrategy: AnimeSite = {
	domains: ["mysite.example"],
	iframe_src: ["player.example"],

	getAnimeMetadata: () => {
		const titleElement = document.querySelector("h1.title");
		const episodeElement = document.querySelector(".episode-label");
		const episodeNameElement = document.querySelector(".ep-list .active .name");
		const imageElement = document.querySelector(
			".poster img",
		) as HTMLImageElement | null;

		const title = titleElement?.textContent?.trim();
		const episode = episodeElement?.textContent?.trim();
		const episodeName = episodeNameElement?.textContent?.trim();
		const coverUrl = imageElement?.src;

		return {
			title: titleElement ? title : null,
			episode: episodeElement ? episode : null,
			// skip names that just repeat the episode label
			episodeName:
				episodeNameElement && episode !== episodeName ? episodeName : null,
			coverUrl: coverUrl ? coverUrl : null,
		};
	},

	getProgressStats: () => getStandardVideoStats(),
};
```

Important behaviors:

- On a page that is **not** an episode page, return `null` for title and episode. The content script then sends `STOPPED` and clears the status.
- Never throw because an element is missing. Use `?.` and return `null`.
- `getStandardVideoStats()` handles a normal `<video>` and JW Player. Only write your own `getProgressStats` if the player is unusual (the result must match the `ProgressStats` type).
- Only report activity on watch pages. If the site's home page also matches your selectors, check `window.location.pathname` first (see `miruro.ts`).

### If cover images are protected

If the cover is behind Cloudflare, use AniList. Read the AniList id from the page and ask the background worker. Copy the pattern from `animepahe.ts`: it sends `{ type: "FETCH_ANILIST", anilistId }`, caches the result, and never retries after a failure. If the site's `og:image` already points at a public CDN, just use it (see `reanime.ts`).

## Step 4: Register the strategy

In `src/scraper/sites/index.ts`, import it and add it to the `strategies` array:

```ts
import { mysiteStrategy } from "./mysite";

export const strategies = [
	// ...existing strategies
	mysiteStrategy,
];
```

That is all the wiring needed. The content script matches and the manifest `host_permissions` are generated from this array.

## Step 5: Add a fixture and a unit test

A **fixture** is a trimmed copy of the page HTML so the test does not need the internet.

1. Create `tests/fixtures/mysite/watch.html.fixture` with only the elements your selectors use (title, episode label, episode list, poster).
2. Create `src/scraper/sites/mysite.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { loadFixture, setBody } from "../../../tests/helpers/dom";
import { mysiteStrategy } from "./mysite";

describe("mysiteStrategy", () => {
	it("declares its domains and player iframes", () => {
		expect(mysiteStrategy.domains).toEqual(["mysite.example"]);
		expect(mysiteStrategy.iframe_src).toEqual(["player.example"]);
	});

	it("scrapes a full watch page", () => {
		setBody(loadFixture("mysite/watch.html.fixture"));
		expect(mysiteStrategy.getAnimeMetadata()).toEqual({
			title: "My Anime",
			episode: "Episode 3",
			episodeName: "The Name",
			coverUrl: "https://mysite.example/poster.jpg",
		});
	});

	it("returns nulls on a non-watch page", () => {
		setBody("<div>home</div>");
		expect(mysiteStrategy.getAnimeMetadata()).toMatchObject({
			title: null,
			episode: null,
		});
	});

	it("omits episodeName when it repeats the episode label", () => {
		// build a tiny page where the name equals the label...
	});
});
```

Test helpers (`tests/helpers/dom.ts`): `setBody`, `setHead`, `visit(url, title)` (changes the URL/title), `loadFixture(path)`, `mockVideo(video, props)`. Look at `hianime.test.ts` for a simple model.

## Step 6: Update the shared tests

- `src/scraper/sites/index.test.ts` has `expect(strategies).toHaveLength(8)`. Update the number. This test also checks your hostnames, duplicates and empty-page behavior automatically.
- `tests/e2e/content-script.spec.ts`: add an entry to `SITES` with `id` (matches your fixture folder), `url`, `pageTitle`, `expectedTitle`, `expectedEpisode` (shown as `Episode 3: The Name`, or just `Episode 3` with no name).
- `tests/health/live-dom.spec.ts`: add an entry to `SITES` with a real episode URL and the title and cover selectors. This weekly job warns us when the site changes its HTML.

## Step 7: Try it for real

```bash
bun run dev:chrome      # or use the Docker dev server
```

Open an episode on the site, then check your Discord status. To see what the extension reads, turn on logs ([how](./troubleshooting.md#how-to-turn-on-logs)). If something looks wrong, the log shows the exact presence payload being sent.

## Checklist

Copy this into your PR:

- [ ] `src/scraper/sites/<site>.ts` created, returns `null` safely when elements are missing
- [ ] Registered in `src/scraper/sites/index.ts`
- [ ] `tests/fixtures/<site>/watch.html.fixture` added
- [ ] `src/scraper/sites/<site>.test.ts` added
- [ ] Strategy count updated in `index.test.ts`
- [ ] Entry added to `tests/e2e/content-script.spec.ts`
- [ ] Entry added to `tests/health/live-dom.spec.ts`
- [ ] `bun run lint:fix`, `bun run typecheck`, `bun run test` pass
- [ ] Screenshot of the Discord status in the PR
- [ ] The site is added to the supported-sites list on the website (ask a maintainer if you cannot)

## Common mistakes

| Mistake | Result |
| ------- | ------ |
| Using `https://site.com` in `domains` | Registry test fails |
| Forgetting the player domain in `iframe_src` | Title shows but no progress bar |
| Throwing when an element is missing | The content script logs errors and nothing updates |
| Selectors that match on the home page too | Status shows junk on non-watch pages |
| Not trimming whitespace | Titles like `" Frieren "` |
| Forgetting to bump the strategy count in the test | `index.test.ts` fails |
