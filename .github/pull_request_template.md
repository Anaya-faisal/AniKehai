## Description
<!-- What does this PR change, and why? Keep it short and focused. -->

Closes #<!-- issue number, or delete this line -->

## Type of Change
<!-- Mark one with "x". -->
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (e.g., a new site strategy)
- [ ] Refactoring (no behavior change)
- [ ] Documentation update
- [ ] Tests only
- [ ] Breaking change (existing behavior changes)

## How Has This Been Tested?
- [ ] `bun run test` passes (or `bun run docker:test`)
- [ ] Loaded the extension in Chrome/Firefox and tried it
- [ ] Discord Rich Presence updates correctly (Watching / Paused / time remaining)
- [ ] Tested on the streaming site(s) changed in this PR

## Checklist
- [ ] My branch is based on `main` and this PR does one thing
- [ ] `bun run lint` passes (run `bun run lint:fix` to auto-fix)
- [ ] `bun run typecheck` passes
- [ ] I added or updated tests (coverage stays above 80% lines / 70% branches)
- [ ] My commit messages follow Conventional Commits (`feat:`, `fix:`, `docs:` ...)
- [ ] I used `logger` instead of `console.log`
- [ ] I did not commit secrets, tokens or `.env` files
- [ ] I updated the docs if setup or behavior changed

### Only for new sites
- [ ] Strategy added in `src/scraper/sites/` and registered in `index.ts`
- [ ] Fixture + unit test added (`tests/fixtures/<site>/watch.html.fixture`)
- [ ] Entry added to `tests/e2e/content-script.spec.ts` and `tests/health/live-dom.spec.ts`
- [ ] Site count updated in `src/scraper/sites/index.test.ts`

## Screenshots (if appropriate)
<!-- For new sites or presence changes, add a screenshot of your Discord status. -->
