import { AiTaskRequest, AiTaskResponse, AiTaskType, ProductData, LongTailSuggestion, MetaSuggestion, RewrittenBullet, GapResult } from '../types/product';
import { getAIAnalysis } from '../utils/api';

// Simple in-memory cache (session only) - will extend to persistent later
const cache = new Map<string, any>();

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

function heuristicGaps(product: ProductData): GapResult {
  const expected = ['material', 'dimensions', 'weight', 'color', 'size', 'brand'];
  const presentKeys = new Set(product.specs.map(s => s.key));
  const gaps = expected
    .filter(k => !presentKeys.has(k))
    .map(k => ({ key: k, severity: 'medium' as const, suggestion: `Add ${k} for completeness` }));
  const gapScore = gaps.length * 2;
  let classification: GapResult['classification'] = 'none';
  if (gapScore > 8) classification = 'severe'; else if (gapScore > 4) classification = 'moderate'; else if (gapScore > 0) classification = 'mild';
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

  try {
    if (req.offline) {
      const data = runHeuristic(req.task, product);
      cache.set(cacheKey, data);
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
        return { task: req.task, success: true, data: parsed, elapsedMs: performance.now() - start, fallbackUsed: !isLongTailArray(parsed) };
      }
      case 'generate.meta': {
        const prompt = `Create metaTitle (<=60 chars) and metaDescription (<=155 chars) as JSON {"metaTitle":"...","metaDescription":"..."} for product: ${product.title}.`; 
        const raw = await aiCall(prompt);
        let meta: MetaSuggestion = heuristicMeta(product);
        try { const j = JSON.parse(raw); if (isMetaSuggestion(j)) { meta = { metaTitle: j.metaTitle.slice(0,60), metaDescription: j.metaDescription.slice(0,160), metaTitleLength: Math.min(j.metaTitle.length,60), metaDescriptionLength: Math.min(j.metaDescription.length,160) }; } } catch {}
        cache.set(cacheKey, meta);
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
        return { task: req.task, success: true, data: results, elapsedMs: performance.now() - start };
      }
      case 'detect.gaps': {
        // Using heuristic only for initial phase
        const gaps = heuristicGaps(product);
        const validated = isGapResult(gaps) ? gaps : heuristicGaps(product);
        cache.set(cacheKey, validated);
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
