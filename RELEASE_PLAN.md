## Release & CI/CD Plan

### Versioning
- Semantic Versioning (SemVer)
- Pre-1.0 rapid minor increments (0.8.x pivot baseline → 0.9.x feature stabilization → 1.0.0 first public wedge release)
- CHANGELOG.md updated each release via conventional commits parsing (future automation)

### Branch Strategy
- `main`: stable, releasable
- `develop` (optional if complexity grows)
- Feature branches: `feat/ai-orchestrator`, `chore/refactor-scraper`, etc.
- Hotfix branches from `main` → patch release

### Commit Convention
`type(scope): message`
Types: feat, fix, chore, docs, refactor, perf, test, build, ci

### Build Pipeline (GitHub Actions Concept)
Jobs:
1. `lint-typecheck`: install deps, run ESLint + `tsc --noEmit`
2. `unit-integration-tests`: run Jest suites
3. `build-extension`: run production build (webpack) → artifact `extension.zip`
4. `e2e`: (optional gating) Playwright with built extension
5. `manifest-validate`: script ensuring required fields + minimized permissions
6. `publish-draft-release` (manual trigger or tag) → attach artifacts

### Packaging Steps
1. Clean dist (`npm run clean` if present)
2. Build (`npm run build`)
3. Strip dev-only logs (define plugin removing blocks guarded by `if (process.env.NODE_ENV !== 'production')`)
4. Verify manifest (script checks):
   - `manifest_version === 3`
   - No `<all_urls>` unless justified
   - Background service worker referenced exists
   - Action popup present
5. Zip `dist/` → `product-listing-optimizer-vX.Y.Z.zip`

### Release Checklist (Pre-Store Submission)
| Item | Status |
|------|--------|
| All secrets removed from repo |  |
| Manifest minimized permissions |  |
| Icons sizes present (16, 32, 48, 128) |  |
| Privacy policy URL (if telemetry enabled) |  |
| Screenshots updated |  |
| Marketing description aligned with feature wedge |  |
| README & CHANGELOG updated |  |
| Lint + tests green |  |
| Bundle size within thresholds |  |
| Manual smoke test (Analyze flow) |  |

### Automated Validations (Proposed Scripts)
- `scripts/verify-extension.js` (already present—extend to include permission diff)
- `scripts/check-bundle-size.js` (fail > target KB)
- `scripts/generate-changelog.js` (optional)

### Error Reporting (Future)
- Optional: lightweight error beacon endpoint (sends hashed stack signature) on unhandled background errors

### Post-Release Monitoring
- Track activation (installs vs first analyze) via telemetry (if accepted)
- Compare AI task error rates release over release

### Rollback Procedure
If critical regression:
1. Re-tag previous stable version
2. Re-upload prior zip to Store (Chrome allows previous version rollback with review)
3. Post mortem entry added to CHANGELOG

### Manual QA Script (Minimal)
1. Load unpacked
2. Open Amazon product page → Analyze
3. Confirm: attributes + at least heuristic long-tail suggestions
4. Toggle offline → ensure tasks rerun heuristically
5. Export copy → clipboard contains structured JSON snippet

### Future Enhancements
- Automated store upload (chrome-webstore-upload CLI) when comfortable
- Signature verification for artifact integrity (hash stored in release notes)

---
Maintain this plan; update when CI pipeline is implemented.
