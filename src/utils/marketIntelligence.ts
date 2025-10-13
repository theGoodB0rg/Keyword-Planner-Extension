/**
 * Real-time Market Intelligence System
 * Provides competitor analysis, trend data, and keyword optimization
 */

import { ProductData } from '../types/product';
import { KeywordData } from './types';

export interface CompetitorData {
  url: string;
  title: string;
  price: number;
  rating: number;
  reviewCount: number;
  keywords: string[];
  bulletPoints: string[];
  description: string;
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

export class MarketIntelligenceEngine {
  private static instance: MarketIntelligenceEngine;
  private competitorCache = new Map<string, CompetitorData[]>();
  private trendCache = new Map<string, TrendData>();
  private cacheExpiry = 1000 * 60 * 30; // 30 minutes

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
      const [competitors, trends, pricePositioning, keywordGaps] = await Promise.all([
        this.getCompetitorAnalysis(product, keywords),
        this.getTrendAnalysis(keywords),
        this.analyzePricePositioning(product),
        this.analyzeKeywordGaps(product, keywords)
      ]);

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
    const cacheKey = `${product.title}_${keywords.join(',')}_competitors`;
    
    if (this.competitorCache.has(cacheKey)) {
      const cached = this.competitorCache.get(cacheKey);
      if (cached && cached.length > 0) {
        const timestamp = (cached[0] as any)._timestamp;
        if (timestamp && Date.now() - timestamp < this.cacheExpiry) {
          return cached;
        }
      }
    }

    try {
      // ⚠️ WARNING: Using simulated data - real API integration needed
      // In production, this would use SerpApi, Amazon API, or other scraping services
      // See COMPREHENSIVE_FIX_PLAN.md for API integration options
      const competitors = await this.simulateCompetitorScraping(product, keywords);
      
      // Mark as simulated data
      competitors.forEach(comp => {
        (comp as any)._timestamp = Date.now();
        (comp as any)._simulated = true;
        (comp as any)._warning = 'DEMO MODE: Simulated data for demonstration purposes';
      });
      
      this.competitorCache.set(cacheKey, competitors);
      
      return competitors;
    } catch (error) {
      console.warn('Competitor analysis failed, using fallback:', error);
      return this.getFallbackCompetitors(product);
    }
  }

  /**
   * Analyze trending keywords and search volume changes
   */
  private async getTrendAnalysis(keywords: string[]): Promise<TrendData[]> {
    const trends: TrendData[] = [];

    for (const keyword of keywords.slice(0, 10)) { // Limit to prevent API overuse
      try {
        // In production, integrate with Google Trends API
        const trendData = await this.simulateTrendAnalysis(keyword);
        trends.push(trendData);
      } catch (error) {
        console.warn(`Trend analysis failed for ${keyword}:`, error);
        trends.push(this.getFallbackTrendData(keyword));
      }
    }

    return trends;
  }

  /**
   * Analyze price positioning relative to competitors
   */
  private async analyzePricePositioning(product: ProductData): Promise<MarketIntelligenceResult['pricePositioning']> {
    const productPrice = product.price?.value || 0;
    
    // Simulate competitor price analysis
    const competitorPrices = this.simulateCompetitorPrices(product);
    const average = competitorPrices.reduce((sum, price) => sum + price, 0) / competitorPrices.length;
    
    let position: 'low' | 'average' | 'high';
    if (productPrice < average * 0.8) position = 'low';
    else if (productPrice > average * 1.2) position = 'high';
    else position = 'average';

    return {
      position,
      competitorAverage: average,
      recommendedPriceRange: {
        min: average * 0.85,
        max: average * 1.15
      }
    };
  }

  /**
   * Identify keyword gaps and opportunities
   */
  private async analyzeKeywordGaps(product: ProductData, currentKeywords: string[]): Promise<MarketIntelligenceResult['keywordGaps']> {
    // Simulate competitor keyword analysis
    const competitorKeywords = this.simulateCompetitorKeywords(product);
    const currentSet = new Set(currentKeywords.map(k => k.toLowerCase()));
    
    const missingKeywords = competitorKeywords
      .filter(k => !currentSet.has(k.toLowerCase()))
      .slice(0, 10);

    const opportunityKeywords = [
      `best ${product.title.toLowerCase()}`,
      `${product.title.toLowerCase()} reviews`,
      `affordable ${product.title.toLowerCase()}`,
      `${product.title.toLowerCase()} deals`,
      `${product.title.toLowerCase()} comparison`
    ].filter(k => !currentSet.has(k));

    const competitorAdvantages = competitorKeywords
      .filter(k => currentSet.has(k.toLowerCase()))
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
    const avgRating = competitors.reduce((sum, c) => sum + c.rating, 0) / competitors.length;
    const totalReviews = competitors.reduce((sum, c) => sum + c.reviewCount, 0);
    
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

  // Simulation methods (replace with real API calls in production)
  
  private async simulateCompetitorScraping(product: ProductData, keywords: string[]): Promise<CompetitorData[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const basePrice = product.price?.value || 100;
    const competitors: CompetitorData[] = [];
    
    for (let i = 0; i < 5; i++) {
      competitors.push({
        url: `https://competitor${i + 1}.example.com/product`,
        title: `${product.title} Alternative ${i + 1}`,
        price: basePrice + (Math.random() - 0.5) * basePrice * 0.4,
        rating: 3.5 + Math.random() * 1.5,
        reviewCount: Math.floor(Math.random() * 5000) + 100,
        keywords: keywords.slice(0, 3).concat([`competitor${i + 1}`, 'alternative']),
        bulletPoints: [
          `Key feature ${i + 1}`,
          `Benefit ${i + 1}`,
          `Quality aspect ${i + 1}`
        ],
        description: `Competitor ${i + 1} product description...`
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
    return {
      competitors: this.getFallbackCompetitors(product),
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
        description: 'Competitor product description'
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