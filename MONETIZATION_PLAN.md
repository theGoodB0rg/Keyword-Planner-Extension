## Monetization & Licensing Plan

### Objectives
- Provide clear free value (activation) while nudging upgrade for power workflows
- Control API costs via quota and caching
- Keep architecture flexible for future hosted backend or local-only mode

### Proposed Tiers
| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Daily analyses | 5 | 200 (fair use) | Unlimited* |
| Long-tail suggestions | Basic (≤15) | Enhanced (scored + categories) | Custom tuning |
| Bullet rewrites | Single tone | Multi-tone + diff view | Team style presets |
| Meta generation | ✓ | ✓ | ✓ (multi-locale) |
| Attribute gap detection | Basic | Advanced weighting | Custom taxonomy |
| Variant matrix | – | ✓ | Bulk batch |
| Multi-language | – | 3 languages | 15+ locales |
| Export formats | Copy only | CSV / JSON | API / batch export |
| Alt text suggestions | – | ✓ | ✓ (image analysis upgrade) |
| Structured data hints | – | ✓ | ✓ (auto embed) |
| Priority AI / faster models | – | ✓ | SLA windows |
| Team seats | – | – | Included |
| Admin / usage dashboard | – | – | ✓ |

*Soft limits with acceptable use policy.

### Licensing Representation
```ts
interface LicenseInfo {
  plan: 'free' | 'pro' | 'enterprise';
  dailyAllowance: number;        // analyses/day
  usedToday: number;             // reset at UTC midnight
  features: Record<string, boolean>;
  expiresAt?: number;            // for trials
}
```

Stored in `chrome.storage.local` keyed `license.info`. Trials flagged with `trial: true`.

### Quota Enforcement
Flow:
1. On analyze trigger → increment predicted usage (optimistic)
2. If result fails critically → decrement (refund)
3. At 80% threshold fire `usage.limit.warning` and surface the hero preview meter copy
4. At limit: block AI tasks; allow scrape + offline heuristics; show upgrade CTA
5. Activating BYOK disables the preview allowance and removes gating while the key is stored locally

### Upgrade Surfaces
- Panel footer (Usage meter clickable)
- Locked feature chips (variant matrix) → small padlock icon → modal
- Post-task toast: “Enhanced gap scoring in Pro” after 2 free gap uses

### Pricing (Indicative, adjust after user interviews)
- Free: $0
- Pro: $12–$19 / month (annual discount)
- Enterprise: Custom (> $99 / month) billed via direct contact

### Payment Integration (Phase Later)
- Use external hosted webpage for checkout (Stripe) returning license token
- Token validated locally via signed payload (JWT-like) or periodic remote check (optional)

### Local Validation (Initial Simplification)
- Simple JSON license file / code pasted by user (manual activation) for early private beta

### Cost Control Mechanisms
- AI caching (hash-based) to reduce duplicate charges
- Heuristic fallback when model cost above threshold (if provider cost surfaces later)

### Abuse / Edge Cases
- Rapid analyze spam: debounce (min 3s between full analyses)
- Clock tampering: store last reset day; if system date < stored date, do not reset until real midnight passes

### Telemetry Metrics for Monetization
- Conversion proxy: distinct users seeing upgrade CTA vs clicking
- Blocked usage count (demand sizing)
- Feature interest: counts of locked feature interactions

### Future Expansion
- Per-seat licensing (store user identity hash)
- Usage pooling for teams (shared quota)
- In-app A/B tests of value messaging (“Pro adds variant matrix” vs “Pro adds 4 languages”)

---
Refine after first 25 active users’ qualitative feedback.
