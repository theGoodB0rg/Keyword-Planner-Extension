import { AiTaskRequest, AiTaskResponse, AiTaskType, ProductData, LongTailSuggestion, MetaSuggestion, RewrittenBullet, GapResult } from '../types/product';
import { getAIAnalysis } from '../utils/api';
import { filterKeywords, isStopword, calculateKeywordRelevance } from '../utils/stopwords';
import { calculateLongTailConfidence, calculateMetaConfidence, calculateBulletConfidence, calculateGapConfidence } from '../utils/confidence';

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

// Calculate text similarity using Jaccard index (0-1, where 1 is identical)
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

// Heuristic fallbacks (improved versions with stopword filtering)
function heuristicLongTail(product: ProductData): LongTailSuggestion[] {
  // Extract meaningful words from title (not stopwords)
  const titleWords = product.title.split(/\s+/)
    .filter(w => w.length > 3 && !isStopword(w))
    .slice(0, 4)
    .join(' ')
    .toLowerCase();
  
  const patterns = [
    { prefix: 'buy', score: 0.8, rationale: 'Direct purchase intent' },
    { prefix: 'best', score: 0.7, rationale: 'Comparison shopping intent' },
    { prefix: 'cheap', score: 0.65, rationale: 'Price-conscious buyer' },
    { prefix: 'review', score: 0.6, rationale: 'Research phase buyer' },
    { prefix: 'discount', score: 0.55, rationale: 'Deal-seeking intent' }
  ];
  
  return patterns
    .map((p) => ({ 
      phrase: `${p.prefix} ${titleWords}`,
      score: p.score,
      rationale: p.rationale
    }))
    .filter(s => s.phrase.length > 3)
    .slice(0, 8);
}

function heuristicMeta(product: ProductData): MetaSuggestion {
  // Create more compelling meta based on actual product data
  const title = product.title.slice(0, 55);
  const brand = product.brand ? `${product.brand} ` : '';
  const metaTitle = `${brand}${title} | Shop Now`.slice(0, 60);
  
  // Build better description from key features
  let metaDescription = '';
  
  if (product.bullets.length > 0) {
    // Combine first 2-3 bullets into compelling description
    const keyFeatures = product.bullets
      .slice(0, 3)
      .map(b => b.replace(/^\s*[•\-\*]\s*/, '').trim())
      .join('. ')
      .replace(/\s+/g, ' ')
      .slice(0, 140);
    
    metaDescription = `${keyFeatures}. Shop now!`;
  } else if (product.descriptionText) {
    // Extract first sentence from description
    const firstSentence = product.descriptionText
      .split(/[.!?]/)[0]
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 140);
    
    metaDescription = `${firstSentence}. Order today!`;
  } else {
    metaDescription = `Shop ${product.title} with free shipping and great prices. Order now!`;
  }
  
  metaDescription = metaDescription.slice(0, 160);
  
  return { 
    metaTitle, 
    metaDescription, 
    metaTitleLength: metaTitle.length, 
    metaDescriptionLength: metaDescription.length 
  };
}

function heuristicBullets(product: ProductData): RewrittenBullet[] {
  return product.bullets.slice(0, 5).map(b => {
    const trimmed = b.replace(/\.$/, '').trim();
    return { original: b, rewritten: trimmed.slice(0, 155), length: trimmed.length };
  });
}

