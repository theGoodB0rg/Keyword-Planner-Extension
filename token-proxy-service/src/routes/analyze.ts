import { Request, Response } from 'express';
import { z } from 'zod';

const schema = z.object({
  content: z.string().min(1),
});

// Super simple heuristic analyzer for dev/local testing.
// In prod, replace with real NLP or call LLM provider securely server-side.
export function analyzeHandler(req: Request, res: Response) {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
  const { content } = parsed.data;

  // Extract top words as mock keywords
  const words = (content || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && w.length < 30);

  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
  const top = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([w, f], i) => ({
      keyword: w,
      searchVolume: 500 + f * 25 + i * 10,
      keywordDifficulty: Math.min(90, 20 + f * 2 + i * 3),
      cpc: Number((0.4 + (f % 5) * 0.2 + i * 0.05).toFixed(2)),
      competition: (i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low') as 'low'|'medium'|'high',
    }));

  return res.json(top);
}

export function analyzeInfoHandler(_req: Request, res: Response) {
  return res.json({
    ok: true,
    endpoint: '/analyze',
    method: 'POST',
    expects: { content: 'string' },
    example: {
      content: 'This is a sample product page about wireless headphones and noise cancelling.'
    }
  });
}
