## Architecture (Pivot: Product Listing Optimizer)

This document describes the target modular architecture for evolving the former "AI Keyword Planner" into a Product Listing Optimizer focused on e‑commerce product pages (Shopify, Amazon, WooCommerce, generic storefronts).

### High-Level Goals
- Deterministic, testable scraping of product attributes
- Central AI orchestration with provider fallback + caching
- Pluggable generators (long‑tail, bullets, meta, gaps) with offline heuristics
- Secure secret isolation (background only) & minimized permissions
- Modern responsive UI (popup + optional side panel injection)
- Privacy-aware telemetry (opt-in, hashed domains)

### Module Map
```
src/
  background/
    aiOrchestrator.ts       # Unified AI task router (providers, retries, cache)
    providerRegistry.ts     # Provider descriptors (OpenAI/Gemini/etc.)
    messaging.ts            # Central message routing (runtime.onMessage)
    licensing.ts            # Usage limits & plan gating
    cacheStore.ts           # Persistent (chrome.storage) cache abstraction
  content/
    inject.ts               # On-demand script/style injection
    scraper/
      productScraper.ts     # Platform detection + attribute extraction
      heuristics.ts          # Offline heuristic generators (long-tail, meta)
      normalization.ts       # Data cleaning / canonicalization
  core/
    tasks/                  # AI task implementations (each returns typed result)
      task-longTail.ts
      task-bullets.ts
      task-meta.ts
      task-gaps.ts
      task-altText.ts
    parsers/
      aiKeywordParser.ts    # Parse raw AI to structured keyword objects
      aiBulletParser.ts
    generators/
      longTailGenerator.ts  # Hybrid rule + AI fallback
      metaGenerator.ts
    cache/
      memoryCache.ts        # In-session LRU
      hash.ts               # Stable hashing utilities
    telemetry/
      events.ts             # Event emit helpers
      queue.ts              # Buffered dispatch & retry
    security/
      sanitize.ts           # HTML & string sanitation utilities
    utils/
      dom.ts
      text.ts
  ui/
    popup/                  # Initial control surface
      App.tsx
      components/
    panel/                  # In-page side panel
      SidePanel.tsx
      sections/
        AttributesView.tsx
        GapsView.tsx
        SuggestionsView.tsx
        ExportView.tsx
  types/
    product.ts              # ProductData, AttributeGap, etc.
    ai.ts                   # Task request/response shapes
    events.ts               # Telemetry events
    licensing.ts            # Plan + quota definitions
```

### Data Flow (Analyze Action)
1. User triggers Analyze (popup or panel CTA)
2. UI sends `TASK:SCRAPE_PRODUCT` to background (or content script handles scrape then responds)
3. Scraper returns `ProductData`
4. Background orchestrator schedules AI tasks in parallel (long-tail, bullets, meta, gaps)
5. Each task checks cache (hash of task type + normalized payload)
6. Provider fallback chain + offline heuristics if offline mode or rate limited
7. Aggregated results streamed incrementally to UI (progressive rendering)

### AI Orchestrator Responsibilities
- Normalize requests (strip large HTML beyond size cap, e.g., 8–12 KB content window)
- Select provider by priority + quota
- Retry policy (exponential backoff, jitter)
- Fallback to next provider then heuristic
- Return structured task-specific payloads

### Offline / Heuristic Layer
Implemented in `heuristics.ts` and `generators/`:
- Long-tail: Tokenize title + attribute matrix (brand × material × size) → combine patterns (`buy {brand} {product} {modifier}`)
- Bullets: Extract top sentences from description, condense length to 120–160 chars
- Meta: Template with dynamic length trimming (≤ 155 chars description)
- Gaps: Compare presence of canonical attribute list vs scraped data

### Security & Permissions
- Replace `<all_urls>` content script with on-demand `chrome.scripting.executeScript`
- Secrets only in background; UI sends abstract task intents
- Sanitize any HTML or alt text (strip tags except safe inline) before AI prompt
- Domain hashing for telemetry (SHA-256 + salt)

### Telemetry Event Shape
```ts
interface TelemetryEvent<T = any> {
  id: string;              // uuid
  type: string;            // e.g., 'product.scrape.success'
  ts: number;              // epoch ms
  data: T;                 // event-specific
  flags?: string[];        // e.g., ['offline','cacheHit']
  version: string;         // extension version
}
```

### Testing Layers
- Unit: parsers, generators, hashing
- Integration: simulated DOM fixtures (Amazon, Shopify)
- E2E: Playwright run against local static product pages
- Performance: Assert scrape <150ms, AI orchestrator concurrency stable

### Planned Future Extensions
- Multi-language pipeline (task-locale param)
- Batch mode (queue + progress UI)
- Team sync (remote storage adapter)

### Open Questions / To Refine
- Where to store heuristic seed lists (materials, colors)?
- How to score attribute gaps (frequency vs importance)?
- Token cost estimation pre-flight (size sampling vs static multiplier)?

---
This document evolves; update as modules are implemented.
