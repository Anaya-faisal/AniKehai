# Manual Setup (without Docker)

Use this if you do not want Docker. You install the tools yourself.

## 1. Install the requirements

| Tool | Version | Notes |
| ---- | ------- | ----- |
| [Node.js](https://nodejs.org/) | **>= 25.8.2** | Required by `package.json` (`engines`) |
| [Bun](https://bun.sh/) | **>= 1.3.14** | Package manager and script runner |
| [Git](https://git-scm.com/) | any recent | |
| Chrome or Firefox | recent (Firefox **>= 142**) | To try the extension |

Check:

```bash
node --version
bun --version
git --version
```

**Windows tip:** install Bun with PowerShell: `powershell -c "irm bun.sh/install.ps1 | iex"`. Using WSL 2 also works well.

## 2. Get the code

```bash
git clone https://github.com/<your-username>/AniKehai.git
cd AniKehai
```

## 3. Install dependencies

```bash
bun install
```

This also runs `wxt prepare` (generates the `.wxt/` folder with TypeScript settings). If `.wxt/` is missing later, run `bunx wxt prepare`.

## 4. Install the Git hooks

```bash
bunx lefthook install
```

The hooks run Biome and a type check when you commit, check your commit message, and run the tests when you push. Details: [Contribution workflow](./contribution-workflow.md#git-hooks).

## 5. Start the dev server

```bash
bun run dev:chrome      # opens Chrome with the extension loaded
bun run dev:firefox     # opens Firefox with the extension loaded
```

WXT opens a browser with the extension already installed and **hot-reloads** when you save.

If no browser opens (e.g. WXT cannot find it), load it yourself:

- **Chrome:** `chrome://extensions` → Developer mode → **Load unpacked** → select `.output/chrome-mv3-dev`.
- **Firefox:** `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on...** → select `manifest.json` in the matching `.output/firefox-*-dev` folder.

## 6. Link Discord and try it

1. Click the extension icon and press **Link with Discord**.
2. Log in on Discord's page and authorize.
3. Open an episode on a [supported site](https://anikehai.vercel.app/#sites).
4. Open Discord (same account) and look at your status.

> **Chrome note:** the manifest pins an extension key so the OAuth redirect URL stays the same during development. You do not need to do anything.

## 7. Install the browser for E2E tests (one time)

Only needed if you run the browser tests:

```bash
bun run test:e2e:install
```

## 8. Everyday commands

| Command | What it does |
| ------- | ------------ |
| `bun run dev:chrome` / `dev:firefox` | Dev server with hot reload |
| `bun run build:chrome` / `build:firefox` | Production build into `.output/` |
| `bun run zip:chrome` / `zip:firefox` | Build and zip for release |
| `bun run lint` | Check style and lint (read-only) |
| `bun run lint:fix` | Fix style and lint automatically |
| `bun run format` | Format only |
| `bun run typecheck` | TypeScript check |
| `bun run test` | Run unit and integration tests once |
| `bun run test:watch` | Re-run tests when files change |
| `bun run test:coverage` | Tests + coverage report (thresholds enforced) |
| `bun run test:e2e` | Build, then run Chromium E2E tests |
| `bun run test:health` | Check live sites' selectors |
| `bun run validate` | `lint` + `typecheck` + `test` in one go |

Run `bun run validate` before every push.

## Common problems

| Problem | Fix |
| ------- | --- |
| `Cannot find module '.wxt/tsconfig.json'` | Run `bunx wxt prepare`. |
| Node version error on install | Upgrade Node to 25.8.2 or newer. |
| Lint errors on a fresh checkout | Run `bun run lint:fix`. CRLF line endings on Windows can cause these. The repo enforces LF through `.gitattributes` and `.editorconfig`. |
| E2E: "run `bun run build:chrome` first" | Use `bun run test:e2e`, which builds first. |
| Commit rejected | Your message does not follow Conventional Commits. See [the format](./contribution-workflow.md#5-commit-messages). |

More in [Troubleshooting](./troubleshooting.md).

Prefer a ready-made environment? See [Docker setup](./setup-docker.md).
