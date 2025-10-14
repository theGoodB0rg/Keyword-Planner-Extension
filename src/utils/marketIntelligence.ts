/**
 * Real-time Market Intelligence System
 * Provides competitor analysis, trend data, and keyword optimization
 */

import { ProductData } from '../types/product';
import { KeywordData } from './types';
import { STOPWORDS } from './stopwords';

export interface CompetitorData {
  url: string;
  title: string;
  price: number;
  rating: number;
  reviewCount: number;
  keywords: string[];
  bulletPoints: string[];
  description: string;
  currency?: string | null;
  asin?: string | null;
  image?: string | null;
  source?: string;
  lastUpdated?: number;
  rawPrice?: string | null;
}

export interface TrendData {
  keyword: string;
  trendDirection: 'up' | 'down' | 'stable';
  trendPercentage: number;
  searchVolumeChange: number;
  seasonalPattern: 'high' | 'medium' | 'low' | 'unknown';
  confidence: number;
}

export interface MarketIntelligenceResult {
  competitors: CompetitorData[];
  trends: TrendData[];
  pricePositioning: {
    position: 'low' | 'average' | 'high';
    competitorAverage: number;
    recommendedPriceRange: { min: number; max: number };
  };
  keywordGaps: {
    missingKeywords: string[];
    opportunityKeywords: string[];
    competitorAdvantages: string[];
  };
  marketInsights: {
    competitionLevel: 'low' | 'medium' | 'high';
    marketSaturation: number;
    entryBarrier: number;
    recommendations: string[];
  };
}

const ENV_PROXY_BASE = (typeof process !== 'undefined' && process.env && typeof process.env.MARKET_PROXY_BASE === 'string'
  && process.env.MARKET_PROXY_BASE.trim().length > 0)
  ? process.env.MARKET_PROXY_BASE.trim()
  : null;
const NODE_ENV = (typeof process !== 'undefined' && process.env && typeof process.env.NODE_ENV === 'string')
  ? process.env.NODE_ENV
  : 'production';
const DEFAULT_DEV_PROXY_BASE = 'http://localhost:8787';
const DEFAULT_PROD_PROXY_BASE = 'https://api.yourdomain.com';

const MARKET_PROXY_BASE = ENV_PROXY_BASE
  || (NODE_ENV === 'development' ? DEFAULT_DEV_PROXY_BASE : DEFAULT_PROD_PROXY_BASE);
const TRENDS_ENDPOINT = `${MARKET_PROXY_BASE}/proxy/trends`;
const TRENDS_TIMEOUT = 10000;

export class MarketIntelligenceEngine {
  private static instance: MarketIntelligenceEngine;
  private competitorCache = new Map<string, { data: CompetitorData[]; ts: number; fallback: boolean }>();
  private trendCache = new Map<string, { data: TrendData; ts: number; fallback: boolean }>();
  private cacheExpiry = 1000 * 60 * 30; // 30 minutes
  private fallbackRetry = 1000 * 60 * 2; // retry live fetch after 2 minutes when using fallback data

  static getInstance(): MarketIntelligenceEngine {
    if (!MarketIntelligenceEngine.instance) {
      MarketIntelligenceEngine.instance = new MarketIntelligenceEngine();
    }
    return MarketIntelligenceEngine.instance;
  }

  /**
   * Analyze market intelligence for a product
   */
  async analyzeMarket(product: ProductData, keywords: string[]): Promise<MarketIntelligenceResult> {
    try {
      const competitors = await this.getCompetitorAnalysis(product, keywords);
      const trends = await this.getTrendAnalysis(keywords);
      const pricePositioning = this.analyzePricePositioning(product, competitors);
      const keywordGaps = await this.analyzeKeywordGaps(product, keywords, competitors);

      const marketInsights = this.generateMarketInsights(competitors, trends, pricePositioning);

      return {
        competitors,
        trends,
        pricePositioning,
        keywordGaps,
        marketInsights
      };
    } catch (error) {
      console.error('Market intelligence analysis failed:', error);
      return this.getFallbackMarketData(product, keywords);
    }
  }

