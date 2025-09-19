import { ensureKeypair, createSigner, getPublicJwk } from '../src/keys';
import { importJWK, jwtVerify } from 'jose';

test('signs and verifies ES256 token', async () => {
  await ensureKeypair();
  const signer = createSigner();
  const token = await signer({ plan: 'pro', dailyAllowance: 200, features: {}, expiresAt: Date.now() + 3600_000 });
  const pub = await importJWK(getPublicJwk(), 'ES256');
  const { payload } = await jwtVerify(token, pub, { algorithms: ['ES256'] });
  expect(payload.plan).toBe('pro');
});