export function getExpectedAttributes(platform: ProductData['detectedPlatform']): string[] {
  const base = ['dimensions', 'weight', 'color', 'size', 'material'];
  const perPlatform: Record<ProductData['detectedPlatform'], string[]> = {
    amazon: [...base, 'brand', 'asin', 'country of origin', 'item model number'],
    shopify: [...base, 'brand', 'sku'],
    woocommerce: [...base, 'brand', 'sku'],
    generic: [...base, 'brand'],
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
  const presentKeys = new Set(product.specs.map(s => s.key.toLowerCase()));
  
  // Also check if data exists in product object directly (brand, etc.)
  const hasDirectBrand = product.brand !== null && product.brand !== undefined && product.brand.length > 0;
  const hasDirectAsin = product.sku !== null && product.sku !== undefined;
  
  // Check raw attributes as well
  const rawAttrs = product.raw || {};
  const hasInRaw = (attr: string) => {
    const lowerAttr = attr.toLowerCase().replace(/\s+/g, '');
    return Object.keys(rawAttrs).some(k => k.toLowerCase().replace(/\s+/g, '').includes(lowerAttr));
  };
  
  const gaps = expected
    .filter(k => {
      const lowerK = k.toLowerCase();
      
      // Check if present in specs
      if (presentKeys.has(lowerK)) return false;
      
      // Check direct product properties
      if (lowerK === 'brand' && hasDirectBrand) return false;
      if (lowerK === 'asin' && hasDirectAsin) return false;
      
      // Check raw attributes
      if (hasInRaw(lowerK)) return false;
      
      // Check if variant data covers it (for color/size)
      if (lowerK === 'color' || lowerK === 'size') {
        const hasInVariants = product.variants.some(v => 
          v.name.toLowerCase().includes(lowerK)
        );
        if (hasInVariants) return false;
      }
      
      return true;
    })
    .map(k => {
      // Determine severity based on attribute importance
      let severity: 'high' | 'medium' | 'low' = 'medium';
      
      if (['brand', 'dimensions', 'weight'].includes(k.toLowerCase())) {
        severity = 'high';
      } else if (['color', 'size', 'material'].includes(k.toLowerCase())) {
        severity = 'medium';
      } else {
        severity = 'low';
      }
      
      return { 
        key: k, 
        severity, 
        suggestion: `Add ${k} to improve product completeness and searchability` 
      };
    });
  
  const gapScore = gaps.reduce((score, gap) => {
    if (gap.severity === 'high') return score + 3;
    if (gap.severity === 'medium') return score + 2;
    return score + 1;
  }, 0);
  
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

function collectJsonCandidates(raw: string): string[] {
  if (typeof raw !== 'string') return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const candidates = new Set<string>();
  candidates.add(trimmed);
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    candidates.add(fenced[1].trim());
  }
  const arrayStart = trimmed.indexOf('[');
  const arrayEnd = trimmed.lastIndexOf(']');
  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    candidates.add(trimmed.slice(arrayStart, arrayEnd + 1).trim());
  }
  const objectStart = trimmed.indexOf('{');
  const objectEnd = trimmed.lastIndexOf('}');
  if (objectStart !== -1 && objectEnd > objectStart) {
    candidates.add(trimmed.slice(objectStart, objectEnd + 1).trim());
  }
  return Array.from(candidates).filter(Boolean);
}

