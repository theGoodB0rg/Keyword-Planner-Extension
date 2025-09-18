/// <reference types="jest" />
import { appendProductOptimizationHistory, loadProductOptimizationHistory } from '../src/utils/storage';
import { ProductOptimizationResult, ProductData } from '../src/types/product';

// Mock chrome storage API
// Minimal chrome mock (typed as any to bypass strict interface requirements)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).chrome = {
  storage: {
    local: {
      _data: {} as Record<string, any>,
      set(obj: any, cb?: () => void) { this._data = { ...this._data, ...obj }; cb && cb(); },
      get(key: string, cb?: (res: any) => void) { cb && cb({ [key]: this._data[key] }); },
      clear(cb?: () => void) { this._data = {}; cb && cb(); }
    }
  },
  runtime: { lastError: undefined }
};

function makeProduct(): ProductData {
  return {
    title: 'Test Product',
    brand: 'BrandX',
    price: { value: 19.99, currency: 'USD', raw: '$19.99' },
    bullets: ['Feature one', 'Feature two'],
    descriptionHTML: '<p>A great product used for testing.</p>',
    descriptionText: 'A great product used for testing.',
    images: [],
    variants: [],
    specs: [{ key: 'material', value: 'Aluminum' }],
    categoryPath: ['Category','Sub'],
    reviews: { count: 120, average: 4.5 },
    sku: 'SKU123',
    availability: 'In Stock',
    detectedPlatform: 'generic',
    url: 'http://example.com',
    timestamp: Date.now(),
    raw: {}
  };
}

function makeResult(ts: number): ProductOptimizationResult {
  return {
    product: makeProduct(),
    timestamp: ts,
    longTail: [{ phrase: 'test product buy', score: 0.5 }],
    meta: { metaTitle: 'Title', metaDescription: 'Desc', metaTitleLength: 5, metaDescriptionLength: 4 },
    rewrittenBullets: [{ original: 'Feature one', rewritten: 'Improved feature one', length: 19 }],
    gaps: { gaps: [], gapScore: 0, classification: 'none' }
  };
}

describe('storage history', () => {
  test('appends and caps history', async () => {
    for (let i=0;i<12;i++) {
      const r = makeResult(Date.now() + i);
      await appendProductOptimizationHistory(r, 10);
    }
    const hist = await loadProductOptimizationHistory();
    expect(hist.length).toBe(10);
    // ensure most recent first
    for (let i=0;i<hist.length-1;i++) {
      expect(hist[i].timestamp).toBeGreaterThanOrEqual(hist[i+1].timestamp);
    }
  });
});
