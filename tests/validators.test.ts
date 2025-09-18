import { LongTailSuggestion, MetaSuggestion, RewrittenBullet, GapResult } from '../src/types/product';

// Simple runtime validators mirroring shapes (duplicated for test isolation)
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

describe('validator helpers', () => {
  test('valid long tail array passes', () => {
    const sample: LongTailSuggestion[] = [{ phrase: 'buy test product', score: 0.7 }];
    expect(isLongTailArray(sample)).toBe(true);
  });
  test('invalid long tail array fails', () => {
    // @ts-ignore
    expect(isLongTailArray([{ phraseX: 'no', score: 'bad' }])).toBe(false);
  });
  test('meta suggestion', () => {
    const meta: MetaSuggestion = { metaTitle: 'Title', metaDescription: 'Desc', metaTitleLength: 5, metaDescriptionLength: 4 };
    expect(isMetaSuggestion(meta)).toBe(true);
  });
  test('rewritten bullets', () => {
    const arr: RewrittenBullet[] = [{ original: 'a', rewritten: 'A', length: 1 }];
    expect(isRewrittenBullets(arr)).toBe(true);
  });
  test('gap result', () => {
    const gap: GapResult = { gaps: [], gapScore: 0, classification: 'none' };
    expect(isGapResult(gap)).toBe(true);
  });
});