function parseAiJson<T>(
  raw: string,
  validator: (value: any) => boolean,
  transform: (value: any) => T,
  fallbackFactory: () => T
): { data: T; usedFallback: boolean } {
  const candidates = collectJsonCandidates(raw);
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (validator(parsed)) {
        return { data: transform(parsed), usedFallback: false };
      }
    } catch {
      // continue
    }
  }
  return { data: fallbackFactory(), usedFallback: true };
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
      setPersistentCache(cacheKey, data).catch(() => {});
      return { task: req.task, success: true, data, elapsedMs: performance.now() - start, fallbackUsed: true };
    }

    switch (req.task) {
      case 'generate.longTail': {
        const prompt = `Generate 15 JSON objects each with phrase,rationale,score (0-1) long-tail e-commerce search phrases for product: ${product.title}. 

Requirements:
- Each phrase should be 2-5 words targeting buyer intent
- Include variations like "buy [product]", "best [product]", "[product] reviews", "[product] vs alternatives"
- Score phrases by search potential (0-1)
- Add brief rationale explaining buyer intent
- Avoid generic stopwords like "your", "with", "for", "the"
- Focus on commercial intent keywords

ONLY output valid JSON array format.`;
        const raw = await aiCall(prompt);
        const fallback = () => heuristicLongTail(product);
        const { data: parsedList, usedFallback } = parseAiJson<LongTailSuggestion[]>(
          raw,
          Array.isArray,
          (arr: any[]) => arr
            .map((item: any) => {
              if (item && typeof item === 'object') {
                const phrase = String(item.phrase || item.keyword || '').trim();
                const rationale = String(item.rationale || '').trim() || undefined;
                const scoreValue = Number(item.score ?? item.confidence ?? 0.5);
                if (!phrase) return null;
                
                // Filter out stopwords
                if (isStopword(phrase)) return null;
                
                const boundedScore = Number.isFinite(scoreValue) ? Math.min(1, Math.max(0, scoreValue)) : 0.5;
                return { 
                  phrase: phrase.toLowerCase(), 
                  score: boundedScore,
                  rationale
                };
              }
              if (typeof item === 'string' && item.trim()) {
                const phrase = item.trim();
                // Filter out stopwords
                if (isStopword(phrase)) return null;
                return { phrase: phrase.toLowerCase(), score: 0.5 };
              }
              return null;
            })
            .filter((entry): entry is LongTailSuggestion => !!entry)
            .slice(0, 15),
          fallback
        );
        
        // Filter suggestions using stopword list and relevance
        let suggestions = parsedList.filter(s => !isStopword(s.phrase));
        let fallbackUsed = usedFallback;
        
        if (!isLongTailArray(suggestions) || suggestions.length === 0) {
          suggestions = fallback();
          fallbackUsed = true;
        }
        
        // Calculate confidence for each suggestion
        suggestions = suggestions.map(suggestion => {
          const confidenceScore = calculateLongTailConfidence(
            suggestion.phrase,
            product.title,
            product.categoryPath?.[0],
            suggestion.score * 100
          );
          return {
            ...suggestion,
            confidence: confidenceScore.score
          };
        });
        
        cache.set(cacheKey, suggestions);
        setPersistentCache(cacheKey, suggestions).catch(() => {});
        return { task: req.task, success: true, data: suggestions, elapsedMs: performance.now() - start, fallbackUsed };
      }
      case 'generate.meta': {
        const keyFeatures = product.bullets.slice(0, 3).join(', ');
        const priceInfo = product.price?.raw || '';
        const brandInfo = product.brand ? `Brand: ${product.brand}` : '';
        
        const prompt = `You are an e-commerce SEO expert. Create compelling meta tags for this product:

Product: ${product.title}
${brandInfo}
${priceInfo ? `Price: ${priceInfo}` : ''}
Key Features: ${keyFeatures || 'Not specified'}
Category: ${product.categoryPath.join(' > ') || 'General'}

Requirements:
1. Meta Title (50-60 characters):
   - Include primary keyword naturally
   - Add brand if space allows
   - Create urgency or appeal
   - DO NOT copy product title verbatim
   
2. Meta Description (140-160 characters):
   - Highlight unique value proposition
   - Include call-to-action (Shop Now, Buy, Order, etc.)
   - Mention 1-2 key benefits
   - Create click-through appeal
   - DO NOT copy existing bullets verbatim
   - Must be original and compelling

Output ONLY valid JSON:
{
  "metaTitle": "Your compelling title here",
  "metaDescription": "Your compelling description here"
}`;
        
        const raw = await aiCall(prompt);
        const fallback = () => heuristicMeta(product);
        const { data: parsedMeta, usedFallback } = parseAiJson<MetaSuggestion>(
          raw,
          isMetaSuggestion,
          (value: any) => {
            const meta = value as MetaSuggestion;
            let metaTitle = (meta.metaTitle || '').trim();
            let metaDescription = (meta.metaDescription || '').trim();
            
            // Validate not too similar to original title
            const titleSimilarity = calculateSimilarity(metaTitle.toLowerCase(), product.title.toLowerCase());
            if (titleSimilarity > 0.8) {
              // Too similar, use fallback
              const fb = fallback();
              metaTitle = fb.metaTitle;
              metaDescription = fb.metaDescription;
            }
            
            return {
              metaTitle: metaTitle.slice(0, 60),
              metaDescription: metaDescription.slice(0, 160),
              metaTitleLength: Math.min(metaTitle.length, 60),
              metaDescriptionLength: Math.min(metaDescription.length, 160)
            };
          },
          fallback
        );
        let meta = isMetaSuggestion(parsedMeta) ? parsedMeta : fallback();
        const fallbackUsed = usedFallback || !isMetaSuggestion(parsedMeta);
        
        // Calculate confidence for meta suggestions
        const titleConfidence = calculateMetaConfidence(
          meta.metaTitle,
          product.title,
          product.descriptionText,
          !fallbackUsed
        );
        const descConfidence = calculateMetaConfidence(
          meta.metaDescription,
          product.title,
          product.descriptionText,
          !fallbackUsed
        );
        
        // Use average confidence
        meta = {
          ...meta,
          confidence: Math.round((titleConfidence.score + descConfidence.score) / 2)
        };
        
        cache.set(cacheKey, meta);
        setPersistentCache(cacheKey, meta).catch(() => {});
        return { task: req.task, success: true, data: meta, elapsedMs: performance.now() - start, fallbackUsed };
      }
      case 'rewrite.bullets': {
        const prompt = `Rewrite these bullets (JSON array of strings, keep facts, max 160 chars each): ${JSON.stringify(product.bullets.slice(0,5))}`;
        const raw = await aiCall(prompt);
        const fallback = () => heuristicBullets(product);
        const { data: candidate, usedFallback } = parseAiJson<RewrittenBullet[]>(
          raw,
          Array.isArray,
          (arr: any[]) => arr.map((entry: any, index: number) => {
            const original = product.bullets[index] || '';
            const text = typeof entry === 'string'
              ? entry
              : typeof entry?.rewritten === 'string'
                ? entry.rewritten
                : '';
            const safeText = text || '';
            return {
              original,
              rewritten: safeText.slice(0, 160),
              length: safeText.length
            };
          }),
          fallback
        );
        let results = candidate;
        let fallbackUsed = usedFallback;
        if (!isRewrittenBullets(results) || results.length === 0) {
          results = fallback();
          fallbackUsed = true;
        }
        
        // Calculate confidence for each rewritten bullet
        results = results.map(bullet => {
          const confidenceScore = calculateBulletConfidence(
            bullet.original,
            bullet.rewritten,
            product.title + ' ' + product.categoryPath.join(' ')
          );
          return {
            ...bullet,
            confidence: confidenceScore.score
          };
        });
        
        cache.set(cacheKey, results);
        setPersistentCache(cacheKey, results).catch(() => {});
        return { task: req.task, success: true, data: results, elapsedMs: performance.now() - start, fallbackUsed };
      }
      case 'detect.gaps': {
        // Using heuristic only for initial phase
        const gaps = heuristicGaps(product);
        const validated = isGapResult(gaps) ? gaps : heuristicGaps(product);
        
        // Calculate confidence for each detected gap
        const withConfidence: GapResult = {
          ...validated,
          gaps: validated.gaps.map(gap => {
            const confidenceScore = calculateGapConfidence(
              gap.key,
              product,
              gap.severity
            );
            return {
              ...gap,
              confidence: confidenceScore.score
            };
          })
        };
        
        cache.set(cacheKey, withConfidence);
        setPersistentCache(cacheKey, withConfidence).catch(()=>{});
        return { task: req.task, success: true, data: withConfidence, elapsedMs: performance.now() - start, fallbackUsed: true };
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
