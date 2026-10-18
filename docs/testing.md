# Testing

We test a lot, and CI enforces it. This page shows what kinds of tests exist, how to run them and how to write new ones.

## The four kinds of tests

| Kind | Tool | Where | Runs on |
| ---- | ---- | ----- | ------- |
| Unit / integration | Vitest + happy-dom (a fake browser DOM) | `src/**/*.test.ts`, `tests/**/*.test.{ts,tsx}` | Every PR |
| E2E | Playwright + real Chromium with the built extension | `tests/e2e/` | Every PR |
| Live DOM health | Playwright against real streaming sites | `tests/health/` | Sunday & Wednesday (and manually) |
| Build/manifest checks | Playwright + Vitest | `tests/e2e/build.spec.ts`, `tests/manifest.test.ts` | Every PR |

## Running tests

```bash
bun run test               # all unit + integration tests, once
bun run test:watch         # re-run on save (great while coding)
bun run test:coverage      # with coverage, thresholds enforced
bunx vitest run src/scraper/sites/hianime.test.ts   # one file
bunx vitest run -t "paused"                         # tests whose name contains "paused"

bun run test:e2e:install   # one-time: install Playwright's Chromium
bun run test:e2e           # builds the extension, then runs E2E
bun run test:health        # live site checks (needs internet)
```

With Docker: `bun run docker:test`, `docker:e2e`, `docker:health`, or `docker:ci` for everything.

## Coverage rules

`vitest.config.ts` fails the run if coverage drops below:

| Metric | Minimum |
| ------ | ------- |
| Lines | 80% |
| Functions | 80% |
| Statements | 80% |
| Branches | 70% |

Excluded: test files, `popup/main.tsx`, `style.css`, `shared/types.ts`. Open `coverage/index.html` after `bun run test:coverage` to see uncovered lines.

## How the test environment works

`tests/setup.ts` runs before every test:

- Loads jest-dom matchers (`toBeInTheDocument()`, ...).
- Resets `fakeBrowser` (WXT's fake `browser.*` APIs such as `storage`, `tabs`, `runtime`) so tests never leak state.
- Disables Motion animations so UI tests are instant.
- Cleans up the DOM after each test.

Vitest settings you should know: `restoreMocks`, `clearMocks` and `unstubGlobals` are on, so mocks and stubbed globals reset automatically.

### Helpers

| Helper | File | Use it for |
| ------ | ---- | ---------- |
| `setBody(html)`, `setHead(html)` | `tests/helpers/dom.ts` | Build a fake page |
| `visit(url, title)` | same | Fake the current URL and `document.title` |
| `loadFixture("site/watch.html.fixture")` | same | Load saved HTML |
| `mockVideo(video, {duration, currentTime, paused})` | same | Fake a `<video>` (happy-dom has no real playback) |
| `FakeWebSocket` | `tests/helpers/fake-websocket.ts` | Fake Discord's Gateway. Call `serverOpen()`, `serverSend(...)`, `serverClose(code)` and read `sentPayloads`. |
| `makeStatus()`, `ANIME` | `tests/helpers/status.ts` | Build popup status objects |

## Patterns used in this repo

**Fake time.** Anything with timers (heartbeats, polling, idle timeout):

```ts
vi.useFakeTimers();
vi.advanceTimersByTime(5_000);
```

**Mock `fetch`.**

```ts
vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({}) }));
```

**Fresh module state.** Modules with top-level variables (caches) need a reset per test:

```ts
beforeEach(async () => {
	vi.resetModules();
	({ myStrategy } = await import("./mysite"));
});
```

**Browser storage.** Just use `browser.storage.local.set(...)`. It is fake and reset for you.

**Parameterized cases.** Use `it.each([...])` for many inputs (see `parser.test.ts`).

**Popup UI.** Testing Library: `render(<X />)`, then `screen.getByRole(...)` and `userEvent.click(...)`. Query by role or label, not by CSS class.

## What to test when you change something

| You changed | Add or update |
| ----------- | ------------- |
| A site strategy | Its `*.test.ts` + fixture, and E2E/health entries for new sites |
| Update rules in `playback.ts` | `playback.test.ts` |
| Gateway / auth / assets | The matching test in `src/core/discord/` |
| Background message handling | `tests/entrypoints/background.test.ts` |
| A popup component | `tests/popup/components.test.tsx` |
| Popup state logic | `tests/popup/useExtensionStatus.test.tsx` |
| Manifest or permissions | `tests/manifest.test.ts` |
| A bug fix | A test that fails without your fix |

## E2E tests

`tests/e2e/fixtures.ts` launches Chromium with the **built** extension (`.output/chrome-mv3`) and:

- Maps `discord.com` and `gateway.discord.gg` to `127.0.0.1`, so tests never reach real Discord (the popup shows "Tuning in" because the gateway is unreachable, which is expected).
- Provides `extensionId`, a `storage` helper to set/get extension storage, and `popupUrl()`.

`content-script.spec.ts` serves each site's fixture on its real domain via request interception, waits a polling tick, then checks the popup shows the right title and episode.

E2E needs a build first. `bun run test:e2e` does it for you.

## Live DOM health checks

Streaming sites change their HTML often. `tests/health/live-dom.spec.ts` opens real episode pages and checks that our title and cover selectors still match. If a site blocks us with a Cloudflare challenge, the test is **skipped**, not failed. If it fails, a selector probably broke and the strategy needs updating.

When fixing one: update the selector in the strategy, update the fixture to the new HTML, and re-run the unit tests.

## Writing a good test

- Test behavior, not implementation details.
- One idea per `it(...)`, with a clear sentence as the name.
- Cover the edge cases: missing elements, empty strings, `null`, network failure.
- Keep tests offline and deterministic. No real network, no real time.
