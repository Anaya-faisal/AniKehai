# AniKehai

<div align="center">
    <img src="./.github/assets/discord-activity.png" width="400" height="auto" alt="discord-activity">
</div>

A lightweight, standalone browser extension that shows the anime you are watching on your Discord profile (Rich Presence). No desktop app needed.

<div align="center">

[![Website](https://img.shields.io/badge/website-anikehai.vercel.app-7c5cff?style=flat&logo=vercel)](https://anikehai.vercel.app/)
![Stars](https://img.shields.io/github/stars/minkxx/AniKehai?style=flat)
![Forks](https://img.shields.io/github/forks/minkxx/AniKehai?style=flat)
![Version](https://img.shields.io/badge/version-v2.6.1-blue?style=flat&labelColor=#808080)

<!-- DOWNLOADS:START -->
![GitHub Downloads](https://img.shields.io/badge/github_downloads-198-blue?style=flat&labelColor=555555)
![Firefox Weekly Downloads](https://img.shields.io/badge/firefox_weekly_downloads-2-blue?style=flat&labelColor=555555)
![Firefox Active Users](https://img.shields.io/badge/firefox_active_users-25-blue?style=flat&labelColor=555555)
<!-- DOWNLOADS:END -->

<a href="https://discord.gg/w9Q7YUrzpn"><img src="https://invidget.switchblade.xyz/w9Q7YUrzpn"></a>

</div>

🌐 **Official Website:** [anikehai.vercel.app](https://anikehai.vercel.app/) has automatic browser detection, install guides, the supported-site list and an FAQ.

---

## Table of contents

- [Install (for users)](#install-for-users)
- [Features](#features)
- [Supported sites](#supported-sites)
- [Contributing (for developers)](#contributing-for-developers)
- [Documentation](#documentation)
- [License](#license)

---

## Install (for users)

**Firefox (Desktop & Android)**
Go to the [Firefox Add-ons Store](https://addons.mozilla.org/en-US/firefox/addon/anikehai/) and click **Add to Firefox**.

**Chrome (Desktop)**
We are not in the Chrome Web Store yet, so install it manually:

1. Download `anikehai-2.6.1-chrome.zip` from the [Releases page](https://github.com/minkxx/AniKehai/releases).
2. **Unzip** it into a normal folder.
3. Open `chrome://extensions` and turn **ON** *Developer mode* (top-right).
4. Click **Load unpacked** and select the unzipped folder.

**Android (Kiwi / Lemur Browser)**

1. Install [Kiwi Browser](https://github.com/kiwibrowser/src.next/releases/tag/14310011181).
2. Download `anikehai-2.6.1-chrome.zip` from the [Releases page](https://github.com/minkxx/AniKehai/releases) to your phone.
3. In Kiwi, open the menu (⋮) → **Extensions** and enable **Developer mode**.
4. Tap **+ (from .zip/.crx/.user.js)** and pick the downloaded `.zip`.
5. Open the extension from the bottom of the menu.

**Then:**

1. Open the extension popup and click **Link with Discord**. You will see Discord's official authorization page.
2. Open an episode on any [supported site](#supported-sites). Your Discord status updates by itself.

> Keep the Discord desktop/mobile app or website open with the same account. Discord shows Rich Presence for the account you linked.

---

## Features

- **Rich Presence:** anime title, episode, episode name and a Watching / Paused state.
- **Live progress:** progress bar, elapsed and remaining time through Discord timestamps.
- **Cover art:** high-quality covers. Sites with protected images (like AnimePahe) fall back to the AniList API.
- **Privacy mode:** hides which anime you watch. Discord only shows "Anime — Private Session".
- **Broadcast toggle:** turn broadcasting on or off from the popup without logging out.
- **Mobile support:** works on Android browsers that support extensions, with a special login flow.
- **No middleman:** the extension talks directly to Discord's Gateway. Nothing runs outside your browser.

## Supported sites

See the always-up-to-date [supported sites list](https://anikehai.vercel.app/#sites).
Want a new site? Open a [Site Request](https://github.com/minkxx/AniKehai/issues/new?template=site_request.md) or add it yourself with the [Adding a site guide](./docs/adding-a-site.md).

---

## Contributing (for developers)

Contributions of every size are welcome: bug reports, new sites, docs, tests, code.

**Fastest way to start (Docker, recommended):**

```bash
git clone https://github.com/minkxx/AniKehai.git
cd AniKehai
docker compose up --build dev
```

Then load the built extension into your browser. The full walkthrough is in [docs/setup-docker.md](./docs/setup-docker.md). Prefer no Docker? Use [docs/setup-manual.md](./docs/setup-manual.md).

**Before you open a PR, read:** [CONTRIBUTING.md](./.github/CONTRIBUTING.md) (the rules in one page).

## Documentation

Everything lives in the [`docs/`](./docs/README.md) folder:

| I want to...                               | Read                                                        |
| ------------------------------------------ | ----------------------------------------------------------- |
| Get oriented as a newcomer                 | [Getting started](./docs/getting-started.md)                |
| Set up with Docker (recommended)           | [Docker setup](./docs/setup-docker.md)                      |
| Set up without Docker                      | [Manual setup](./docs/setup-manual.md)                      |
| Understand how the extension works         | [How it works](./docs/how-it-works.md)                      |
| Find my way around the code                | [Project structure](./docs/project-structure.md)            |
| Add support for a new streaming site       | [Adding a site](./docs/adding-a-site.md)                    |
| Write and run tests                        | [Testing](./docs/testing.md)                                |
| Know the rules for commits, style and PRs  | [Contribution workflow](./docs/contribution-workflow.md)    |
| Fix something that is not working          | [Troubleshooting](./docs/troubleshooting.md)                |

## License

Distributed under the [MIT License](/LICENSE).

<p align="center">Made with ❤️ by Minkxx</p>
