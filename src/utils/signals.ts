// src/utils/signals.ts
// Demand Score from public suggest endpoints + helpers for competition snapshot shapes

import { getSignalsCache, setSignalsCache } from './storage';

export type Marketplace = 'amazon.com' | 'amazon.co.uk' | 'amazon.ca';

export type DemandSources = 'google' | 'bing' | 'ddg' | 'amazon';

export type DemandResult = {
  keyword: string;
  marketplace?: Marketplace;
  sources: Record<DemandSources, { present: boolean; rank?: number } | undefined>;
  score: number; // 0-100 normalized
  updatedAt: number;
};

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function keyForDemand(k: string, m?: Marketplace) {
  return `demand:${(m||'global')}:${k.toLowerCase()}`;
}

function normalizeScore(parts: Array<number | undefined>): number {
  // Simple: rank weights -> rank 1 = 1.0, rank 2 = 0.8, rank 3 = 0.6, else 0.4 if present
  const mapped: number[] = parts.map((r) => (r == null ? 0 : r === 1 ? 1 : r === 2 ? 0.8 : r === 3 ? 0.6 : 0.4));
  const s = mapped.reduce((a: number, b: number) => a + b, 0);
  return Math.round(Math.min(100, (s / (parts.length || 1)) * 100));
}

async function fetchGoogleSuggest(q: string): Promise<number | undefined> {
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(q)}`;
    const res = await fetch(url);
    const data = await res.json(); // [query, [suggestions...]]
    const arr: string[] = Array.isArray(data?.[1]) ? data[1] : [];
    const idx = arr.findIndex((s) => s.toLowerCase() === q.toLowerCase());
    return idx >= 0 ? idx + 1 : arr.length > 0 ? 4 : undefined; // seen but not exact
  } catch { return undefined; }
}

async function fetchBingSuggest(q: string): Promise<number | undefined> {
  try {
    const url = `https://api.bing.com/osjson.aspx?query=${encodeURIComponent(q)}`;
    const res = await fetch(url);
    const data = await res.json(); // [query, [suggestions...]]
    const arr: string[] = Array.isArray(data?.[1]) ? data[1] : [];
    const idx = arr.findIndex((s) => s.toLowerCase() === q.toLowerCase());
    return idx >= 0 ? idx + 1 : arr.length > 0 ? 4 : undefined;
  } catch { return undefined; }
}

async function fetchDdgSuggest(q: string): Promise<number | undefined> {
  try {
    const url = `https://ac.duckduckgo.com/ac/?q=${encodeURIComponent(q)}&type=list`;
    const res = await fetch(url);
    const data = await res.json(); // array of suggestions or pairs
    const arr: string[] = Array.isArray(data) ? data.map((d:any) => (typeof d === 'string' ? d : d?.phrase)).filter(Boolean) : [];
    const idx = arr.findIndex((s) => s.toLowerCase() === q.toLowerCase());
    return idx >= 0 ? idx + 1 : arr.length > 0 ? 4 : undefined;
  } catch { return undefined; }
}

function amazonMktCode(m: Marketplace | undefined) {
  if (!m || m === 'amazon.com') return { mkt: 1, host: 'completion.amazon.com' };
  if (m === 'amazon.co.uk') return { mkt: 3, host: 'completion.amazon.co.uk' };
  if (m === 'amazon.ca') return { mkt: 7, host: 'completion.amazon.ca' };
  return { mkt: 1, host: 'completion.amazon.com' };
}

async function fetchAmazonSuggest(q: string, m?: Marketplace): Promise<number | undefined> {
  try {
    const { mkt, host } = amazonMktCode(m);
    const url = `https://${host}/search/complete?method=completion&mkt=${mkt}&search-alias=aps&q=${encodeURIComponent(q)}`;
    const res = await fetch(url);
    const data = await res.json(); // varies by region, usually [q, [suggestions], ...]
    const arr: string[] = Array.isArray(data?.[1]) ? data[1] : [];
    const idx = arr.findIndex((s) => String(s).toLowerCase() === q.toLowerCase());
    return idx >= 0 ? idx + 1 : arr.length > 0 ? 4 : undefined;
  } catch { return undefined; }
}

export async function getDemandScore(keyword: string, marketplace?: Marketplace): Promise<DemandResult> {
  const cacheKey = keyForDemand(keyword, marketplace);
  const cached = await getSignalsCache(cacheKey);
  if (cached?.data && cached.ts && Date.now() - cached.ts < TTL_MS) {
    return cached.data as DemandResult;
  }
  const [g, b, d, a] = await Promise.all([
    fetchGoogleSuggest(keyword),
    fetchBingSuggest(keyword),
    fetchDdgSuggest(keyword),
    fetchAmazonSuggest(keyword, marketplace)
  ]);
  const score = normalizeScore([g, b, d, a]);
  const result: DemandResult = {
    keyword,
    marketplace,
    sources: {
      google: g != null ? { present: true, rank: g } : { present: false },
      bing: b != null ? { present: true, rank: b } : { present: false },
      ddg: d != null ? { present: true, rank: d } : { present: false },
      amazon: a != null ? { present: true, rank: a } : { present: false }
    },
    score,
    updatedAt: Date.now()
  };
  await setSignalsCache(cacheKey, result, TTL_MS);
  return result;
}

export type SnapshotSummary = {
  sponsoredCount: number;
  totalConsidered: number;
  medianRating: number | null;
  medianReviews: number | null;
  priceMin: number | null;
  priceMax: number | null;
};

// The competitor snapshot collection will be implemented via background script
// and content parsing on an Amazon search results page; this file holds types only.
