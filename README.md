# Product Listing Optimizer (Pivoted from AI Keyword Planner)

[![Build Status](https://github.com/theGoodB0rg/Keyword-Planner-Extension/actions/workflows/build.yml/badge.svg)](https://github.com/theGoodB0rg/Keyword-Planner-Extension/actions/workflows/build.yml)

An AI-assisted Chrome Extension that analyzes live e‑commerce product pages (Amazon, Shopify, WooCommerce & generic storefronts) and generates:
- Attribute gap insights (what’s missing vs expected)
- Long‑tail & variant keyword modifiers
- Rewritten SEO bullets & meta title/description
- Offline heuristic suggestions when AI is unavailable

This repository was originally an AI Keyword Planner; it is being refactored toward a focused Product Listing Optimizer. Some sections below refer to legacy functionality and will be updated as the pivot progresses.

## Current Feature Set (Transition State)

Implemented (Transition + New Pivot Elements):
- Real-time page content scraping (generic)
- Product attribute scraping scaffold (title, price, bullets, specs, variants)
- AI keyword text suggestions (legacy raw → structured parsing WIP)
- Product optimization panel (long-tail, meta, bullets, gaps) with cached persistence
- Split loading states (keywords vs optimization) for faster perceived response
- Refresh optimization action (re-runs tasks without reloading page keywords)
- Export & copy (text export + JSON copy for optimization result)
- Offline mode flag + heuristic fallbacks (meta, long-tail, bullets, gaps)
- Multi-provider AI fallback + retries + mock data
- Basic optimization history (latest + rolling list persisted)

In Progress (Pivot Features):
- Enhanced attribute normalization (dimensions, material, weight)
- Advanced gap scoring (severity weighting + platform expectations)
- Provider cost-aware caching & task-level telemetry (planned)
- Streaming task updates (task-level progress events)
- Side panel / overlay UI (beyond popup) with progressive rendering

Planned (Roadmap):
- Variant matrix expansion & enrichment heuristics
- Structured data (JSON-LD) suggestions
- Multi-language expansion (ES/DE/FR)
- Image alt text enhancement & compression hints
- Usage limits & plan gating
- Bulk export (CSV / JSON / clipboard bundles, multi-product)
- Historical comparison diffing (optimization snapshots)
- Optional OpenAPI local micro-backend (for secure provider keys)

## Tech Stack

- React + TypeScript for UI
- Chrome Extension Manifest V3
- Styled Components for styling
- Local storage fallbacks for offline usage

## Development Setup

1. Clone the repository

```
git clone https://github.com/theGoodB0rg/Keyword-Planner-Extension.git
cd Keyword-Planner-Extension
```

2. Install dependencies

```
npm install
```

3. Run in development mode

```
npm run dev
```

This will compile the extension and watch for changes.

4. Load the extension in Chrome

- Open Chrome and navigate to `chrome://extensions/`
- Enable "Developer mode" (toggle in the top right)
- Click "Load unpacked" and select the `dist` folder from your project directory

5. Testing offline mode

The extension is built with offline capabilities by default. Toggle "Offline Mode" in the popup to test functionality without external API calls.

## Building for Production

```
npm run build
```

This will create a production-ready build in the `dist` folder.

## Architecture (High-Level)

See `ARCHITECTURE.md` for the evolving module map.

Core layers:
- Scraper (platform-aware product data extraction)
- AI Orchestrator (task routing, provider fallback, caching)
- Generators / Heuristics (offline & hybrid logic)
- UI (popup + forthcoming injected side panel / overlay)
- Telemetry (opt-in, privacy-preserving)
- Storage (chrome.storage + local fallback, namespaced keys)

## Resilience & Fallback Layers

1. API retry logic (exponential backoff)
2. Multi-provider AI fallback chain
3. Offline heuristic generation (long-tail, meta, bullets)
4. Local storage + in-memory caching
5. Mock data injection (developer mode)

Planned:
6. Token cost estimation + caching dashboard
7. Graceful degradation (progressive UI updates)
 8. Task-level streaming progress (per sub-task)
 9. Persistent optimization history timeline

## Privacy & Data Handling

See `PRIVACY.md` for details.

- Only analyzes the active page when invoked
- Stores results locally (chrome.storage.local)
- Offline heuristics avoid network calls
- For online AI usage, configure a secure proxy for provider keys; keys are never shipped in the extension

## Contributing & Roadmap

Roadmap highlights (see `ROADMAP.md` soon):
- Phase 1: Core pivot (scraper refactor, orchestrator, heuristics)
- Phase 2: Panel UX, export, gating
- Phase 3: Multi-language & structured data

Contributions welcome once interfaces stabilize (target v0.9.x).

## License

ISC (subject to change if commercial licensing introduced for Pro tiers)

---
For detailed architecture decisions refer to: `ARCHITECTURE.md` (present) and forthcoming: `SECURITY.md`, `CONFIGURATION.md`, `PROMPTS.md`.