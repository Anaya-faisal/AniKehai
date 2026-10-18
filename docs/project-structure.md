# Project Structure

A tour of every folder. Paths are from the repo root.

```
.
├── src/                    ← all extension code (WXT srcDir)
│   ├── entrypoints/        ← the three runtime pieces
│   │   ├── background.ts       background worker: state + Discord + messages
│   │   ├── content.ts          injected into sites: polls and reports
│   │   └── popup/              React popup UI
│   ├── core/               ← logic with no UI
│   │   ├── anilist/            AniList GraphQL (cover art)
│   │   ├── discord/            auth (OAuth/PKCE), gateway (WebSocket), assets (images)
│   │   └── state/              playback state + "should we update Discord?" rules
│   ├── scraper/            ← reading streaming sites
│   │   ├── extractor.ts        turns strategies into manifest match patterns
│   │   ├── parser.ts           time parsing + shared video stats helper
│   │   └── sites/              one strategy per site + index.ts registry
│   └── shared/             ← constants, logger, types used everywhere
├── tests/                  ← tests that are not next to their source
│   ├── e2e/                    Playwright tests with the real built extension
│   ├── health/                 Playwright tests against the LIVE sites
│   ├── entrypoints/            background.ts and content.ts tests
│   ├── popup/                  React component, hook and message tests
│   ├── fixtures/<site>/        saved HTML for each site
│   ├── helpers/                dom.ts, fake-websocket.ts, status.ts
│   ├── manifest.test.ts        checks the generated manifest
│   └── setup.ts                global test setup
├── public/                 ← extension icons
├── scripts/                ← maintenance scripts (download counter)
├── docker/ + Dockerfile + docker-compose.yml + wxt.docker.config.ts
├── .github/                ← CI workflows, issue/PR templates, community docs
├── docs/                   ← this documentation
└── config files            ← see below
```

Unit tests for `src/` code live **next to the file** (`api.ts` + `api.test.ts`).

## `src/entrypoints/popup/`

```
popup/
├── index.html            popup page shell
├── main.tsx              mounts React
├── App.tsx               spinner → dashboard, auth gate overlay
├── style.css             Tailwind + theme colors (void, panel, ink, cyan, dusk, amber)
├── hooks/useExtensionStatus.ts    polling + actions (login, logout, toggles)
├── lib/runtime-messages.ts        typed wrappers around browser.runtime.sendMessage
└── components/
    ├── AppShell.tsx          layout: header + (home | settings) + footer
    ├── Header.tsx            title, status badge, settings button
    ├── NowPlayingCard.tsx    cover, title, episode, REC/PAUSED badge
    ├── IdlePanel.tsx         "Nothing's playing"
    ├── SettingsView.tsx      privacy, broadcast, Discord link, logout
    ├── AuthGateModal.tsx     "Link with Discord"
    ├── StatusBadge.tsx       On air / Tuning in / Off air
    ├── ToggleSwitch.tsx      accessible switch
    └── decor/InkDivider.tsx  decorative SVG line
```

## Site strategies (`src/scraper/sites/`)

One file per site, plus a test beside it:

| Site | Domain(s) | Notes |
| ---- | --------- | ----- |
| `anikoto.ts` | anikototv.to, anikoto.cz | |
| `aniwave.ts` | aniwaves.ru | Strips trailing "Episode N" from the title |
| `animepahe.ts` | animepahe.pw | Uses AniList for covers (Cloudflare) |
| `hianime.ts` | hianime.at | |
| `aniwatch.ts` | aniwatch.cx | |
| `reanime.ts` | reanime.to | Parses `<title>`, cover from `og:image` |
| `kaa.ts` | kaa.lt | Poster from inline CSS; caches last cover |
| `miruro.ts` | several `www.miruro.*` mirrors | Cover `alt` holds the title |
| `index.ts` | | The `strategies` array (registry) |

## Config files

| File | Purpose |
| ---- | ------- |
| `wxt.config.ts` | Manifest, permissions, Tailwind plugin, React module |
| `wxt.docker.config.ts` | Docker dev-server variant |
| `tsconfig.json` | Extends the generated `.wxt/tsconfig.json` |
| `biome.json` | Lint + format rules (tabs, double quotes, import sorting) |
| `.editorconfig` | Editor defaults (LF line endings, UTF-8) |
| `.gitattributes` | Forces LF line endings |
| `vitest.config.ts` | Test environment, coverage thresholds |
| `playwright.config.ts` | E2E tests |
| `playwright.health.config.ts` | Live health checks |
| `lefthook.yml` | Git hooks |
| `commitlint.config.ts` | Commit message rules |
| `package.json` | Scripts, dependencies, engines |
| `bun.lock` | Locked dependency versions (commit it) |
| `.env.example` | Docker user-id example |

## Generated folders (never edit, never commit)

`.output/` (builds), `.wxt/` (WXT types), `node_modules/`, `coverage/`, `playwright-report/`, `test-results/`.

## GitHub automation (`.github/workflows/`)

| Workflow | When | Does |
| -------- | ---- | ---- |
| `ci.yml` | push to `main`/`dev`, every PR | Lint, typecheck, tests, E2E, build Chrome+Firefox |
| `docker.yml` | Docker-related files change | Dockerfile lint + full suite in containers |
| `security.yml` | push/PR to `main`, weekly | `bun audit` + Gitleaks |
| `dom-health.yml` | Sunday & Wednesday | Live selector check on real sites |
| `release.yml` | tag `vX.Y.Z` | Builds zips and publishes a GitHub release |
| `update_download_stats.yml` | daily | Updates the README download badges |
