# How AniKehai Works

This page explains the whole system in plain language. Keep [Project structure](./project-structure.md) open next to it to find the files mentioned here.

## The big picture

A browser extension has several parts that live in different places and talk by **messages**:

| Part | File | Where it runs | Job |
| ---- | ---- | ------------- | --- |
| Content script | `src/entrypoints/content.ts` | Inside the streaming site's page *and* its player iframes | Reads the page and video, sends messages |
| Background worker | `src/entrypoints/background.ts` | Behind the scenes in the browser | Holds the state and the Discord connection |
| Popup | `src/entrypoints/popup/` | The window opened by the toolbar icon | Login, settings, "now playing" card |

```
 ┌────────────── streaming site tab ──────────────┐
 │  main page            player iframe (other domain)
 │  content script       content script            │
 │  reads title/episode  reads video time & pause  │
 └──────┬────────────────────────┬─────────────────┘
        │ INFO_UPDATE / STOPPED  │ TIME_UPDATE
        ▼                        ▼
 ┌──────────────── background worker ─────────────────┐
 │ currentAnimeState  →  decide: update Discord now?   │
 │ idle timeout, privacy mode, on/off switch           │
 └──────┬──────────────────────────────────▲──────────┘
        │ WebSocket (presence)             │ GET_STATUS, LOGIN, toggles...
        ▼                                  │
  Discord Gateway                      Popup (React)
```

Why two content-script jobs? Many sites show the title on the main page, but the **video lives in an iframe from another domain**. A script in the main page cannot see inside that iframe. So the script runs in **both** (`allFrames: true`) and each copy does the part it can see.

## Step by step: what happens when you watch an episode

### 1. The content script wakes up

`content.ts` is injected on every supported site and player domain (the list is generated from the strategies, see below). It checks the hostname:

- If the host matches a strategy's `domains`, it is a **site page** (title, episode, cover).
- If the host matches a strategy's `iframe_src`, it is a **player iframe** (video progress).
- Otherwise it does nothing.

Then it runs a check every **5 seconds** (`CHECK_ACTIVITY_INTERVAL`).

### 2. It reads the page using a "strategy"

Each site has a strategy file in `src/scraper/sites/` that implements the `AnimeSite` interface:

```ts
interface AnimeSite {
  domains: string[];      // site pages, e.g. ["hianime.at"]
  iframe_src: string[];   // player domains, e.g. ["megaplay.buzz"]
  getAnimeMetadata: () => AnimeMetadata;  // title, episode, episodeName, coverUrl
  getProgressStats: () => ProgressStats;  // currentMs, durationMs, remainingMs, isPaused
}
```

- Site page → `getAnimeMetadata()` → sends **`INFO_UPDATE`** (title, episode, episode name, cover). If title or episode is missing (for example you went back to the home page) it sends **`STOPPED`** instead.
- Player iframe → `getProgressStats()` → sends **`TIME_UPDATE`** (position, duration, paused).

Reading video time is shared: `getStandardVideoStats()` in `src/scraper/parser.ts` reads the `<video>` element, and falls back to JW Player's on-screen time text (`.jw-text-elapsed`, `.jw-text-countdown`).

### 3. The background worker keeps the current state

`background.ts` receives the messages and stores them in `currentAnimeState` (`src/core/state/playback.ts`). Two safety rules:

- Messages are accepted **only from the active tab**, so a background tab cannot overwrite what you are watching.
- An **idle timeout** (`RESET_ACTIVITY_TIMEOUT`, 10 seconds) clears your status if updates stop (tab closed, browser crashed). That is why the timeout must be longer than the polling interval; a test enforces this.

### 4. It decides whether Discord needs an update

Sending every 5 seconds would spam Discord, so `evaluateDiscordUpdate()` only says "yes" when something meaningful changed:

| Change | Update? |
| ------ | ------- |
| Title or episode changed | Yes |
| Paused / resumed | Yes |
| Duration changed by more than 1 second | Yes |
| Playback time drifted more than 2.5 seconds from the expected position (seek or buffering) | Yes |
| Normal playback progress | No |
| Only the episode *name* changed | No |

Discord draws the progress bar itself from a start and end timestamp, so we do not need to send the time continuously. After a send, `commitBroadcast()` remembers what was sent.

### 5. It sends the presence to Discord

`src/core/discord/gateway.ts` talks to Discord's Gateway over a WebSocket:

1. Connect to `wss://gateway.discord.gg/?v=10&encoding=json`.
2. Discord says **HELLO** (op 10) with a heartbeat interval. We start sending **heartbeats** (op 1) and send **IDENTIFY** (op 2) with `Bearer <your token>`.
3. Discord replies **READY**. Now we are "connected".
4. To show a status we send a **presence update** (op 3) with title, episode, timestamps, and images.
5. To clear the status we send the same op with an empty activity list.

Resilience:

- Unexpected disconnect → reconnect with backoff: 1s, 2s, 4s ... up to 30s.
- Close code `4004` (bad token) or op 9 (invalid session) → the stored token is deleted and the background opens the popup so you can log in again.
- Manual `disconnect()` (logout) does **not** reconnect.

