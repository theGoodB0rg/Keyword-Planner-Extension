import { Request, Response } from 'express';
import { z } from 'zod';
import { createSigner, ensureKeypair } from '../keys';

const payloadSchema = z.object({
  plan: z.enum(['free', 'pro', 'enterprise']).default('pro'),
  dailyAllowance: z.number().int().min(1).max(2000).default(200),
  features: z.record(z.boolean()).default({}),
  // expiresAt: epoch ms
  expiresAt: z.number().int(),
  trial: z.boolean().optional(),
});

export async function issueTokenHandler(req: Request, res: Response) {
  try {
    await ensureKeypair();
    const parse = payloadSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: 'Invalid payload', details: parse.error.flatten() });
    const signer = createSigner();
    const token = await signer(parse.data);
    res.json({ token });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to issue token' });
  }
}
