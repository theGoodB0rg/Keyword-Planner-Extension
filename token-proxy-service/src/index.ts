import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';
import { createSigner, getJWKS, getPublicJwk, getKeyId, ensureKeypair } from './keys';
import { issueTokenHandler } from './routes/issueToken';
import { aiProxyHandler } from './routes/proxyAi';
import { rateLimit } from './rateLimit';

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(cors());
app.use(helmet({ contentSecurityPolicy: false }));

// Shared-secret gate (optional but recommended)
const SHARED_SECRET = process.env.EXT_SHARED_SECRET || '';
app.use((req, res, next) => {
  if (!SHARED_SECRET) return next(); // disabled
  const got = req.header('X-EXT-SECRET');
  if (got !== SHARED_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  next();
});

// Health
app.get('/health', (_req, res) => res.json({ ok: true }));

// JWKS
app.get('/.well-known/jwks.json', rateLimit, async (_req, res) => {
  try {
    await ensureKeypair();
    res.json(getJWKS());
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to load JWKS' });
  }
});

// Issue token
app.post('/issue-token', rateLimit, issueTokenHandler);

// AI Proxy
app.post('/proxy/ai', rateLimit, aiProxyHandler);

const port = Number(process.env.PORT || 8787);
ensureKeypair().then(() => {
  app.listen(port, () => console.log(`token-proxy-service listening on :${port}`));
});
