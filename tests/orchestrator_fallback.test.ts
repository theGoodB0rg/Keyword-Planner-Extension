import { optimizeProduct } from '../src/background/aiOrchestrator';
import { ProductData } from '../src/types/product';

// Mock api to return invalid JSON for AI responses forcing heuristic fallbacks
jest.mock('../src/utils/api', () => ({
  getAIAnalysis: jest.fn(async () => '{invalid-json'),
}));

function makeProduct(): ProductData {
  return {
    title: 'Test Product',
    brand: 'Brand',
    price: { value: 19.99, currency: 'USD', raw: '$19.99' },
    bullets: ['One', 'Two'],
    descriptionHTML: '<p>HTML</p>',
    descriptionText: 'TEXT',
    images: [],
    variants: [],
    specs: [{ key: 'material', value: 'steel' }],
    categoryPath: [],
    reviews: { count: 0, average: 0 },
    sku: null,
    availability: 'In Stock',
    detectedPlatform: 'generic',
    url: 'http://example.com',
    timestamp: Date.now(),
    raw: {}
  };
}

describe('orchestrator fallback behavior', () => {
  test('returns heuristic-shaped data when AI JSON invalid', async () => {
    const product = makeProduct();
    const res = await optimizeProduct(product, false);
    const byTask = new Map(res.map(r => [r.task, r.data]));
    expect(Array.isArray(byTask.get('generate.longTail'))).toBe(true);
    expect(byTask.get('generate.meta')).toHaveProperty('metaTitle');
    expect(Array.isArray(byTask.get('rewrite.bullets'))).toBe(true);
    expect(byTask.get('detect.gaps')).toHaveProperty('gapScore');
  });
});
