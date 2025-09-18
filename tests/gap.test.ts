import { classifyGapScore, getExpectedAttributes } from '../src/background/aiOrchestrator';

describe('gap logic', () => {
  test('classifyGapScore thresholds', () => {
    expect(classifyGapScore(0)).toBe('none');
    expect(classifyGapScore(2)).toBe('mild');
    expect(classifyGapScore(6)).toBe('moderate');
    expect(classifyGapScore(10)).toBe('severe');
  });
  test('expected attributes per platform', () => {
    expect(getExpectedAttributes('amazon')).toEqual(expect.arrayContaining(['asin', 'brand']));
    expect(getExpectedAttributes('shopify')).toEqual(expect.arrayContaining(['sku', 'brand']));
  });
});
