import { Request, Response } from 'express';
import { z } from 'zod';
import googleTrends from 'google-trends-api';
import { LRUCache } from 'lru-cache';

const bodySchema = z.object({
  keyword: z.string().min(1, 'keyword required'),
  geo: z.string().toUpperCase().regex(/^[A-Z]{0,2}$/).optional(),
  timeframe: z.enum(['7d', '30d', '90d', '12m', '24m', '5y']).optional()
});

type TrendPoint = { time: number; formattedTime: string; value: number };

interface TrendSummary {
  average: number;
  peak: number;
  last: number;
  first: number;
  change: number;
  percentChange: number;
}

const cache = new LRUCache<string, { points: TrendPoint[]; summary: TrendSummary; fetchedAt: number }>({
  max: 200,
  ttl: 1000 * 60 * 30
});

type RateBucket = { windowStart: number; count: number };
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const envRateLimit = Number(process.env.TRENDS_RATE_LIMIT || 60);
const envRateWindow = Number(process.env.TRENDS_RATE_WINDOW_MS || 60_000);

let rateLimitConfig: RateLimitConfig = {
  maxRequests: Number.isFinite(envRateLimit) && envRateLimit > 0 ? Math.floor(envRateLimit) : 60,
  windowMs: Number.isFinite(envRateWindow) && envRateWindow >= 1000 ? Math.floor(envRateWindow) : 60_000
};

const rateBuckets = new Map<string, RateBucket>();

const telemetry = {
  totalRequests: 0,
  cacheHits: 0,
  rateLimited: 0,
  lastRequestAt: 0
};

function getClientKey(req: Request): string {
  const forwarded = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
  if (forwarded) return forwarded;
  if (typeof req.ip === 'string' && req.ip.length > 0) return req.ip;
  const remote = (req.connection as any)?.remoteAddress;
  if (typeof remote === 'string' && remote.length > 0) return remote;
  return 'unknown-client';
}

function enforceRateLimit(clientKey: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const existing = rateBuckets.get(clientKey);
  if (!existing || now - existing.windowStart >= rateLimitConfig.windowMs) {
    rateBuckets.set(clientKey, { windowStart: now, count: 1 });
    return { allowed: true, retryAfterSec: Math.ceil(rateLimitConfig.windowMs / 1000) };
  }
  if (existing.count >= rateLimitConfig.maxRequests) {
    const retryAfterMs = rateLimitConfig.windowMs - (now - existing.windowStart);
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }
  existing.count += 1;
  return { allowed: true, retryAfterSec: Math.ceil(rateLimitConfig.windowMs / 1000) };
}

export function configureTrendsRateLimit(maxRequests: number, windowMs: number) {
  rateLimitConfig = {
    maxRequests: Math.max(1, Math.floor(maxRequests)),
    windowMs: Math.max(100, Math.floor(windowMs))
  };
  rateBuckets.clear();
}

export function resetTrendsTelemetry() {
  telemetry.totalRequests = 0;
  telemetry.cacheHits = 0;
  telemetry.rateLimited = 0;
  telemetry.lastRequestAt = 0;
  rateBuckets.clear();
}

export function getTrendsTelemetry() {
  return {
    ...telemetry,
    config: { ...rateLimitConfig },
    activeBuckets: rateBuckets.size
  };
}

function timeframeToRange(token: string | undefined): { startTime: Date; endTime: Date } {
  const endTime = new Date();
  const nowMs = endTime.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  let days = 365;
  switch (token) {
    case '7d':
      days = 7;
      break;
    case '30d':
      days = 30;
      break;
    case '90d':
      days = 90;
      break;
    case '12m':
      days = 365;
      break;
    case '24m':
      days = 365 * 2;
      break;
    case '5y':
      days = 365 * 5;
      break;
    default:
      days = 365;
  }
  const startTime = new Date(nowMs - days * dayMs);
  return { startTime, endTime };
}

async function fetchTrend(keyword: string, geo?: string, timeframe?: string) {
  const key = JSON.stringify({ keyword: keyword.toLowerCase(), geo: geo || 'GLOBAL', timeframe: timeframe || '12m' });
  const cached = cache.get(key);
  if (cached) {
    telemetry.cacheHits += 1;
    return { ...cached, cached: true };
  }

  const { startTime, endTime } = timeframeToRange(timeframe);
  const raw = await googleTrends.interestOverTime({
    keyword,
    startTime,
    endTime,
    geo,
    hl: 'en-US'
  });
  const sanitized = raw.replace(/^\)\]\}',?/, '');
  const parsed = JSON.parse(sanitized);
  const timeline = (parsed?.default?.timelineData || []) as Array<{ time: string; formattedTime: string; value: number[] }>;
  const points: TrendPoint[] = timeline.map(item => ({
    time: Number(item.time) * 1000,
    formattedTime: item.formattedTime,
    value: item.value?.[0] ?? 0
  })).filter(Boolean);

  if (!points.length) {
    const emptySummary: TrendSummary = { average: 0, peak: 0, last: 0, first: 0, change: 0, percentChange: 0 };
    const payload = { points, summary: emptySummary, fetchedAt: Date.now() };
    cache.set(key, payload);
    return payload;
  }

  const values = points.map(p => p.value);
  const first = points[0].value;
  const last = points[points.length - 1].value;
  const peak = Math.max(...values);
  const average = values.reduce((sum, v) => sum + v, 0) / values.length;
  const change = last - first;
  const base = first === 0 ? (last === 0 ? 1 : last) : first;
  const percentChange = (change / base) * 100;
  const summary: TrendSummary = {
    average,
    peak,
    last,
    first,
    change,
    percentChange
  };
  const payload = { points, summary, fetchedAt: Date.now() };
  cache.set(key, payload);
  return payload;
}

export async function trendsProxyHandler(req: Request, res: Response) {
  telemetry.totalRequests += 1;
  telemetry.lastRequestAt = Date.now();

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'INVALID_REQUEST', details: parsed.error.flatten() });
  }
  const { keyword, geo, timeframe } = parsed.data;
  const clientKey = getClientKey(req);
  const rateStatus = enforceRateLimit(clientKey);
  if (!rateStatus.allowed) {
    telemetry.rateLimited += 1;
    return res.status(429).json({ error: 'RATE_LIMITED', retryAfter: rateStatus.retryAfterSec });
  }
  try {
    const result = await fetchTrend(keyword, geo, timeframe);
    const { summary, points, fetchedAt } = result;
    const direction = summary.percentChange > 8 ? 'up' : summary.percentChange < -8 ? 'down' : 'stable';
    const confidence = Math.min(1, Math.max(0.3, points.length / 52));
    return res.json({
      keyword,
      geo: geo || 'GLOBAL',
      timeframe: timeframe || '12m',
      fetchedAt,
      trendDirection: direction,
      percentChange: summary.percentChange,
      summary,
      points,
      confidence
    });
  } catch (error: any) {
    const message = error?.message || 'Failed to load trend data';
    return res.status(502).json({ error: 'TREND_FETCH_FAILED', message });
  }
}

export function trendsProxyInfoHandler(_req: Request, res: Response) {
  return res.json({
    ok: true,
    endpoint: '/proxy/trends',
    method: 'POST',
    body: { keyword: 'string', geo: 'string?', timeframe: "'7d'|'30d'|'90d'|'12m'|'24m'|'5y'?" }
  });
}
