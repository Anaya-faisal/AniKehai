# Setup with Docker (recommended)

Docker gives you the **same environment as our CI**: the right Node and Bun versions, Playwright's browser and all dependencies. You install only Docker.

## 1. Install the requirements

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows / macOS) or Docker Engine + the Compose plugin (Linux).
- [Git](https://git-scm.com/).
- Windows users: use Docker Desktop with the WSL 2 backend.

Check that it works:

```bash
docker --version
docker compose version
```

## 2. Get the code

```bash
git clone https://github.com/<your-username>/AniKehai.git
cd AniKehai
```

## 3. Linux only: fix file ownership (optional)

Docker creates files as `root` by default. Tell the container to hand them back to you:

```bash
export HOST_UID=$(id -u) HOST_GID=$(id -g)
```

Or copy `.env.example` to `.env` and set the numbers there. Windows and macOS (Docker Desktop) do **not** need this.

## 4. Start the dev server

For Chrome:

```bash
bun run docker:dev
```

For Firefox:

```bash
bun run docker:dev:firefox
```

No Bun on your machine yet? Use Compose directly (these are the same commands):

```bash
docker compose up --build dev            # Chrome
docker compose up --build dev-firefox    # Firefox
```

The first run is slow (it builds the image). Later runs are fast. The dev server runs on port `3000` and rebuilds when you save a file.

## 5. Load the extension into your browser

The container **cannot open a browser window** for you, so you load the built files yourself. The build appears in your project folder under `.output/`.

**Chrome**

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top-right).
3. Click **Load unpacked**.
4. Choose the `.output/chrome-mv3-dev` folder (or `.output/chrome-mv3` if that is what you see).

**Firefox**

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Choose `manifest.json` inside the `.output/firefox-mv2-dev` or `.output/firefox-mv3-dev` folder.

Click the extension icon to open the popup. Edit code, save, and the extension reloads itself.

> Tip: if a folder name differs, run `ls .output` and use the folder that matches your browser.

## 6. Run checks inside Docker

| Command | What it does |
| ------- | ------------ |
| `bun run docker:shell` | Opens a shell inside the dev container |
| `bun run docker:lint` | Biome lint + TypeScript check |
| `bun run docker:test` | Unit tests with coverage |
| `bun run docker:e2e` | Builds the extension and runs the Chromium E2E tests |
| `bun run docker:health` | Checks the **live** streaming sites' selectors |
| `bun run docker:build` | Builds Chrome and Firefox zip files into `.output/` |
| `bun run docker:ci` | **Everything CI does**: lint, typecheck, tests, build, E2E |
| `bun run docker:clean` | Deletes the containers, volumes and images |

Before opening a PR, run `bun run docker:ci`. If it passes, CI will pass.

## How it is wired (for the curious)

- `Dockerfile` has stages: `base` (Node + Bun) → `deps` (installed packages + Playwright Chromium) → `dev` (interactive) and `ci` (copies the code, runs `bun run validate`).
- `docker-compose.yml` has two profiles: `dev` (dev servers + shell) and `ci` (lint, test, build, e2e, health, ci).
- `docker/entrypoint.sh` runs before every command. It reinstalls packages if `package.json` or `bun.lock` changed, generates the `.wxt` types if missing, and fixes file ownership on Linux.
- `wxt.docker.config.ts` extends `wxt.config.ts` so the dev server listens on `0.0.0.0:3000` and does not try to open a browser (`webExt: { disabled: true }`).
- Source code is mounted into the container, and `node_modules` lives in a Docker volume so it is not mixed with your OS.

## Common Docker problems

| Problem | Fix |
| ------- | --- |
| `port is already allocated` (3000) | Stop whatever uses port 3000, or stop old containers: `docker compose down`. |
| Changes do not trigger a rebuild on Windows/macOS | Already handled with polling (`CHOKIDAR_USEPOLLING`). Make sure the project is inside the WSL filesystem on Windows for best speed. |
| Files owned by `root` on Linux | Set `HOST_UID` and `HOST_GID` (step 3). Fix existing files with `sudo chown -R $USER .` |
| Strange dependency errors | `bun run docker:clean`, then start again. |
| E2E tests crash the browser | Chromium needs shared memory. The compose file already sets `shm_size: 1gb`. |

More in [Troubleshooting](./troubleshooting.md).

Prefer not to use Docker? See [Manual setup](./setup-manual.md).
