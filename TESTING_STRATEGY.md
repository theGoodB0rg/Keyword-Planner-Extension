## Testing Strategy

### Goals
- Catch regressions in scraping, parsing, and AI task wiring early
- Provide confidence for refactors & marketplace submission
- Keep feedback loop fast (unit < 1s, integration < 5s local)

### Test Pyramid
| Layer | Focus | Tools |
|-------|-------|-------|
| Unit | Pure functions (parsers, normalizers, heuristics) | Jest / ts-jest |
| Integration | DOM extraction on fixture HTML, AI task orchestration with mocks | Jest + jsdom / custom harness |
| E2E | User flows (analyze, panel display, export) | Playwright |
| Performance | Scrape timing, bundle size guardrails | Node timing harness + size-check script |

### Unit Test Targets
- `normalization.ts`: price parsing, bullet cleanup
- `heuristics.ts`: long-tail generator rule outputs deterministic with seed
- `hash.ts`: stable hashing across sessions
- `aiKeywordParser.ts`: parse sample AI outputs → structured objects
- `metaGenerator.ts`: enforce length caps and trimming

### Integration Tests
Fixtures under `tests/fixtures/{platform}/sample*.html`:
- Load HTML into jsdom; run `productScraper.ts` → compare snapshot (allow minor dynamic fields)
- Simulate AI orchestrator with provider mocks (success, invalid JSON, fallback)
- Cache layer: first call → provider; second call → cacheHit

### E2E Tests (Playwright)
Scaffold:
- Launch Chrome with extension loaded (temporary unpacked build)
- Navigate to local static product page server (`npm run serve:fixtures`)
- Trigger analyze via popup
- Assert:
  - Panel injected
  - Attribute section filled
  - At least one long-tail suggestion present
  - Export copy places clipboard text (Playwright clipboard API)

### Performance Checks
- Node script loads large fixture HTML, measures scraper duration; fail if > 250ms
- Build size script: parse Webpack stats → fail if panel bundle > 300KB gzipped (initial target)

### Mocks & Fakes
- AI provider: simple deterministic JSON generator based on hash(prompt)
- Telemetry: in-memory sink asserting events during flows

### Test Data Management
- Synthetic bullets & descriptions designed to cover edge cases: long sentences, HTML tags, missing price, variant placeholders

### CI Integration (Future)
GitHub Actions steps:
1. Install deps
2. Type check (`tsc --noEmit`)
3. Lint (`eslint .`)
4. Unit + integration tests
5. Build (production)
6. Playwright e2e (headless) with extension
7. Artifact: build zip + coverage report

### Coverage Goals (Initial)
- Statements: 70%
- Branches: 60%
- Lines: 70%
Adjust upward post-stabilization.

### Flakiness Mitigation
- Avoid network in tests (all providers mocked)
- Fixed random seeds for heuristic generation
- Debounce panel injection events in test harness

### Tooling Enhancements (Later)
- Visual regression (optional) via Playwright screenshots
- Mutation testing (Stryker) for parser robustness (optional)

---
Iterate this strategy as implementation progresses; update coverage targets once baseline reliability achieved.
