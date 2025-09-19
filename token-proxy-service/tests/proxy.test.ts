import { aiProxyHandler } from '../src/routes/proxyAi';

function mockReq(body: any) { return { body, header: () => 'test' } as any; }
function mockRes() {
  const res: any = { statusCode: 200 };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (d: any) => { res.data = d; return res; };
  return res;
}

test('echo mode when no OPENAI_API_KEY', async () => {
  delete (process.env as any).OPENAI_API_KEY;
  const req = mockReq({ prompt: 'Hello' });
  const res = mockRes();
  await aiProxyHandler(req as any, res as any);
  expect(res.statusCode).toBe(200);
  expect(res.data.provider).toBe('echo');
});