### 6. Images

`src/core/discord/assets.ts` handles pictures:

- **Cover art:** Discord only accepts images it knows. We register the cover URL as an *external asset* (a POST to Discord) and use the returned `mp:...` key. Results are cached per URL.
- **Fallback:** if registration fails, we use the app's own `default_cover` asset.
- **Play/pause icon:** app assets named `play` and `pause`.

### 7. Protected covers (AnimePahe)

Some sites hide images behind Cloudflare. AnimePahe exposes an AniList id in a `<meta name="anilist">` tag. The strategy asks the background worker (`FETCH_ANILIST`), which calls AniList's GraphQL API (`src/core/anilist/api.ts`) and returns the public `extraLarge` cover. The strategy caches the result and does not retry after a failure.

## Login (OAuth2 with PKCE)

You never give us your Discord password. `src/core/discord/auth.ts` uses OAuth2 **PKCE**:

1. Make a random **verifier**; hash it into a **challenge**.
2. Send you to Discord's authorize page with the challenge. Scope: `openid sdk.social_layer_presence`.
3. Discord sends back a one-time **code**.
4. We trade the code + verifier for an **access token** and store it as `discord_token` in `browser.storage.local`.

Two flows:

| Flow | When | How |
| ---- | ---- | --- |
| Desktop | Browser has the `identity` API (Chrome) | `launchWebAuthFlow` handles the redirect |
| Mobile / fallback | No `identity` API (Firefox, Kiwi) | Opens a tab, Discord redirects to `http://127.0.0.1/discord-auth?code=...`; the background worker spots that URL in `tabs.onUpdated`, closes the tab, and finishes the exchange. The verifier is kept in `mobile_oauth_verifier` meanwhile. |

## The popup

The popup is a React app. It has **no direct access** to the Discord connection. It talks to the background worker:

| Message | Sent by | Effect |
| ------- | ------- | ------ |
| `GET_STATUS` | Popup (every 3 s) | Returns token, gateway state, toggles, current anime, auth error |
| `LOGIN_DISCORD` | Popup | Starts login |
| `LOGOUT_DISCORD` | Popup | Disconnects and removes the token |
| `SET_ACTIVITY_ENABLED` | Popup | Turns broadcasting on/off (off clears your status) |
| `SET_PRIVACY_ENABLED` | Popup | Hides the anime name (sends "Anime / Private Session") |
| `INFO_UPDATE`, `TIME_UPDATE`, `STOPPED` | Content script | Playback data |
| `FETCH_ANILIST` | Content script | Get a cover from AniList |

Typed helpers for the popup messages live in `src/entrypoints/popup/lib/runtime-messages.ts`. The hook `useExtensionStatus` polls and exposes everything to components. Toggles are **optimistic**: the UI changes instantly and rolls back if the background call fails.

Popup layout: `App` → shows a spinner while loading → `AppShell` (header, then either `NowPlayingCard`/`IdlePanel` or `SettingsView`). If you are logged out, `AuthGateModal` covers a dimmed, blurred dashboard.

## Stored data (`browser.storage.local`)

| Key | Meaning |
| --- | ------- |
| `discord_token` | Your Discord access token. Treat as secret. |
| `activity_enabled` | Broadcast on/off |
| `privacy_enabled` | Hide anime name |
| `auth_error` | Last login error to show in the popup |
| `mobile_oauth_verifier` | Temporary PKCE verifier during mobile login |
| `enable_logs` | Developer logging on/off |

## Permissions and the manifest

`wxt.config.ts` builds the manifest. Highlights:

- `host_permissions` are generated by `extractMatches(strategies)`: add a site strategy and its domains are allowed automatically. Discord (`https://discord.com/*`, `wss://gateway.discord.gg/*`) is added too.
- `permissions`: `storage`, `tabs`, and `identity` (Chrome only).
- Chrome pins a `key` so the extension ID (and OAuth redirect URL) is stable. Firefox declares a gecko ID and states it collects no data.

## Security model in one minute

The extension holds a Discord token while running on untrusted streaming sites. So:

- Scraped text (title, episode) is treated as untrusted. React escapes it in the popup.
- Messages from content scripts are only accepted from the active tab, and only known types are handled.
- Content scripts never get the token. Only the background worker reads it.

See [SECURITY.md](../.github/SECURITY.md) for the full threat model and how to report problems.

## Logging

`src/shared/logger.ts` is silent by default. To see logs, open the background worker console and run `enable_logs = true`. Always use `logger.log/warn/error`, never `console.*`. See [Troubleshooting](./troubleshooting.md#how-to-turn-on-logs).

## Tunable constants

`src/shared/constants.ts`:

| Constant | Value | Meaning |
| -------- | ----- | ------- |
| `CHECK_ACTIVITY_INTERVAL` | 5 | Seconds between content-script checks |
| `RESET_ACTIVITY_TIMEOUT` | 10 | Seconds of silence before clearing presence |
| `APPLICATION_ID` | Discord app id | Public, not a secret |
| `DISCORD_SERVER_URL` | invite link | Shown in settings |
| `EXTENSION_VERSION` | `2.6.1` | Must match `package.json` |
