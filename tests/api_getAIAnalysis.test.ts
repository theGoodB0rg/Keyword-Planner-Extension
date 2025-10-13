jest.mock('../src/utils/storage', () => {
  const actual = jest.requireActual('../src/utils/storage');
  return {
    ...actual,
    loadByokConfig: jest.fn().mockResolvedValue(null),
  };
});

describe('getAIAnalysis integration with dev proxy', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalFetch = global.fetch;
  const originalChrome = (global as any).chrome;

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();

    process.env.NODE_ENV = 'production';
    process.env.OPENAI_API_KEY = '';
    process.env.GEMINI_API_KEY = '';
    process.env.GOOGLE_GEMINI_API_KEY = '';
    process.env.DEEPSEEK_API_KEY = '';
    process.env.OTHER_FALLBACK_AI_KEY = '';

    const fetchMock = jest.fn((_url: RequestInfo, options?: RequestInit) => {
      return new Promise<Response>((resolve, reject) => {
        const response = {
          ok: true,
          json: async () => ({ provider: 'openai', content: '["synthetic ai output"]' }),
        } as unknown as Response;

        const timer = setTimeout(() => resolve(response), 3000);
        if (options && options.signal instanceof AbortSignal) {
          options.signal.addEventListener('abort', () => {
            clearTimeout(timer);
            const err = new Error('aborted');
            (err as any).name = 'AbortError';
            reject(err);
          });
        }
      });
    });

    global.fetch = fetchMock as unknown as typeof fetch;
    (global as any).chrome = {
      storage: {
        local: {
          get: (_key: string, cb: (value: Record<string, unknown>) => void) => cb({}),
          set: (_value: Record<string, unknown>, cb?: () => void) => cb?.(),
        },
      },
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    if (originalEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalEnv;
    }
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      delete (global as any).fetch;
    }
    if (originalChrome) {
      (global as any).chrome = originalChrome;
    } else {
      delete (global as any).chrome;
    }
  });

  test('waits long enough for proxy response instead of forcing fallback', async () => {
    const { getAIAnalysis } = require('../src/utils/api');

    const promise = getAIAnalysis('Return JSON array with keyword recommendations.');

    await jest.advanceTimersByTimeAsync(3100);
    const result = await promise;

    expect(result).toBe('["synthetic ai output"]');
    expect((global.fetch as unknown as jest.Mock).mock.calls).toHaveLength(1);
  });
});