  /**
   * Get competitor analysis using web scraping and search APIs
   */
  private async getCompetitorAnalysis(product: ProductData, keywords: string[]): Promise<CompetitorData[]> {
    const cacheKey = `${product.url}|${product.sku || ''}|${keywords.slice(0, 5).join(',')}`;
    const cached = this.competitorCache.get(cacheKey);
    if (cached) {
      const ttl = cached.fallback ? this.fallbackRetry : this.cacheExpiry;
      if (Date.now() - cached.ts < ttl) {
        return cached.data;
      }
    }

    try {
      const scraped = await this.fetchCompetitorsFromExtension(product);
      if (scraped && scraped.length > 0) {
        const normalized = scraped
          .map((raw: unknown) => this.normalizeCompetitor(raw, product))
          .filter((item: CompetitorData | null): item is CompetitorData => !!item && typeof item.url === 'string');
        if (normalized.length > 0) {
          normalized.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
          const timestamp = Date.now();
          normalized.forEach((comp: CompetitorData) => {
            comp.lastUpdated = timestamp;
            (comp as any)._timestamp = timestamp;
          });
          this.competitorCache.set(cacheKey, { data: normalized, ts: timestamp, fallback: false });
          return normalized;
        }
      }
    } catch (error) {
      console.warn('Competitor scrape failed:', error);
    }

    try {
      const simulated = await this.simulateCompetitorScraping(product, keywords);
      const timestamp = Date.now();
      simulated.forEach(comp => {
        comp.lastUpdated = timestamp;
        comp.source = 'fallback.simulated';
        (comp as any)._timestamp = timestamp;
        (comp as any)._simulated = true;
      });
      this.competitorCache.set(cacheKey, { data: simulated, ts: timestamp, fallback: true });
      return simulated;
    } catch (error) {
      console.warn('Competitor analysis failed, using fallback:', error);
      const fallback = this.getFallbackCompetitors(product);
      const timestamp = Date.now();
      fallback.forEach(comp => {
        comp.lastUpdated = timestamp;
        comp.source = 'fallback.static';
        (comp as any)._timestamp = timestamp;
        (comp as any)._simulated = true;
      });
      this.competitorCache.set(cacheKey, { data: fallback, ts: timestamp, fallback: true });
      return fallback;
    }
  }

  /**
   * Analyze trending keywords and search volume changes
   */
  private async getTrendAnalysis(keywords: string[]): Promise<TrendData[]> {
    const uniqueKeywords = Array.from(new Set(
      keywords
        .map(k => k.trim().toLowerCase())
        .filter(k => k.length >= 3 && !STOPWORDS.has(k))
    ));

    const selected = uniqueKeywords.slice(0, 6);
    const results: TrendData[] = [];

    for (const keyword of selected) {
      const cacheEntry = this.trendCache.get(keyword);
      if (cacheEntry) {
        const ttl = cacheEntry.fallback ? this.fallbackRetry : this.cacheExpiry;
        if (Date.now() - cacheEntry.ts < ttl) {
          results.push(cacheEntry.data);
          continue;
        }
      }

      try {
        const trend = await this.fetchTrendFromProxy(keyword);
        if (trend) {
          this.trendCache.set(keyword, { data: trend, ts: Date.now(), fallback: false });
          results.push(trend);
          continue;
        }
      } catch (error) {
        console.warn(`Trend proxy failed for ${keyword}:`, error);
      }

      const fallback = await this.simulateTrendAnalysis(keyword);
      this.trendCache.set(keyword, { data: fallback, ts: Date.now(), fallback: true });
      results.push(fallback);
    }

    return results;
  }

  /**
   * Analyze price positioning relative to competitors
   */
  private analyzePricePositioning(product: ProductData, competitors: CompetitorData[]): MarketIntelligenceResult['pricePositioning'] {
    const productPrice = product.price?.value ?? null;
    const competitorPrices = competitors
      .map(c => c.price)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0);

    if (!competitorPrices.length) {
      const fallbackAverage = productPrice ?? 0;
      return {
        position: 'average',
        competitorAverage: fallbackAverage,
        recommendedPriceRange: {
          min: fallbackAverage * 0.9,
          max: fallbackAverage * 1.1
        }
      };
    }

    const average = competitorPrices.reduce((sum, price) => sum + price, 0) / competitorPrices.length;
    const variance = competitorPrices.reduce((total, price) => total + Math.pow(price - average, 2), 0) / competitorPrices.length;
    const stdDeviation = Math.sqrt(variance);
    const recommendedMin = Math.max(0, average - stdDeviation);
    const recommendedMax = average + stdDeviation;

    let position: 'low' | 'average' | 'high' = 'average';
    if (typeof productPrice === 'number' && Number.isFinite(productPrice)) {
      if (productPrice <= average * 0.9) position = 'low';
      else if (productPrice >= average * 1.1) position = 'high';
    }

