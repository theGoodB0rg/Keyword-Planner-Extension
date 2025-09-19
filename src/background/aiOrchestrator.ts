import { AiTaskRequest, AiTaskResponse, AiTaskType, ProductData, LongTailSuggestion, MetaSuggestion, RewrittenBullet, GapResult } from '../types/product';
import { getAIAnalysis } from '../utils/api';

// Simple in-memory cache (session)
const cache = new Map<string, any>();
// Persistent cache (chrome.storage.local) with TTL
const PERSISTENT_CACHE_KEY = 'ai_cache_v1';
const PERSIST_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function getPersistentCache(storeKey: string): Promise<any | null> {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(PERSISTENT_CACHE_KEY, (res) => {
        const bucket = (res && res[PERSISTENT_CACHE_KEY]) || {};
        const entry = bucket[storeKey];
        if (!entry) return resolve(null);
        if (typeof entry.ts !== 'number' || (Date.now() - entry.ts) > PERSIST_TTL_MS) {
          // expired
          try {
            delete bucket[storeKey];
            chrome.storage.local.set({ [PERSISTENT_CACHE_KEY]: bucket }, () => resolve(null));
          } catch { resolve(null); }
          return;
        }
        resolve(entry.data);
      });
    } catch { resolve(null); }
  });
}

async function setPersistentCache(storeKey: string, data: any): Promise<void> {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(PERSISTENT_CACHE_KEY, (res) => {
        const bucket = (res && res[PERSISTENT_CACHE_KEY]) || {};
        bucket[storeKey] = { data, ts: Date.now() };
        chrome.storage.local.set({ [PERSISTENT_CACHE_KEY]: bucket }, () => resolve());
      });
    } catch { resolve(); }
  });
}

function hash(obj: any): string {
  try { return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))).slice(0, 64); } catch { return Math.random().toString(36).slice(2); }
}

// Heuristic fallbacks (very naive initial versions)
function heuristicLongTail(product: ProductData): LongTailSuggestion[] {
  const base = product.title.split(/\s+/).filter(w => w.length > 3).slice(0, 4).join(' ');
  const patterns = ['buy', 'best', 'affordable', 'discount', 'for sale'];
  return patterns.map((p, i) => ({ phrase: `${p} ${base}`.toLowerCase(), score: 0.4 + i * 0.05 })).slice(0, 5);
}

function heuristicMeta(product: ProductData): MetaSuggestion {
  const title = product.title.slice(0, 55);
  const metaTitle = `${title} | Buy Online`;
  const descSource = (product.bullets[0] || product.descriptionText.slice(0, 120)).replace(/\s+/g, ' ').trim();
  const metaDescription = (descSource + ' Fast shipping.').slice(0, 150);
  return { metaTitle, metaDescription, metaTitleLength: metaTitle.length, metaDescriptionLength: metaDescription.length };
}

function heuristicBullets(product: ProductData): RewrittenBullet[] {
  return product.bullets.slice(0, 5).map(b => {
    const trimmed = b.replace(/\.$/, '').trim();
    return { original: b, rewritten: trimmed.slice(0, 155), length: trimmed.length };
  });
}

export function getExpectedAttributes(platform: ProductData['detectedPlatform']): string[] {
  const base = ['material', 'dimensions', 'weight', 'color', 'size', 'brand'];
  const perPlatform: Record<ProductData['detectedPlatform'], string[]> = {
    amazon: [...base, 'asin', 'country of origin', 'item model number'],
    shopify: [...base, 'sku'],
    woocommerce: [...base, 'sku'],
    generic: base,
  };
  return perPlatform[platform] || base;
}

export function classifyGapScore(gapScore: number): GapResult['classification'] {
  if (gapScore > 8) return 'severe';
  if (gapScore > 4) return 'moderate';
  if (gapScore > 0) return 'mild';
  return 'none';
}

function heuristicGaps(product: ProductData): GapResult {
  const expected = getExpectedAttributes(product.detectedPlatform);
  const presentKeys = new Set(product.specs.map(s => s.key));
  const gaps = expected
    .filter(k => !presentKeys.has(k))
    .map(k => ({ key: k, severity: 'medium' as const, suggestion: `Add ${k} for completeness` }));
  const gapScore = gaps.length * 2;
  const classification = classifyGapScore(gapScore);
  return { gaps, gapScore, classification };
}

// ---------------- Validation Helpers ----------------
function isLongTailArray(v: any): v is LongTailSuggestion[] {
  return Array.isArray(v) && v.every(o => o && typeof o.phrase === 'string' && typeof o.score === 'number');
}
function isMetaSuggestion(v: any): v is MetaSuggestion {
  return v && typeof v.metaTitle === 'string' && typeof v.metaDescription === 'string';
}
function isRewrittenBullets(v: any): v is RewrittenBullet[] {
  return Array.isArray(v) && v.every(o => o && typeof o.rewritten === 'string');
}
function isGapResult(v: any): v is GapResult {
  return v && Array.isArray(v.gaps) && typeof v.gapScore === 'number';
}

async function aiCall(prompt: string): Promise<string> {
  return getAIAnalysis(prompt);
}

