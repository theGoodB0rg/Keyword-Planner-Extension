# Product Listing Optimizer – Lean Release Plan (v1.1 → v1.2)

Updated: 2025‑09‑19

## Executive Summary
Ship revenue in 1–2 weeks with an extension‑first approach. Prioritize Chrome Store readiness, minimal local licensing/quota, a hosted checkout + manual activation token, a tiny AI proxy, and UX that clearly shows value. Defer heavy backend and competitor intelligence to post‑launch.

This plan reflects the current codebase: working product scraper, AI orchestrator with heuristic fallbacks, storage + history, and popup UI. The goals below close the gaps called out during review: permissions, monetization mechanics, secure provider usage, and basic telemetry.

---

## 1) Store‑Readiness & Permissions Hardening

Problems today: `public/manifest.json` uses `<all_urls>` for host permissions and content scripts, which risks review friction and reduces user trust.

Actions:
- Narrow content script matches to supported targets initially:
	- Amazon marketplaces (e.g., `https://www.amazon.*/*`)
	- Shopify product pages (e.g., `https://*/products/*` when Shopify detected)
	- WooCommerce product routes when detected
- Prefer on‑demand injection using `chrome.scripting.executeScript` triggered from the action/side panel for generic domains, instead of blanket `<all_urls>`.
- Reduce `host_permissions` accordingly; keep `activeTab`, `storage`, `scripting`, `sidePanel` only.
- Add Privacy Policy URL in store listing (see `PRIVACY.md`).

Deliverables:
- Updated `public/manifest.json` permissions and matches
- Short “Permissions” section in `README.md` mirroring store listing
- Verify via `verify-extension.js` (extend script to fail if `<all_urls>` present)

---

## 2) Licensing & Quota (Local‑First, No Backend)

Goal: Simple, local enforcement so we can charge without standing up a backend.

Data model (stored at `license.info` in `chrome.storage.local`): see `MONETIZATION_PLAN.md` LicenseInfo.

Enforcement (initial):
- Daily allowance counter (e.g., Free: 5/day). Resets at UTC midnight. Warn at 80%.
- Block AI tasks when quota is exceeded; allow scrape + heuristic outputs.
- UI: usage meter in popup; upgrade CTAs on locked chips (padlock icon) and panel footer.

Integration points:
- Wrap calls in `src/background/aiOrchestrator.ts`/`src/background.ts` to check and decrement predicted usage; refund on hard failures.
- Persist counters via `src/utils/storage.ts` under a namespaced key.

---

## 3) Payments (Hosted Checkout + Manual Activation)

Goal: Take payments without a backend initially.

Flow:
1) Hosted checkout page (Stripe/LemonSqueezy/Gumroad) after which the user receives an activation token (signed payload with plan + expiry).
2) In the extension, an “Activate Pro” dialog lets the user paste the token.
3) Local validation: verify signature (public key embedded) and store `license.info`.
4) Optional later: periodic remote re‑validation (weekly) via a minimal endpoint.

Deliverables:
- “Activate Pro” UI (popup) + token storage
- Signature verification utility (no secrets in the extension)
- Basic “Upgrade” page/URL and docs link from the popup

---

## 4) AI Provider Proxy & Caching

Goal: Use providers safely; cap costs; keep reliability high.

Proxy (Cloudflare Worker or Vercel function):
- POST /ai → { model, messages, max_tokens? } → { content }
- Origin allowlist; simple per‑IP/token rate limit; no prompt logging in prod
- Model routing: allow `gpt‑4o‑mini`/`gemini‑1.5‑flash`/similar; configurable

Client changes:
- Point `src/utils/api.ts` to the proxy; remove placeholder keys
- Persisted cache: add a chrome.storage cache keyed by stable hash of {task, input, url}; TTL 7 days
- Keep session cache already in `aiOrchestrator` as first layer
- Fallback to heuristics if proxy/network fails

---

## 5) Telemetry & Metrics (Opt‑in, Minimal)

Goal: Measure usage/conversion without PII.

Initial (no server required):
- Local counters in `chrome.storage.local`: opens, analyses, tasks completed, fallback rate, export usage
- Optional error beacon (hashed stack signature) to a lightweight endpoint (off by default)

