## AI Tasks Specification

Central interface: each task consumes a normalized `ProductData` subset + optional user parameters and returns a typed result. Tasks follow a common lifecycle: cache lookup → provider attempt(s) → heuristic fallback → mock (dev only).

### Shared Types
```ts
interface AiTaskRequest<TInput = any> {
  task: AiTaskType;
  input: TInput;
  locale?: string;            // ISO language code (future)
  offline?: boolean;          // Force heuristic path
  priority?: 'normal' | 'low' | 'high';
}

interface AiTaskResponse<TOutput = any> {
  task: AiTaskType;
  success: boolean;
  data: TOutput | null;
  model?: string;             // Provider model used
  cacheHit?: boolean;
  elapsedMs: number;
  warnings?: string[];
  fallbackUsed?: boolean;     // True if heuristic or secondary provider
  error?: string;             // Present only if success=false
}

type AiTaskType =
  | 'generate.longTail'
  | 'rewrite.bullets'
  | 'generate.meta'
  | 'detect.gaps'
  | 'cluster.keywords'
  | 'suggest.altText';
```

### Task: Long-Tail Modifier Generation (`generate.longTail`)
Purpose: Expand core product context into long-tail search modifiers + variant phrases.
Input: `{ title: string; brand?: string | null; baseKeywords?: string[]; attributes?: Record<string,string[]>; }`
Output: `LongTailSuggestion[]`
```ts
interface LongTailSuggestion { phrase: string; rationale?: string; category?: string; score: number; } // score 0–1
```
Prompt Skeleton (AI):
```
You are generating long-tail keyword modifiers for an e-commerce product.
Product Title: "{title}"
Brand: {brand}
Attributes: {flattenedAttributes}
Return a JSON array of objects: {"phrase": string, "rationale": string, "category": one of [intent, variant, benefit, problem], "score": 0-1 float}.
No extra commentary.
```
Heuristic Fallback:
- Tokenize title, remove stopwords; combine with attribute lists & pattern bank: `[buy|best|affordable|{brand}] {core} for {useCase}`.
- Score = length normalization + uniqueness measure.

### Task: Bullet Rewrite (`rewrite.bullets`)
Purpose: Improve clarity / persuasion while keeping factual grounding.
Input: `{ bullets: string[]; tone?: 'neutral'|'concise'|'enthusiastic'; limit?: number }`
Output: `RewrittenBullet[]`
```ts
interface RewrittenBullet { original: string; rewritten: string; diffHint?: string; length: number; }
```
Prompt Emphasis: keep claims verifiable, no embellishment; enforce max 160 chars.
Heuristic Fallback: Truncate + remove filler adjectives; ensure each starts with an action noun/verb.

### Task: Meta Title & Description (`generate.meta`)
Input: `{ title: string; brand?: string | null; corePhrases?: string[]; }`
Output: `{ metaTitle: string; metaDescription: string; metaTitleLength: number; metaDescriptionLength: number }`
AI Prompt: request char-limited outputs (≤ 60 title, ≤ 155 description) with call-to-action optional.
Fallback: Template: `Buy {title} | {brand?} Official` & Description synthesis from first bullet sentences.

### Task: Attribute Gap Detection (`detect.gaps`)
Input: `{ product: ProductData; expectedKeys?: string[] }`
Output:
```ts
interface AttributeGap { key: string; severity: 'high' | 'medium' | 'low'; suggestion: string; }
interface GapResult { gaps: AttributeGap[]; gapScore: number; classification: 'none'|'mild'|'moderate'|'severe'; }
```
AI Variation: Provide product attributes list → ask model to propose missing buyer-critical attributes (no fabrication— mark uncertainties).
Fallback: Based on canonical list & scoring matrix defined in `PRODUCT_SCRAPER_SPEC.md`.

### Task: Keyword Clustering (`cluster.keywords`)
Input: `{ keywords: string[]; }`
Output:
```ts
interface KeywordCluster { clusterLabel: string; keywords: string[]; rationale?: string; }
```
AI Prompt: Group semantically similar commercial-intent phrases into 3–8 clusters.
Fallback: Jaccard / token overlap + stem-based grouping.

### Task: Image Alt Text Suggestions (`suggest.altText`)
Input: `{ images: { src: string; alt: string | null }[]; title: string; }`
Output: `{ suggestions: { src: string; alt: string }[] }`
AI: Provide product context; require ≤ 120 chars; no keyword stuffing; unique per image.
Fallback: `{brand?} {core noun} – {index-based variant}`.

### Provider Fallback Cascade
1. Primary (configurable) e.g., OpenAI GPT-4o mini / GPT-3.5
2. Secondary (Gemini flash)
3. Tertiary (Deepseek / other clones)
4. Heuristic
5. Mock (dev mode only)

### Caching Strategy
Cache key: `sha256(task + normalizedInput + modelVersion + locale)`
TTL Policies:
- Long-tail: 24h
- Bullets/meta: 6h (changes likely during edits)
- Gaps: 12h
- Alt text: 7d
Storage: in-memory LRU (session) + persistent chrome.storage (layered). Invalidation when product hash changes.

### Cost / Token Awareness (Phase 2)
- Pre-estimate token usage via char length / 3.6
- Store actual usage if provider returns usage metadata
- Add `cost` field to AiTaskResponse in later iteration

### Error Classification
| Code | Meaning | Action |
|------|---------|--------|
| PROVIDER_UNAVAILABLE | Network / 5xx | Retry next provider |
| RATE_LIMIT | 429 | Backoff then fallback |
| INVALID_RESPONSE | JSON parse fail | Attempt heuristic |
| SAFETY_BLOCK | Provider refusal | Redact & heuristic |
| TIMEOUT | Exceeded deadline | Abort & heuristic |

### Streaming / Progressive (Future)
Tasks resolved individually; UI shows partial results as each completes. No token-level streaming required initially.

### Security / Sanitation
- Truncate any single field > 8K chars before prompt
- Strip HTML tags from dynamic prompt sections
- Reject prompt if non-printable control characters detected

### Mock Data Shape (Dev)
Each task supplies deterministic pseudo-output seeded by hash(title) for reproducibility.

---
This specification will evolve; update when adding new tasks or altering contracts.
