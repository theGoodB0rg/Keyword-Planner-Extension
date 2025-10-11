import { __private } from '../src/utils/api';
import type { ByokConfig } from '../src/utils/storage';

describe('resolveServiceKey', () => {
  const { resolveServiceKey } = __private;
  const originalGemini = process.env.GEMINI_API_KEY;
  const originalOpenAI = process.env.OPENAI_API_KEY;
  const originalOther = process.env.OTHER_FALLBACK_AI_KEY;

  afterEach(() => {
    if (originalGemini === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalGemini;
    }
    if (originalOpenAI === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalOpenAI;
    }
    if (originalOther === undefined) {
      delete process.env.OTHER_FALLBACK_AI_KEY;
    } else {
      process.env.OTHER_FALLBACK_AI_KEY = originalOther;
    }
  });

  it('prefers BYOK for matching provider and trims whitespace', () => {
    const byok: ByokConfig = { enabled: true, provider: 'gemini', key: '  gem-key-123  ' };
    const resolved = resolveServiceKey('gemini', byok);
    expect(resolved).toBe('gem-key-123');
  });

  it('uses BYOK for OpenAI-compatible services when provider is openai', () => {
    const byok: ByokConfig = { enabled: true, provider: 'openai', key: 'sk-test-abc' };
    expect(resolveServiceKey('openai', byok)).toBe('sk-test-abc');
    expect(resolveServiceKey('generic_openai_clone', byok)).toBe('sk-test-abc');
  });

  it('falls back to environment variables when BYOK is not provided', () => {
    process.env.GEMINI_API_KEY = 'env-gem';
    process.env.OPENAI_API_KEY = 'env-openai';
    process.env.OTHER_FALLBACK_AI_KEY = 'env-other';

    expect(resolveServiceKey('gemini', null)).toBe('env-gem');
    expect(resolveServiceKey('openai', null)).toBe('env-openai');
    expect(resolveServiceKey('generic_openai_clone', null)).toBe('env-other');
  });

  it('returns placeholder when no key is available', () => {
    const value = resolveServiceKey('gemini', null);
    expect(value).toContain('PLACEHOLDER');
  });
});
