# AniKehai Documentation

Welcome! These docs explain AniKehai from zero: what it is, how it works, how to set it up, and how to contribute. You do **not** need to know browser extensions already.

## What is AniKehai?

A browser extension. You watch anime on a streaming site. The extension reads the page (title, episode, video time) and tells Discord, so your friends see **"Watching Frieren, Episode 3"** on your profile.

## Where do I start?

**New here? Read in this order:**

1. [Getting started](./getting-started.md): the 5-minute overview and the shortest path to your first change.
2. Set up your machine: [Docker (recommended)](./setup-docker.md) or [Manual](./setup-manual.md).
3. [How it works](./how-it-works.md): the big picture, with diagrams.
4. [Contribution workflow](./contribution-workflow.md): the rules before you open a PR.

## All guides

| Guide | What you learn |
| ----- | -------------- |
| [Getting started](./getting-started.md) | Overview, tools, first-day checklist |
| [Docker setup](./setup-docker.md) | Run everything in containers (recommended) |
| [Manual setup](./setup-manual.md) | Run on your own machine with Node and Bun |
| [How it works](./how-it-works.md) | Content script, background worker, popup, Discord Gateway |
| [Project structure](./project-structure.md) | What every folder and file is for |
| [Adding a site](./adding-a-site.md) | Support a new anime streaming site |
| [Testing](./testing.md) | Unit, popup, E2E and live health tests |
| [Contribution workflow](./contribution-workflow.md) | Branches, commits, style, hooks, CI, PRs |
| [Troubleshooting](./troubleshooting.md) | Common problems and fixes, how to enable logs |

## Words you will see

| Word | Meaning |
| ---- | ------- |
| **Extension** | A small program that runs inside the browser. |
| **WXT** | The framework we use to build the extension for Chrome and Firefox from one codebase. |
| **Content script** | Code the extension injects into a website so it can read the page. |
| **Background worker** | Code that runs behind the scenes in the browser. It holds the Discord connection. |
| **Popup** | The small window that opens when you click the extension icon. |
| **Strategy** | A small file that knows how to read one specific streaming site. |
| **Rich Presence (RPC)** | The "Watching ..." status shown on a Discord profile. |
| **Gateway** | Discord's WebSocket server. We send our status to it. |
| **OAuth2 / PKCE** | The safe login flow that lets you link Discord without sharing your password. |
| **Fixture** | A saved copy of a page's HTML used in tests. |
| **Iframe** | A page inside a page. Many sites put the video player in an iframe from another domain. |