Event shape: see `ARCHITECTURE.md` Telemetry Event Shape. Add `TELEMETRY_SPEC.md` link in README.

UI surfaces:
- Basic anonymized counts in a hidden “About/Debug” section (developer mode)

---

## 6) UX for Conversion

Make the upgrade obvious and valuable:
- Usage meter + 80% warning banner
- Padlocked feature chips (e.g., Advanced gap weighting, CSV export, multi‑tone bullets)
- “Heuristic” badge when AI fallback was used
- One‑click export and copy (done); add CSV export behind Pro gating
- Before/after examples in the panel (tone or clarity improvements)

---

## 7) Store Submission Checklist (MVP)

- Manifest v3 minimal permissions (no `<all_urls>`)
- Background service worker present; side panel path valid
- Screenshots: show live product page → panel with suggestions
- Privacy policy URL (link to `PRIVACY.md`)
- Clear description focused on “Product Listing Optimizer” wedge
- Build zip via `npm run build` + `verify-extension.js` checks

---

## 8) Timeline (2 Weeks to Revenue)

Week 1:
- Permissions hardening + manifest updates
- Local licensing/quota (daily allowance, meter, gating)
- “Activate Pro” dialog + local token validation
- Wire proxy URL in `src/utils/api.ts` (proxy stub online)
- Export CSV (Pro‑gated)

Week 2:
- Polished upgrade surfaces; padlock chips; copy tweaks
- Persisted cache layer; cost/time logging to local telemetry
- Store listing (screenshots, description, privacy link) and submission
- Optional: minimal error beacon endpoint + redaction

Success criteria:
- Installable and passes review; first paid activations via token
- Median analysis (heuristic) < 500ms; AI path reliable with fallbacks

---

## 9) Risks & Mitigations

- Store rejection due to permissions → Narrow matches; on‑demand injection; clear rationale
- AI cost overrun → Hash‑based caching; proxy rate limits; heuristic fallback
- Scraper fragility (Amazon DOM shifts) → Selector redundancy; early unsupported notice (already present); add tests with fixtures
- Low conversion → Stronger “Pro” differentiator: advanced gap scoring per platform; CSV export; tone‑controlled bullets

---

## 10) Post‑Launch Roadmap (Phase 3+)

Defer until after initial revenue and validation:

- Market Intelligence Track (backend heavy)
	- Competitor scraping pipelines; trend APIs; SERP analysis
	- Caching/service layers (Redis), job runners, dashboards
	- Price positioning, review sentiment, seasonal patterns

- Extension Enhancements
	- Multi‑language expansion; structured data (JSON‑LD) hints
	- Batch mode; team sharing; admin/usage dashboards
	- Token cost estimation UI; provider selection per task

---

## 11) Immediate Actions (This Repo)

1) Update `public/manifest.json` to remove `<all_urls>` and restrict matches
2) Add local licensing/quota utilities + usage meter in popup
3) Add “Activate Pro” dialog (token paste) + local signature verify
4) Point `src/utils/api.ts` to a minimal proxy; keep heuristics fallback
5) Add persisted cache layer (chrome.storage) keyed by hash
6) Extend `verify-extension.js` to enforce permission checks
7) Prepare store listing assets and submit

Priority order:
1) Permissions → 2) Licensing/Quota → 3) Activate Pro → 4) Proxy + Cache → 5) UX polish → 6) Store submission

Notes:
- Keep docs aligned (`MONETIZATION_PLAN.md`, `ARCHITECTURE.md`, `TELEMETRY_SPEC.md`).
- Do not embed provider secrets; proxy handles keys.

---

## Appendix A — Post‑Launch Market Intelligence Blueprint (Original Plan)

Purpose: Preserve the long‑term differentiators and motivating vision for buyers. This appendix captures the original comprehensive plan as the Market Intelligence track to be executed after the lean MVP ships and monetizes.

### A1) Billing & Subscription Architecture (Serverless‑First)