async function runTask(req: AiTaskRequest, product: ProductData): Promise<AiTaskResponse> {
  const start = performance.now();
  const cacheKey = hash({ t: req.task, inp: req.input, url: product.url });
  if (cache.has(cacheKey)) {
    return { task: req.task, success: true, data: cache.get(cacheKey), cacheHit: true, elapsedMs: 0 };
  }
  const persisted = await getPersistentCache(cacheKey);
  if (persisted != null) {
    cache.set(cacheKey, persisted);
    return { task: req.task, success: true, data: persisted, cacheHit: true, elapsedMs: 0 };
  }

  try {
    if (req.offline) {
      const data = runHeuristic(req.task, product);
  cache.set(cacheKey, data);
  setPersistentCache(cacheKey, data).catch(()=>{});
      return { task: req.task, success: true, data, elapsedMs: performance.now() - start, fallbackUsed: true };
    }

    switch (req.task) {
      case 'generate.longTail': {
        const prompt = `Generate 8 JSON objects each with phrase,rationale,score (0-1) long-tail e-commerce modifiers for product: ${product.title}. ONLY output JSON array.`;
        const raw = await aiCall(prompt);
        let parsed: any = null;
        try { parsed = JSON.parse(raw); } catch { parsed = heuristicLongTail(product); }
        if (!isLongTailArray(parsed)) {
          parsed = heuristicLongTail(product);
        }
        cache.set(cacheKey, parsed);
        setPersistentCache(cacheKey, parsed).catch(()=>{});
        return { task: req.task, success: true, data: parsed, elapsedMs: performance.now() - start, fallbackUsed: !isLongTailArray(parsed) };
      }
      case 'generate.meta': {
        const prompt = `Create metaTitle (<=60 chars) and metaDescription (<=155 chars) as JSON {"metaTitle":"...","metaDescription":"..."} for product: ${product.title}.`; 
        const raw = await aiCall(prompt);
        let meta: MetaSuggestion = heuristicMeta(product);
        try { const j = JSON.parse(raw); if (isMetaSuggestion(j)) { meta = { metaTitle: j.metaTitle.slice(0,60), metaDescription: j.metaDescription.slice(0,160), metaTitleLength: Math.min(j.metaTitle.length,60), metaDescriptionLength: Math.min(j.metaDescription.length,160) }; } } catch {}
        cache.set(cacheKey, meta);
        setPersistentCache(cacheKey, meta).catch(()=>{});
        return { task: req.task, success: true, data: meta, elapsedMs: performance.now() - start };
      }
      case 'rewrite.bullets': {
        const prompt = `Rewrite these bullets (JSON array of strings, keep facts, max 160 chars each): ${JSON.stringify(product.bullets.slice(0,5))}`;
        const raw = await aiCall(prompt);
        let results: RewrittenBullet[] = heuristicBullets(product);
        try { const arr = JSON.parse(raw); if (Array.isArray(arr)) { results = arr.map((r: string, i: number) => ({ original: product.bullets[i] || '', rewritten: (r||'').slice(0,160), length: (r||'').length })); } } catch {}
        if (!isRewrittenBullets(results)) {
          results = heuristicBullets(product);
        }
        cache.set(cacheKey, results);
        setPersistentCache(cacheKey, results).catch(()=>{});
        return { task: req.task, success: true, data: results, elapsedMs: performance.now() - start };
      }
      case 'detect.gaps': {
        // Using heuristic only for initial phase
        const gaps = heuristicGaps(product);
        const validated = isGapResult(gaps) ? gaps : heuristicGaps(product);
        cache.set(cacheKey, validated);
        setPersistentCache(cacheKey, validated).catch(()=>{});
        return { task: req.task, success: true, data: validated, elapsedMs: performance.now() - start, fallbackUsed: true };
      }
      default:
        return { task: req.task, success: false, data: null, elapsedMs: performance.now() - start, error: 'Unknown task' };
    }
  } catch (error: any) {
    const heuristic = runHeuristic(req.task, product);
    return { task: req.task, success: true, data: heuristic, elapsedMs: performance.now() - start, fallbackUsed: true, error: error?.message };
  }
}

function runHeuristic(task: AiTaskType, product: ProductData): any {
  switch (task) {
    case 'generate.longTail': return heuristicLongTail(product);
    case 'generate.meta': return heuristicMeta(product);
    case 'rewrite.bullets': return heuristicBullets(product);
    case 'detect.gaps': return heuristicGaps(product);
    default: return null;
  }
}

export async function optimizeProduct(product: ProductData, offline = false) {
  const tasks: AiTaskRequest[] = [
    { task: 'generate.longTail', input: { title: product.title }, offline },
    { task: 'generate.meta', input: { title: product.title }, offline },
    { task: 'rewrite.bullets', input: { bullets: product.bullets.slice(0,5) }, offline },
    { task: 'detect.gaps', input: { specs: product.specs }, offline }
  ];
  const results = await Promise.all(tasks.map(t => runTask(t, product)));
  return results;
}

export type OptimizationProgressEvent = {
  task: AiTaskType;
  status: 'start' | 'done' | 'error';
  elapsedMs?: number;
  fallbackUsed?: boolean;
};

export async function optimizeProductWithProgress(
  product: ProductData,
  offline = false,
  onProgress?: (e: OptimizationProgressEvent) => void
) {
  const tasks: AiTaskRequest[] = [
    { task: 'generate.longTail', input: { title: product.title }, offline },
    { task: 'generate.meta', input: { title: product.title }, offline },
    { task: 'rewrite.bullets', input: { bullets: product.bullets.slice(0,5) }, offline },
    { task: 'detect.gaps', input: { specs: product.specs }, offline }
  ];
  const results: AiTaskResponse[] = [];
  for (const t of tasks) {
    onProgress?.({ task: t.task, status: 'start' });
    try {
      const r = await runTask(t, product);
      results.push(r);
      onProgress?.({ task: t.task, status: 'done', elapsedMs: r.elapsedMs, fallbackUsed: r.fallbackUsed });
    } catch {
      onProgress?.({ task: t.task, status: 'error' });
    }
  }
  return results;
}
