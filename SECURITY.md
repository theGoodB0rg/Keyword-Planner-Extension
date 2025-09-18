## Security & Privacy Guidelines

### Objectives
- Minimize attack surface (least privilege permissions)
- Protect provider API keys (never expose to content/popup contexts)
- Sanitize user-visible & AI-sent content
- Provide transparent, opt-in telemetry respecting user privacy

### Permissions Strategy
Current manifest (legacy) uses broad `<all_urls>` content script. Target refinement:

1. Remove blanket `content_scripts` block for `<all_urls>`.
2. Keep: `"permissions": ["activeTab", "storage", "scripting"]`.
3. Add on-demand injection:
```ts
chrome.scripting.executeScript({ target: { tabId }, files: ['contentScript.js'] });
```
4. If platform-specific host patterns become necessary (Amazon only features), move them to `optional_host_permissions`.

### Secret / API Key Handling
- Keys loaded at build time via environment variable substitution (Webpack DefinePlugin) → stored only in background scope.
- UI sends task descriptors: `{ task: 'generate.meta', inputHash }` NOT raw large text.
- Background truncates + sanitizes before provider calls.
- Reject requests if key not configured; return structured error with guidance.

### Data Minimization
- Only send necessary fields to AI (e.g., top N bullets, truncated description ≤ 2000 chars).
- Strip HTML tags except safe inline formatting before prompt composition.
- Hash domain (SHA-256 with static salt) for telemetry events; store salt locally, do not transmit.

### Sanitization
Use `sanitize.ts` utilities:
- HTML whitelist for description ingestion
- Remove script/style/iframe/object tags
- Reject unexpected control chars (regex: `/[\x00-\x08\x0B\x0C\x0E-\x1F]/`)

### CSP (Popup / Panel Documents)
```
Content-Security-Policy: default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; connect-src https://api.* https://generativelanguage.googleapis.com https://api.openai.com; frame-ancestors 'none';
```

### AI Provider Fallback Safety
- Classify error categories (see `AI_TASKS_SPEC.md`).
- On safety refusal (provider content policy), attempt heuristic path instead of alternate prompt that could encourage circumvention.

### Rate Limiting & Abuse Prevention
- Maintain per-session counter of AI tasks.
- Hard ceiling (e.g., 50 tasks/session free tier) w/ exponential backoff after threshold.

### Telemetry Privacy
- No full URLs; only domain hash + task metadata (duration, cache hit, provider) unless user opts into extended diagnostics.
- Provide toggle in settings: “Send anonymous performance metrics.” Default: OFF (for privacy-first stance) or ON (if clearly justified—decide at product stage).

### Logging Practices
- background: console logs allowed in dev only (`LOG_LEVEL=debug`).
- production: aggregate only warnings/errors (structured JSON).
- Do not log full AI responses (store truncated 200 chars max if needed for debugging, and only when dev mode).

### Mock & Dev Flags
`DEV_MODE` global toggles:
- Allow mock provider injection
- Verbose event tracing
- Visual debug overlay (optional)

### Threat Considerations
| Threat | Mitigation |
|--------|------------|
| Key leakage via UI | Keys never passed to UI context |
| Malicious page DOM injection | Sanitize / content script isolates & minimal usage |
| Over-permission scrutiny (store review) | On-demand scripting vs pre-injected matching all URLs |
| Prompt injection (malicious hidden text) | Truncate, strip non-whitelisted tags, limit description size |
| Data exfiltration through telemetry | Domain hashing + minimal payload |

### Future Hardening (Phase 2+)
- Subresource Integrity (SRI) for any hosted assets (if introduced)
- Signed updates verification script pre-release
- In-memory encryption of recent AI responses if sensitive (likely unnecessary for product data)

---
Maintain this file; update upon introducing new providers, permissions or telemetry scopes.
