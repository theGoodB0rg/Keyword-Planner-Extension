import { MarketIntelligenceEngine } from '../src/utils/marketIntelligence';
import { ProductData } from '../src/types/product';

describe('Market Intelligence Engine', () => {
  let engine: MarketIntelligenceEngine;
  let mockProduct: ProductData;

  beforeEach(() => {
    engine = MarketIntelligenceEngine.getInstance();
    
    mockProduct = {
      title: 'Test Product',
      brand: 'Test Brand',
      descriptionText: 'A test product description',
      descriptionHTML: '<p>A test product description</p>',
      price: { raw: '$99.99', value: 99.99, currency: 'USD' },
      bullets: ['Feature 1', 'Feature 2', 'Feature 3'],
      images: [],
      specs: [{ key: 'material', value: 'plastic' }],
      variants: [],
      categoryPath: ['Electronics', 'Test Category'],
      reviews: { count: 100, average: 4.5 },
      sku: 'TEST-123',
      availability: 'In Stock',
      detectedPlatform: 'generic' as const,
      url: 'https://example.com/product',
      timestamp: Date.now(),
      raw: {}
    };
  });

  test('should initialize singleton instance', () => {
    const engine1 = MarketIntelligenceEngine.getInstance();
    const engine2 = MarketIntelligenceEngine.getInstance();
    expect(engine1).toBe(engine2);
  });

  test('should analyze market intelligence', async () => {
    const keywords = ['test', 'product', 'quality'];
    const result = await engine.analyzeMarket(mockProduct, keywords);

    expect(result).toBeDefined();
    expect(result.competitors).toBeInstanceOf(Array);
    expect(result.trends).toBeInstanceOf(Array);
    expect(result.pricePositioning).toBeDefined();
    expect(result.keywordGaps).toBeDefined();
    expect(result.marketInsights).toBeDefined();
  });

  test('should provide price positioning analysis', async () => {
    const keywords = ['test'];
    const result = await engine.analyzeMarket(mockProduct, keywords);

    expect(result.pricePositioning.position).toMatch(/^(low|average|high)$/);
    expect(typeof result.pricePositioning.competitorAverage).toBe('number');
    expect(result.pricePositioning.recommendedPriceRange.min).toBeLessThan(
      result.pricePositioning.recommendedPriceRange.max
    );
  });

  test('should identify keyword gaps', async () => {
    const keywords = ['basic', 'keyword'];
    const result = await engine.analyzeMarket(mockProduct, keywords);

    expect(result.keywordGaps.missingKeywords).toBeInstanceOf(Array);
    expect(result.keywordGaps.opportunityKeywords).toBeInstanceOf(Array);
    expect(result.keywordGaps.competitorAdvantages).toBeInstanceOf(Array);
  });

  test('should provide market insights', async () => {
    const keywords = ['insight', 'test'];
    const result = await engine.analyzeMarket(mockProduct, keywords);

    expect(result.marketInsights.competitionLevel).toMatch(/^(low|medium|high)$/);
    expect(typeof result.marketInsights.marketSaturation).toBe('number');
    expect(typeof result.marketInsights.entryBarrier).toBe('number');
    expect(result.marketInsights.recommendations).toBeInstanceOf(Array);
  });

  test('should handle errors gracefully', async () => {
    const keywords: string[] = [];
    const result = await engine.analyzeMarket(mockProduct, keywords);

    // Should still return a valid result object even with empty keywords
    expect(result).toBeDefined();
    expect(result.competitors).toBeInstanceOf(Array);
    expect(result.trends).toBeInstanceOf(Array);
  });
});