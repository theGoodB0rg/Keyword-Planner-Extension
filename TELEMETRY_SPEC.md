## Telemetry & Analytics Specification

### Principles
- Privacy-first: minimal collection, user control, no PII
- Resilient: queue & retry without blocking UX
- Actionable: events directly map to product hypotheses (activation, retention, feature usage)

### Opt-In Model
Default: OFF (user must enable “Anonymous performance & usage metrics”).
Setting stored under `settings.telemetryEnabled`.

### Event Transport
- In-memory queue (max 200 events)
- Flushed every 30s or when length ≥ 25
- Background handles network send (POST to configurable endpoint). If endpoint unset, logs locally (dev mode)
- Retry policy: 3 attempts (1s, 5s, 30s) then drop with `dropped=true` flag

### Event Envelope
```ts
interface EventEnvelope<T = any> {
  id: string;            // uuid v4
  type: string;          // dot.notation
  ts: number;            // ms epoch
  data: T;               // payload
  flags?: string[];      // e.g. ['offline','cacheHit']
  domainHash?: string;   // hashed host (SHA-256 + salt)
  version: string;       // extension version
  seq: number;           // monotonic sequence
}
```

### Hashing Strategy
`domainHash = sha256(host + SALT)`
SALT generated on first install, stored in `chrome.storage.local` (never transmitted).

### Core Event Catalog
| Type | Purpose | Key Fields |
|------|---------|------------|
| app.init | Cold start diagnostics | none |
| settings.update | Track feature toggles | changedKeys[] |
| panel.open | Engagement | surface: 'popup' | 
| panel.close | Session length metrics | durationMs |
| analyze.trigger | Funnel start | source: 'popup'|'panel' |
| product.scrape.success | Scrape quality/perf | ms, platform, warningsCount |
| product.scrape.fail | Error tracking | reason, platformGuess |
| ai.task.request | Cost / latency baseline | task, cached:boolean |
| ai.task.complete | Success metrics | task, ms, provider, cacheHit |
| ai.task.error | Reliability | task, code, provider |
| heuristic.used | Offline usage depth | taskType |
| export.perform | Output value | format, sectionsIncluded |
| usage.limit.warning | Monetization gating | remaining |
| usage.limit.block | Monetization gating | task |
| license.plan.set | Upgrade funnel | plan |

### Derived Metrics (External Aggregation)
- Activation Rate: `analyze.trigger` within first 5 minutes / `app.init`
- Task Success Rate: `ai.task.complete` / (`ai.task.complete` + `ai.task.error`)
- Cache Efficiency: `cacheHit true` / all `ai.task.complete`
- Offline Usage Share: `heuristic.used` / all tasks
- Feature Adoption: distinct users using `export.perform` / active users

### Sensitive Data Audit
Exclude: full URL path, user-entered freeform text, raw AI responses.
Include: domainHash, platform detection, time deltas, counts.

### Storage Model
Queue structure in memory; persisted fallback for unsent events:
`chrome.storage.local.set({ telemetryQueue: pendingEvents })` every 60s if non-empty.

### Failure Scenarios
| Scenario | Handling |
|----------|----------|
| Network offline | Keep queue (up to max); drop oldest beyond capacity |
| Endpoint 4xx | Stop retries (invalid request) |
| Endpoint 5xx | Retry schedule |
| Queue overflow | Drop oldest + emit synthetic `telemetry.queue.drop` |

### Development Mode
If `DEV_MODE=true`, events mirrored to console with `[telemetry]` prefix (truncated payload).

### Future Extensions
- Sampling strategy (only 30% of low-value events)
- Differential privacy noise injection for counts
- User-provided debug token enabling extended logs

---
Keep this specification aligned with implemented event constants in `telemetry/events.ts`.
