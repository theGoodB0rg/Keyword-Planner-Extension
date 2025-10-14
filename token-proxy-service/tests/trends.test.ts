import { trendsProxyHandler, configureTrendsRateLimit, resetTrendsTelemetry } from '../src/routes/proxyTrends';

jest.mock('google-trends-api', () => ({
  interestOverTime: jest.fn().mockResolvedValue(`)]}'
{"default":{"timelineData":[{"time":"1704067200","formattedTime":"Dec 2023","value":[23]},{"time":"1706659200","formattedTime":"Jan 2024","value":[41]}]}}`)
}));

const mockReq = (body: any, ip = 'test-ip') => ({
  body,
  ip,
  headers: {},
  connection: { remoteAddress: ip }
} as any);

function mockRes() {
  const res: any = { statusCode: 200 };
  res.status = (code: number) => { res.statusCode = code; return res; };
  res.json = (payload: any) => { res.payload = payload; return res; };
  return res;
}

describe('trendsProxyHandler', () => {
  beforeEach(() => {
    resetTrendsTelemetry();
    configureTrendsRateLimit(10, 60_000);
  });

  it('returns normalized trend data', async () => {
    const res = mockRes();
    await trendsProxyHandler(mockReq({ keyword: 'test', geo: 'US', timeframe: '7d' }) as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(res.payload.keyword).toBe('test');
    expect(res.payload.points.length).toBeGreaterThan(0);
    expect(res.payload.trendDirection).toBeDefined();
  });

  it('rejects invalid payload', async () => {
    const res = mockRes();
    await trendsProxyHandler(mockReq({ keyword: '' }) as any, res as any);
    expect(res.statusCode).toBe(400);
  });

  it('rate limits repeated client requests', async () => {
    configureTrendsRateLimit(1, 10_000);

    const first = mockRes();
    await trendsProxyHandler(mockReq({ keyword: 'alpha' }, 'same-ip') as any, first as any);
    expect(first.statusCode).toBe(200);

    const second = mockRes();
    await trendsProxyHandler(mockReq({ keyword: 'beta' }, 'same-ip') as any, second as any);
    expect(second.statusCode).toBe(429);
    expect(second.payload.error).toBe('RATE_LIMITED');
    expect(second.payload.retryAfter).toBeGreaterThan(0);
  });
});