    return {
      position,
      competitorAverage: average,
      recommendedPriceRange: {
        min: recommendedMin,
        max: recommendedMax
      }
    };
  }

  /**
   * Identify keyword gaps and opportunities
   */
  private async analyzeKeywordGaps(
    product: ProductData,
    currentKeywords: string[],
    competitors: CompetitorData[]
  ): Promise<MarketIntelligenceResult['keywordGaps']> {
    const normalizedCurrent = new Set(
      currentKeywords
        .map(k => k.trim().toLowerCase())
        .filter(k => k.length > 2)
    );

    const competitorKeywords = competitors.flatMap(comp => comp.keywords || []);
    const normalizedCompetitor = Array.from(
      new Set(
        competitorKeywords
          .map(k => k.trim().toLowerCase())
          .filter(k => k.length > 2 && !STOPWORDS.has(k))
      )
    );

    const missingKeywords = normalizedCompetitor
      .filter(k => !normalizedCurrent.has(k))
      .slice(0, 15);

    const opportunitySeeds = [
      `${product.title} review`,
      `${product.title} comparison`,
      `${product.brand || ''} ${product.title} alternatives`,
      `${product.title} best price`,
      `${product.title} vs competitors`
    ].map(k => k.toLowerCase());

    const opportunityKeywords = opportunitySeeds
      .filter(k => !normalizedCurrent.has(k))
      .slice(0, 10);

    const competitorAdvantages = normalizedCompetitor
      .filter(k => normalizedCurrent.has(k))
      .slice(0, 5);

    return {
      missingKeywords,
      opportunityKeywords,
      competitorAdvantages
    };
  }

  /**
   * Generate comprehensive market insights
   */
  private generateMarketInsights(
    competitors: CompetitorData[],
    trends: TrendData[],
    pricePositioning: MarketIntelligenceResult['pricePositioning']
  ): MarketIntelligenceResult['marketInsights'] {
    const competitorCount = competitors.length;
    const avgRating = competitorCount > 0
      ? competitors.reduce((sum, c) => sum + (c.rating || 0), 0) / competitorCount
      : 0;
    const totalReviews = competitors.reduce((sum, c) => sum + (c.reviewCount || 0), 0);
    
    const competitionLevel: 'low' | 'medium' | 'high' = 
      totalReviews > 10000 ? 'high' : 
      totalReviews > 2000 ? 'medium' : 'low';

    const marketSaturation = Math.min(100, (totalReviews / 1000) * 10);
    const entryBarrier = avgRating > 4.5 ? 80 : avgRating > 4.0 ? 60 : 40;

    const recommendations: string[] = [];
    
    if (competitionLevel === 'high') {
      recommendations.push('Focus on unique value proposition to stand out');
      recommendations.push('Consider niche targeting within the broader market');
    }
    
    if (pricePositioning.position === 'high') {
      recommendations.push('Justify premium pricing with superior features or quality');
    } else if (pricePositioning.position === 'low') {
      recommendations.push('Emphasize value and cost-effectiveness in marketing');
    }

    const upwardTrends = trends.filter(t => t.trendDirection === 'up').length;
    if (upwardTrends > trends.length / 2) {
      recommendations.push('Market shows positive momentum - good timing for launch');
    }

    return {
      competitionLevel,
      marketSaturation,
      entryBarrier,
      recommendations
    };
  }

  private async fetchCompetitorsFromExtension(product: ProductData): Promise<any[] | null> {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      return null;
    }

    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(
          { action: 'collectCompetitors', limit: 8, excludeSku: product.sku || null },
          (response: any) => {
            if (chrome.runtime.lastError) {
              resolve(null);
              return;
            }
            if (response?.success && Array.isArray(response.competitors)) {
              resolve(response.competitors);
            } else {
              resolve(null);
            }
          }
        );
      } catch (error) {
        console.warn('Unable to request competitor data from content script:', error);
        resolve(null);
      }
    });
  }

  private normalizeCurrency(currency: unknown, fallback?: string | null): string | null {
    if (!currency) return fallback || null;
    const value = String(currency).trim();
    if (!value) return fallback || null;
    const symbolMap: Record<string, string> = {
      '$': 'USD',
      '£': 'GBP',
      '€': 'EUR',
      '¥': 'JPY'
    };
    if (value.length === 1 && symbolMap[value]) return symbolMap[value];
    if (value.length === 3) return value.toUpperCase();
    return fallback || null;
  }

  private buildCompetitorKeywords(title: string, subtitle?: string): string[] {
    const text = `${title || ''} ${subtitle || ''}`.toLowerCase();
    const tokens = text.split(/[^a-z0-9+]+/).filter(token => token.length >= 3 && !STOPWORDS.has(token));
    const unique = Array.from(new Set(tokens));
    return unique.slice(0, 15);
  }

  private normalizeCompetitor(raw: any, product: ProductData): CompetitorData | null {
    if (!raw) return null;
    const url = typeof raw.url === 'string' ? raw.url : '';
    const title = typeof raw.title === 'string' ? raw.title.trim() : '';
    if (!url || !title) return null;

    const priceValue = typeof raw.price === 'number' && Number.isFinite(raw.price) ? raw.price : null;
    const ratingValue = typeof raw.rating === 'number' && Number.isFinite(raw.rating) ? Math.max(0, Math.min(5, raw.rating)) : null;
    const reviewValue = typeof raw.reviewCount === 'number' && Number.isFinite(raw.reviewCount) ? Math.max(0, raw.reviewCount) : null;
    const subtitle = typeof raw.subtitle === 'string' ? raw.subtitle.trim() : '';
    const bulletPoints = subtitle
      ? subtitle.split(/•|\||,|·/).map((part: string) => part.trim()).filter((part: string) => !!part).slice(0, 5)
      : [];
    const currency = this.normalizeCurrency(raw.currency, product.price?.currency || null);
    const keywords = this.buildCompetitorKeywords(title, subtitle);

    return {
      url,
      title,
      price: priceValue ?? 0,
      rating: ratingValue ?? 0,
      reviewCount: reviewValue ?? 0,
      keywords,
      bulletPoints,
      description: subtitle || raw.rawPrice || '',
      currency,
      asin: typeof raw.asin === 'string' ? raw.asin : null,
      image: typeof raw.image === 'string' ? raw.image : null,
      source: typeof raw.source === 'string' ? raw.source : 'page.scrape',
      lastUpdated: Date.now(),
      rawPrice: typeof raw.rawPrice === 'string' ? raw.rawPrice : null
    };
  }

  private classifySeasonality(values: number[]): TrendData['seasonalPattern'] {
    const clean = values.filter(value => Number.isFinite(value));
    if (clean.length < 6) return 'unknown';
    const average = clean.reduce((sum, value) => sum + value, 0) / clean.length;
    if (average === 0) return 'unknown';
    const variance = clean.reduce((sum, value) => sum + Math.pow(value - average, 2), 0) / clean.length;
    const std = Math.sqrt(variance);
    const cv = std / average;
    if (cv > 0.65) return 'high';
    if (cv > 0.35) return 'medium';
    return 'low';
  }

  private async fetchTrendFromProxy(keyword: string): Promise<TrendData | null> {
    if (typeof fetch === 'undefined') return null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let controller: AbortController | undefined;
    if (typeof AbortController !== 'undefined') {
      controller = new AbortController();
      timer = setTimeout(() => controller?.abort(), TRENDS_TIMEOUT);
    }

    try {
      const response = await fetch(TRENDS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, timeframe: '12m' }),
        signal: controller?.signal
      });
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      const points = Array.isArray(data?.points) ? data.points : [];
      const values = points.map((pt: any) => Number(pt?.value) || 0);
      const percentChange = Number(data?.percentChange ?? data?.summary?.percentChange ?? 0);
      const volumeChange = Number(data?.summary?.change ?? (values.length >= 2 ? values[values.length - 1] - values[0] : 0));
      const direction: TrendData['trendDirection'] = percentChange > 8 ? 'up' : percentChange < -8 ? 'down' : 'stable';
      const rawConfidence = Number(data?.confidence);
      const derivedConfidence = Number.isFinite(rawConfidence) ? rawConfidence : values.length / 52;
      const boundedConfidence = Math.min(1, Math.max(0.35, Number.isFinite(derivedConfidence) ? derivedConfidence : 0.5));
      const seasonalPattern = this.classifySeasonality(values);

      return {
        keyword,
        trendDirection: direction,
        trendPercentage: Number(percentChange.toFixed(2)),
        searchVolumeChange: Number(volumeChange.toFixed(2)),
        seasonalPattern,
        confidence: Number(boundedConfidence.toFixed(2))
      };
    } catch {
      return null;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  // Simulation methods (replace with real API calls in production)
  
  private async simulateCompetitorScraping(product: ProductData, keywords: string[]): Promise<CompetitorData[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const basePrice = product.price?.value || 100;
    const competitors: CompetitorData[] = [];
    
    for (let i = 0; i < 5; i++) {
      const price = Math.max(1, basePrice + (Math.random() - 0.5) * basePrice * 0.4);
      competitors.push({
        url: `https://competitor${i + 1}.example.com/product`,
        title: `${product.title} Alternative ${i + 1}`,
        price,
        rating: 3.5 + Math.random() * 1.5,
        reviewCount: Math.floor(Math.random() * 5000) + 100,
        keywords: keywords.slice(0, 3).concat([`competitor${i + 1}`, 'alternative']),
        bulletPoints: [
          `Key feature ${i + 1}`,
          `Benefit ${i + 1}`,
          `Quality aspect ${i + 1}`
        ],
        description: `Competitor ${i + 1} product description...`,
        currency: product.price?.currency || 'USD',
        asin: null,
        image: null,
        source: 'fallback.simulated',
        lastUpdated: Date.now(),
        rawPrice: null
      });
    }
    
    return competitors;
  }

  private async simulateTrendAnalysis(keyword: string): Promise<TrendData> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const directions: ('up' | 'down' | 'stable')[] = ['up', 'down', 'stable'];
    const patterns: ('high' | 'medium' | 'low' | 'unknown')[] = ['high', 'medium', 'low', 'unknown'];
    
    return {
      keyword,
      trendDirection: directions[Math.floor(Math.random() * directions.length)],
      trendPercentage: (Math.random() - 0.5) * 40, // -20% to +20%
      searchVolumeChange: (Math.random() - 0.5) * 2000,
      seasonalPattern: patterns[Math.floor(Math.random() * patterns.length)],
      confidence: 0.6 + Math.random() * 0.3
    };
  }

  private simulateCompetitorPrices(product: ProductData): number[] {
    const basePrice = product.price?.value || 100;
    return Array.from({ length: 8 }, () => 
      basePrice + (Math.random() - 0.5) * basePrice * 0.6
    );
  }

  private simulateCompetitorKeywords(product: ProductData): string[] {
    const titleWords = product.title.toLowerCase().split(' ');
    const baseKeywords = [
      ...titleWords,
      'best', 'top', 'reviews', 'buy', 'sale', 'deal',
      'premium', 'quality', 'affordable', 'discount'
    ];
    
    return baseKeywords.slice(0, 15);
  }

  // Fallback methods for offline mode or API failures

  private getFallbackMarketData(product: ProductData, keywords: string[]): MarketIntelligenceResult {
    const fallbackCompetitors = this.getFallbackCompetitors(product).map(comp => {
      (comp as any)._simulated = true;
      (comp as any)._timestamp = Date.now();
      return comp;
    });
    return {
      competitors: fallbackCompetitors,
      trends: keywords.slice(0, 5).map(k => this.getFallbackTrendData(k)),
      pricePositioning: {
        position: 'average',
        competitorAverage: product.price?.value || 100,
        recommendedPriceRange: {
          min: (product.price?.value || 100) * 0.9,
          max: (product.price?.value || 100) * 1.1
        }
      },
      keywordGaps: {
        missingKeywords: ['reviews', 'best', 'top rated'],
        opportunityKeywords: ['deals', 'sale', 'discount'],
        competitorAdvantages: keywords.slice(0, 3)
      },
      marketInsights: {
        competitionLevel: 'medium',
        marketSaturation: 50,
        entryBarrier: 50,
        recommendations: [
          'Focus on unique selling points',
          'Optimize for long-tail keywords',
          'Monitor competitor pricing strategies'
        ]
      }
    };
  }

  private getFallbackCompetitors(product: ProductData): CompetitorData[] {
    return [
      {
        url: 'https://example.com/competitor1',
        title: `${product.title} Alternative`,
        price: (product.price?.value || 100) * 1.1,
        rating: 4.2,
        reviewCount: 1250,
        keywords: ['alternative', 'similar', 'competitor'],
        bulletPoints: ['Feature 1', 'Feature 2', 'Feature 3'],
        description: 'Competitor product description',
        currency: product.price?.currency || 'USD',
        asin: null,
        image: null,
        source: 'fallback.static',
        lastUpdated: Date.now(),
        rawPrice: null
      }
    ];
  }

  private getFallbackTrendData(keyword: string): TrendData {
    return {
      keyword,
      trendDirection: 'stable',
      trendPercentage: 0,
      searchVolumeChange: 0,
      seasonalPattern: 'unknown',
      confidence: 0.5
    };
  }
}

export default MarketIntelligenceEngine;