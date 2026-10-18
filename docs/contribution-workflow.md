# Contribution Workflow

Everything you need to know to get a PR merged without back-and-forth. The one-page summary is [CONTRIBUTING.md](../.github/CONTRIBUTING.md); this is the detailed version.

## 1. Fork, clone, branch

```bash
git clone https://github.com/<your-username>/AniKehai.git
cd AniKehai
git remote add upstream https://github.com/minkxx/AniKehai.git
git fetch upstream
git checkout -b feat/my-change upstream/main 
```

- Branch from **`main`**. CI runs on `main`.
- Name branches `type/short-description`: `feat/crunchyroll-site`, `fix/timer-drift`, `docs/docker-windows`.
- Keep your branch up to date: `git fetch upstream && git rebase upstream/main`.

## 2. Keep changes small

One PR does **one** thing. A new site, a bug fix and a refactor are three PRs. Small PRs get reviewed faster.

## 3. Code standards

### Formatting and linting: Biome

- Config is in `biome.json`: **tabs**, **double quotes**, sorted imports.
- Never format by hand. Run `bun run lint:fix`.
- CI runs `biome ci`, so anything `bun run lint` reports must be fixed before merge.
- The `.editorconfig` file tells your editor to use LF line endings. Install the Biome extension for VS Code (`biomejs.biome`; the dev container installs it for you).

### TypeScript

- Strict types. Avoid `any`. If you truly need it, add a `// biome-ignore ...: reason` comment explaining why.
- Use the shared types in `src/shared/types.ts`.
- `bun run typecheck` must pass.

### Conventions

| Do | Don't |
| -- | ----- |
| Use `logger.log/warn/error` from `src/shared/logger.ts` | Use `console.log` (it is silent-by-default for a reason) |
| Return `null` when a page element is missing | Throw from a strategy |
| Put constants in `src/shared/constants.ts` | Scatter magic numbers |
| Keep UI in `popup/components`, logic in `core/` | Put Discord logic in React components |
| Make popup elements accessible (`aria-label`, roles) | Click-only `div`s |
| Catch and log errors from async calls (`.catch(err => logger.error(...))`) | Leave unhandled promise rejections |
| Keep dependencies minimal | Add a library for one small helper |

### Security habits

- Never log or expose `discord_token` to content scripts or web pages.
- Treat scraped page text as untrusted input.
- Do not add new `host_permissions` unless needed for a supported site.
- Never commit secrets or `.env` files. A Gitleaks scan runs in CI.

## 4. Tests

Add or update tests for every behavior change. See [Testing](./testing.md).

- Bug fix → a test that fails before and passes after.
- New site → fixture, unit test, E2E entry, health entry.
- Coverage thresholds are enforced (80% lines/functions/statements, 70% branches).

## 5. Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/), enforced by commitlint.

```
type(optional-scope): short description in present tense
```

| Type | Use for |
| ---- | ------- |
| `feat` | A new feature or site |
| `fix` | A bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no logic change |
| `refactor` | Code change that is not a fix or feature |
| `perf` | Performance improvement |
| `test` | Adding or fixing tests |
| `build` | Build system or dependencies |
| `ci` | CI configuration |
| `chore` | Maintenance (e.g. version bumps, tooling) |

Examples:

```
feat(scraper): add crunchyroll site strategy
fix(gateway): reset backoff after a successful READY
docs: add docker setup guide
test(popup): cover privacy toggle rollback
```

Subject case is not enforced, but keep it short and clear. A bad message is rejected when you commit.

## Git hooks

Lefthook runs these automatically. Install them once with `bunx lefthook install` (the dev container does this for you):

| Hook | Runs |
| ---- | ---- |
| `pre-commit` | `biome check --write` on staged files (fixes and re-stages them) **and** `bun run typecheck`, in parallel |
| `commit-msg` | commitlint on your message |
| `pre-push` | `bun run test` |

If a hook fails, fix the problem and commit again. Do not use `--no-verify`: CI runs the same checks.

## 6. Before you push

```bash
bun run validate          # lint + typecheck + test
```

Touching E2E, build, Docker or the manifest? Also run `bun run test:e2e` (or `bun run docker:ci`).

Manual check for behavior changes: load the extension, open a supported site, and confirm your Discord status. Take a screenshot for the PR.

## 7. Open the pull request

- Target the **`main`** branch.
- Title: same style as a commit, e.g. `feat(scraper): add crunchyroll`.
- Fill in the PR template. Link issues with `Closes #12`.
- Mark the PR as a draft if you want early feedback.

## 8. What CI checks

| Workflow | Checks |
| -------- | ------ |
| `ci.yml` → quality | `biome ci .` + `bun run typecheck` |
| `ci.yml` → test | `vitest run --coverage` and coverage thresholds |
| `ci.yml` → e2e | Playwright in Chromium with the built extension |
| `ci.yml` → build | `wxt zip` for Chrome and Firefox |
| `docker.yml` (when Docker files change) | hadolint, compose validation, full suite in containers, production build |
| `security.yml` | `bun audit` and Gitleaks |

All must be green before merge.

## 9. Code review

- Reviewers may ask for changes. That is normal, not a judgment of you.
- Push fixes as new commits (or amend and force-push on your own branch).
- Reply to comments when done. Resolve conversations you addressed.
- Be kind. See the [Code of Conduct](../.github/CODE_OF_CONDUCT.md).

## 10. Versions and releases (maintainers)

You normally do **not** touch these.

- Version lives in **two** places that must match: `package.json` and `EXTENSION_VERSION` in `src/shared/constants.ts` (a test checks it, and the E2E build test checks the manifest too).
- Pushing a tag like `v2.6.2` triggers `release.yml`, which builds the Chrome and Firefox zips and publishes a GitHub release with generated notes.
- The README download badges (between `<!-- DOWNLOADS:START -->` and `<!-- DOWNLOADS:END -->`) are rewritten daily by a bot. Do not edit them.
- The README mentions the current version in the badge and the zip file names. Update those when releasing.

## 11. Documentation changes

Changed setup, scripts, behavior or structure? Update the docs in the same PR:

| Change | Update |
| ------ | ------ |
| New npm script | [setup-manual.md](./setup-manual.md), [setup-docker.md](./setup-docker.md) |
| New folder or file type | [project-structure.md](./project-structure.md) |
| New message type or flow | [how-it-works.md](./how-it-works.md) |
| New site | The supported-sites table in [project-structure.md](./project-structure.md) |
| New rule | This file and [CONTRIBUTING.md](../.github/CONTRIBUTING.md) |

## Quick PR checklist

- [ ] Branch from `main`, one purpose
- [ ] `bun run validate` passes
- [ ] Tests added/updated, coverage holds
- [ ] Conventional commit messages
- [ ] No secrets, no `console.log`
- [ ] Docs updated if needed
- [ ] Screenshot for presence changes
- [ ] PR template filled in
