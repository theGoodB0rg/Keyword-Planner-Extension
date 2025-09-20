import { Request, Response } from 'express';
import { z } from 'zod';

const schema = z.object({
  provider: z.enum(['openai']).default('openai'),
  model: z.string().default('gpt-4o-mini'),
  prompt: z.string().min(1),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(16).max(4096).optional(),
});

export async function aiProxyHandler(req: Request, res: Response) {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
  const { model, prompt, temperature, maxTokens } = parsed.data;

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    // echo mode
    return res.json({ provider: 'echo', model, content: `ECHO: ${prompt.slice(0, 2000)}` });
  }

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: prompt },
        ],
        temperature,
        max_tokens: maxTokens,
      }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      return res.status(resp.status).json({ error: 'Provider error', details: text });
    }
  const json = await resp.json() as any;
  const content = (json as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]?.message?.content || '';
    return res.json({ provider: 'openai', model, content });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Proxy failure' });
  }
}

export function aiProxyInfoHandler(_req: Request, res: Response) {
  return res.json({
    ok: true,
    endpoint: '/proxy/ai',
    method: 'POST',
    expects: { model: 'string', prompt: 'string', temperature: 'number?', maxTokens: 'number?' },
    example: { model: 'gpt-4o-mini', prompt: 'Hello from dev' }
  });
}
