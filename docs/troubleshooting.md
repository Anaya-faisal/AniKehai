# Troubleshooting

Find your symptom, try the fix. Still stuck? Ask on the [Discord server](https://discord.gg/w9Q7YUrzpn) or open a [bug report](https://github.com/minkxx/AniKehai/issues/new?template=bug_report.md).

## How to turn on logs

The extension is silent by default. To see what it does:

**Chrome**

1. Open `chrome://extensions` and turn on Developer mode.
2. Find AniKehai and click **service worker** (the "Inspect views" link).
3. In the Console tab, type: `enable_logs = true` and press Enter.

**Firefox**

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Inspect** next to AniKehai.
3. In the Console, type: `enable_logs = true`.

You will see `[INFO]`, `[WARN]` and `[ERROR]` lines, including the exact presence payload sent to Discord. The setting is saved, so it stays on until you run `enable_logs = false`. To see messages from the **content script**, open DevTools (F12) on the streaming site's tab.

Please paste relevant logs (with the token removed) into bug reports.

## For users

| Symptom | Likely cause and fix |
| ------- | -------------------- |
| Popup shows "Link with Discord" again | Token expired or invalid. Log in again. The extension clears bad tokens automatically. |
| Popup shows "Tuning in" forever | Not connected to Discord's Gateway. Check your internet and any VPN/firewall blocking `gateway.discord.gg`. Log out and in again. |
| Nothing on my Discord profile | Make sure **Broadcast to Discord** is ON and Privacy is what you expect. Discord's own *Activity Privacy* setting must allow sharing. Use the same Discord account you linked. |
| Shows "Anime / Private Session" | Privacy mode is on. Turn it off in settings. |
| No progress bar | The video player's domain is not in the strategy's `iframe_src`, or the video is paused. Report the site. |
| Wrong or missing cover | The site changed its HTML or blocks images. Report it. A default cover is used as a fallback. |
| Status stays after closing the tab | It clears after about 10 seconds without updates. |
| Works on one site but not another | That site probably changed its HTML. Check the live health check results, then open a bug report. |
| Mobile (Kiwi) login stuck | Allow the new tab to finish. Discord redirects to a `127.0.0.1` page that the extension closes by itself. Try again if you closed it early. |
| Login error message in the popup | Read it: it is Discord's own error (e.g. "access denied" means you pressed Cancel). |

## For contributors

### Setup and tooling

| Symptom | Fix |
| ------- | --- |
| `Cannot find module '.wxt/tsconfig.json'` | `bunx wxt prepare` |
| Install fails on Node version | Use Node >= 25.8.2 (the Docker image already does) |
| `bun: command not found` | Install Bun, then reopen the terminal |
| Biome complains about everything | `bun run lint:fix`. Check your editor saves with LF endings and tabs. |
| Hooks do not run | `bunx lefthook install` |
| Commit rejected by commitlint | Use `type: message`. See [commit messages](./contribution-workflow.md#5-commit-messages). |
| Dev browser does not open | Load `.output/chrome-mv3-dev` manually (see [manual setup](./setup-manual.md#5-start-the-dev-server)) |
| Docker file permission problems (Linux) | `export HOST_UID=$(id -u) HOST_GID=$(id -g)` before running compose |
| Docker is stuck on old dependencies | `bun run docker:clean` then rebuild |
| Port 3000 busy | `docker compose down` or stop the other app |

### Tests

| Symptom | Fix |
| ------- | --- |
| "run `bun run build:chrome` first" in E2E | Use `bun run test:e2e` (it builds first) |
| E2E cannot find Chromium | `bun run test:e2e:install` |
| E2E popup shows "Tuning in" | Expected. Discord hosts are mapped to localhost in tests. |
| Test leaks state into another | Use `vi.resetModules()` for module-level caches. Timers: `vi.useFakeTimers()` and restore in `afterEach`. |
| Coverage threshold failure | Run `bun run test:coverage`, open `coverage/index.html`, add tests for red lines. |
| Version test fails | `package.json` and `EXTENSION_VERSION` do not match. Make them identical. |
| `index.test.ts` strategy-count failure | You added or removed a site. Update the `toHaveLength(...)` number. |
| "domain is contained in another" failure | Your site domain overlaps another site's domain. Use a more specific hostname. |
| Health check fails for one site | The selector likely broke. Fix it in the strategy and refresh the fixture. If it says skipped, Cloudflare blocked the run. |

### Debugging a site strategy

1. Open the episode page, press F12, and test your selectors in the console.
2. Turn on logs and watch for `DOM scraping error`.
3. Confirm the **player iframe's** domain is in `iframe_src`. Right-click the video → Inspect and check which frame it sits in.
4. Make sure the page is a *watch* page. Strategies must return `null` elsewhere.
5. Update the fixture with the new HTML and re-run `bunx vitest run src/scraper/sites/<site>.test.ts`.

### Debugging Discord

| Symptom | Check |
| ------- | ----- |
| Never reaches READY | Valid `discord_token` in storage? Network/VPN? Logs show `[Gateway] Ready and authenticated!` when OK. |
| Presence not shown | Logs should show `Sending presence payload`. If not, the update rules (`evaluateDiscordUpdate`) decided nothing changed, or broadcasting is off. |
| Cover image missing | Look for `[ExternalAssets] failed`. Falls back to `default_cover`. |
| Reconnect loop | Look at `Reconnecting in Ns`. Backoff grows up to 30 seconds. A `4004` close clears the token and stops. |

## Still stuck?

Open an issue with: what you expected, what happened, your OS and browser, the extension version (bottom of the popup), the site URL, and logs.
