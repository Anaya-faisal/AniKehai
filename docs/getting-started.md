# Getting Started

Read this first. It takes about five minutes.

## The tech stack

| Tool | Why we use it |
| ---- | ------------- |
| [WXT](https://wxt.dev/) | Builds the extension for Chrome and Firefox from one codebase |
| TypeScript | Safer JavaScript |
| React 19 + Tailwind CSS 4 | The popup UI |
| Motion (`motion/react`) | Popup animations |
| [Bun](https://bun.sh/) | Package manager and script runner |
| [Biome](https://biomejs.dev/) | One tool for linting and formatting |
| Vitest + happy-dom | Unit and integration tests |
| Playwright | Browser tests (E2E and live health checks) |
| Lefthook + commitlint | Git hooks that check your work before commit and push |
| Docker (optional) | Identical environment for everyone, same as CI |

## The project in one picture

```
 Streaming site (browser tab)
 ┌─────────────────────────────┐
 │ Page: title, episode, cover │ ── content script ──┐
 │ Player iframe: video time   │ ── content script ──┤  messages
 └─────────────────────────────┘                     ▼
                                          Background worker
                                          (keeps state, decides when to update)
                                                     │ WebSocket
                                                     ▼
                                              Discord Gateway
                                                     │
                                                     ▼
                                          "Watching Frieren" on your profile

 Popup (React) ◄──── asks the background worker for status ────► login, toggles
```

More detail in [How it works](./how-it-works.md).

## Your first day checklist

- [ ] Fork and clone the repo.
- [ ] Set up with [Docker](./setup-docker.md) (recommended) or [manually](./setup-manual.md).
- [ ] Run `bun run validate` (lint + typecheck + tests). Everything should be green *before* you change anything.
- [ ] Load the extension in your browser and open the popup.
- [ ] Skim [How it works](./how-it-works.md) and [Project structure](./project-structure.md).
- [ ] Read [Contribution workflow](./contribution-workflow.md).
- [ ] Pick a [good first change](#good-first-contributions).

## Good first contributions

- Fix a typo or unclear sentence in the docs.
- Add a missing test (check the coverage report: `bun run test:coverage`).
- Report or fix a broken site: the weekly [live DOM health check](./testing.md#live-dom-health-checks) tells us when a site changed its HTML.
- [Add a new streaming site](./adding-a-site.md). This is the most common contribution and a great way to learn the codebase.

## The golden rules (short version)

1. Branch from `main`, keep your PR small.
2. Run `bun run lint:fix`, `bun run typecheck`, `bun run test` before pushing.
3. Write commit messages like `feat: add crunchyroll` or `fix: timer drift`.
4. Add tests for what you change.
5. Never commit tokens or `.env` files.

The full list is in [Contribution workflow](./contribution-workflow.md).

## Need help?

Join the [Discord server](https://discord.gg/w9Q7YUrzpn) or open an issue. Questions are welcome.
