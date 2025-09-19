import { generateKeyPair, exportJWK, importJWK, JWK, SignJWT } from 'jose';

let privateJwk: JWK | null = null;
let publicJwk: JWK | null = null;
let kid: string | undefined;

export async function ensureKeypair() {
  if (privateJwk && publicJwk) return;
  // Try env
  const privEnv = process.env.PRIVATE_JWK && process.env.PRIVATE_JWK.trim() !== '' ? JSON.parse(process.env.PRIVATE_JWK) : null;
  const pubEnv = process.env.PUBLIC_JWK && process.env.PUBLIC_JWK.trim() !== '' ? JSON.parse(process.env.PUBLIC_JWK) : null;
  if (privEnv && pubEnv) {
    privateJwk = privEnv;
    publicJwk = pubEnv;
    kid = (publicJwk as any).kid;
    return;
  }
  // Generate ephemeral P-256
  const { publicKey, privateKey } = await generateKeyPair('ES256');
  publicJwk = await exportJWK(publicKey);
  privateJwk = await exportJWK(privateKey);
  publicJwk.kty = 'EC';
  publicJwk.crv = 'P-256';
  privateJwk.kty = 'EC';
  privateJwk.crv = 'P-256';
  kid = `${Date.now()}`;
  (publicJwk as any).kid = kid;
  (privateJwk as any).kid = kid;
}

export function getPublicJwk(): JWK {
  if (!publicJwk) throw new Error('Keypair not initialized');
  return publicJwk;
}

export function getKeyId(): string | undefined { return kid; }

export function getJWKS() {
  if (!publicJwk) throw new Error('Keypair not initialized');
  return { keys: [publicJwk] };
}

export function createSigner() {
  if (!privateJwk) throw new Error('Keypair not initialized');
  return async (payload: Record<string, any>) => {
    const priv = await importJWK(privateJwk as any, 'ES256');
    const signer = new SignJWT(payload)
      .setProtectedHeader({ alg: 'ES256', kid })
      .setIssuedAt();
    if (payload.expiresAt && typeof payload.expiresAt === 'number') {
      // 'exp' must be seconds; the client also stores expiresAt in ms for UX
      signer.setExpirationTime(Math.floor(payload.expiresAt / 1000));
    }
    return await signer.sign(priv);
  };
}
