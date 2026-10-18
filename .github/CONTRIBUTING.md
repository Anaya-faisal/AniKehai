# Contributing to AniKehai

Thank you for helping out! This page is the **short version** of the rules. Each section links to a longer guide in [`docs/`](../docs/README.md).

---

## 1. Ways to contribute

| You want to...            | Do this                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------ |
| Report a bug              | Open a **Bug Report** issue. Include screenshots, steps and logs (see [Troubleshooting](../docs/troubleshooting.md#how-to-turn-on-logs)). |
| Request a new site        | Open a **New Site Request** issue with the main URL and any mirror or player-iframe domains.    |
| Add a new site yourself   | Follow [Adding a site](../docs/adding-a-site.md).                                                |
| Fix a bug / add a feature | Follow the steps below.                                                                          |
| Improve docs              | Edit files in `docs/` or the root `README.md`. Docs-only PRs are very welcome.                   |

Check the open issues first so you do not duplicate work. For a big change, open an issue to discuss it before coding.

> **Security problem?** Do **not** open a public issue. Use the private reporting steps in [SECURITY.md](./SECURITY.md).

---

## 2. Set up your machine

Pick one:

- **Docker (recommended):** [docs/setup-docker.md](../docs/setup-docker.md). Same environment as CI, nothing to install except Docker.
- **Manual:** [docs/setup-manual.md](../docs/setup-manual.md). Needs Node.js and Bun.

---

## 3. The workflow in 8 steps

1. **Fork** the repo and **clone** your fork.
2. **Create a branch** from `main`, for example `feat/crunchyroll-site` or `fix/paused-timer`.
3. **Make a small, focused change.** One PR = one purpose.
4. **Add or update tests.** New behavior needs a test. Bug fixes need a test that fails without the fix.
5. **Run the checks** (they must all pass):
   ```bash
   bun run lint:fix     # auto-fix formatting and lint
   bun run typecheck    # typescript errors
   bun run test         # unit and integration tests
   ```
   Or run everything at once with `bun run validate`. With Docker: `bun run docker:ci` (also runs the browser E2E tests).
6. **Commit using Conventional Commits** (see below).
7. **Push** and open a Pull Request into `main`. Fill in the PR template.
8. **Respond to review comments.** CI must be green before merge.

---

## 4. The rules (your PR is checked against these)

### Commit messages
Format: `type: short description` (optional scope: `type(scope): description`).

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`.

```
feat(scraper): add crunchyroll site strategy
fix: stop timer drifting after pausing
docs: explain docker setup on Windows
```

A git hook (commitlint) rejects bad messages on your machine.

### Code style
- **Biome** formats and lints everything. Never format by hand: run `bun run lint:fix`.
- TypeScript only. No `any` unless there is a good reason, and then add a comment.
- Use `logger` from `src/shared/logger.ts` instead of `console.log`.
- Do not add dependencies without discussing it first. This is a small extension.

### Tests
- Tests sit next to the code (`src/**/*.test.ts`) or in `tests/`.
- Coverage thresholds are enforced: **80%** lines / functions / statements and **70%** branches.
- Site strategies need a **fixture + unit test + E2E entry + health entry**. See [Adding a site](../docs/adding-a-site.md#checklist).

### Versions
If you bump the version, change **both** `package.json` and `EXTENSION_VERSION` in `src/shared/constants.ts`. A test fails if they differ. Maintainers normally do this at release time, so skip it unless asked.

### Do not
- Commit secrets, tokens or `.env` files (a Gitleaks scan runs on every PR).
- Edit the `<!-- DOWNLOADS:START -->` block in the README. A bot updates it daily.
- Mix unrelated changes in one PR.

Full details: [Contribution workflow](../docs/contribution-workflow.md).

---

## 5. Git hooks (automatic checks)

Installed with [Lefthook](https://github.com/evilmartians/lefthook) and configured in `lefthook.yml`:

| When         | What runs                                          |
| ------------ | -------------------------------------------------- |
| `git commit` | Biome auto-fix on staged files + TypeScript check + commit message check |
| `git push`   | Full unit test suite                               |

If hooks do not run, install them: `bunx lefthook install`. Please do not bypass them with `--no-verify`. CI runs the same checks and will fail anyway.

---

## 6. What CI runs on your PR

| Job                     | Checks                                      |
| ----------------------- | ------------------------------------------- |
| Lint and Typecheck      | `biome ci` + `tsc --noEmit`                 |
| Unit and Integration    | Vitest with coverage thresholds             |
| E2E                     | Real Chromium with the built extension      |
| Build (Chrome, Firefox) | Produces the extension zip for each browser |
| Docker (when Docker files change) | Dockerfile lint + the full suite in containers |
| Security                | `bun audit` + Gitleaks secret scan          |

Replicate it locally first. It saves time.

---

## 7. Pull request checklist

The PR template repeats this list. In short:

- [ ] Branch is based on `main` and the change is focused.
- [ ] `bun run lint`, `bun run typecheck` and `bun run test` pass.
- [ ] Tests added or updated.
- [ ] Commit messages follow Conventional Commits.
- [ ] Tested by loading the extension in a browser (for behavior changes).
- [ ] Screenshot of the Discord status attached (for new sites or presence changes).
- [ ] Docs updated if behavior or setup changed.

Be kind in reviews. See the [Code of Conduct](./CODE_OF_CONDUCT.md).