- GitHub Pages (static) + Vercel Functions (webhooks/validation)
- Flow: Payment (Stripe) → License generation → Extension activation → Usage tracking → Renewal/cancel webhooks
- Components: webhook handlers, license validation API, usage tracking/limits, automatic renew/cancel
- Indicative Pricing (subject to validation):
	- Free: 5 analyses/month (basic keywords only)
	- Pro: $19/month (expanded analyses, trends)
	- Enterprise: $49+/month (competitor tracking, bulk)

### A2) Real‑Time Market Intelligence System

Data Collection Pipeline:
- Sources: Amazon product pages/APIs, Google Trends, SerpApi, curated scrapers
- Data points: competitor keyword usage, 7‑day rolling trends, price positioning, review sentiment, seasonality

AI Enhancement Architecture:
```
Current Page Data → Competitor Analysis (real‑time) → Trend Integration → Enhanced Prompt → Recommendations
```

Caching & Performance:
- Redis/Upstash cache for hot queries; background jobs for refresh; rate limiting

### A3) API Architecture (When Backend Is Introduced)

Core Endpoints:
```
/api/analyze       # Main analysis
/api/competitors   # Live competitor data
/api/trends        # Trending keywords
/api/validate      # License validation
/api/usage         # Usage tracking
/api/billing       # Stripe webhooks
```

AI Proxy System:
- Route calls through backend for cost control and provider abstraction (OpenAI, Claude, Gemini)
- Intelligent model selection per task type

Rate Limiting & Security:
- Per‑user quotas, API key/token management, request validation/sanitization, CORS for extension origins

### A4) Static Site + Docs (GitHub Pages)

Structure:
```
docs/
├─ index.html (landing)
├─ pricing.html
├─ documentation.html
├─ privacy-policy.html
├─ terms-of-service.html
└─ api/ (links to Vercel endpoints)
```

Tracking & Monitoring:
- Privacy‑compliant analytics, error logging, perf tracking

User Management (Later):
- Serverless DB (Supabase/PlanetScale), sessions via JWT, license distribution

### A5) Extension Store Documentation & Marketing Assets

- Manifest MV3 compliance, permissions justification, privacy practices
- Screenshots and video demos showing before/after optimization
- Comparison charts vs. Helium 10/Jungle Scout/MerchantWords

### A6) Competitive Advantage & Positioning

Unique Value:
1) Real‑time competitor insights in‑page
2) Browser‑native, no tab‑hopping
3) AI‑powered, context‑aware optimization
4) Trend‑aware recommendations
5) Price positioning intelligence

Target: Mid‑market Amazon/Shopify sellers; Pain: time‑consuming listing optimization; Solution: instant on‑page improvements.

### A7) Post‑Launch Phases (Indicative)

- MI Phase 1 (Weeks 1–2 post‑launch): Stand up webhooks, validation endpoint, and basic trend ingestion; connect proxy to backend.
- MI Phase 2 (Weeks 3–4): Competitor scraping pipeline (fixtures + rate‑limit strategy), trend/UI integration, cache.
- MI Phase 3 (Weeks 5–6): Performance hardening, billing edge cases, bulk features, CSV/API export.
- MI Phase 4 (Weeks 7–8): Analytics dashboards, more data sources, targeted marketing campaign.

### A8) Cost & Revenue Projections (Directional)

Initial infra: $50–100/mo (Vercel, Supabase, API calls). Scale to $200–500/mo with growth and premium data sources.

Revenue milestones (example only):
- Month 1: $500 (25×$20)
- Month 6: $5k (250×$20)
- Month 12: $15k (500×$30 avg)

### A9) Risks & Mitigations

- API rate limits → provider fallbacks, caching, job queues
- Scrape blocks → selector redundancy, backoff, proxies as needed
- Data accuracy → multi‑source validation; human‑in‑the‑loop checks for prompts
- Performance → cache, batch jobs, pagination

### A10) Success Metrics

- Product: DAU, task completion rates, fallback rate, <5s response targets (AI path may stream)
- Business: MRR, CAC, LTV, churn (<10%/mo)

### A11) Next Steps (When Activating This Track)

1) Lock API contracts; 2) Stand up minimal backend; 3) Secure proxy keys; 4) Add end‑to‑end tests; 5) Iterate on pricing/packaging with real usage data.
