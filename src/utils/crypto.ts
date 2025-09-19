// Minimal JWS (ES256) verification for activation tokens
// Token format: base64url(header).base64url(payload).base64url(signature)
// Header example: {"alg":"ES256","typ":"JWT"}

function b64urlToUint8Array(b64url: string): Uint8Array {
  const pad = '='.repeat((4 - (b64url.length % 4)) % 4);
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function textEncoder(): TextEncoder { return new TextEncoder(); }

export type ES256Jwk = { kty: 'EC'; crv: 'P-256'; x: string; y: string; ext?: boolean; key_ops?: string[]; kid?: string };

export async function importEs256PublicKey(jwk: ES256Jwk): Promise<CryptoKey> {
  if (!globalThis.crypto?.subtle) throw new Error('Web Crypto not available');
  return await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y, ext: true },
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['verify']
  );
}

export async function verifyJwsEs256(token: string, publicKey: CryptoKey): Promise<{ header: any; payload: any } | null> {
  if (!token || token.split('.').length !== 3) return null;
  const [h, p, s] = token.split('.');
  try {
    const headerJson = JSON.parse(new TextDecoder().decode(b64urlToUint8Array(h)));
    if (headerJson.alg !== 'ES256') return null;
    const data = textEncoder().encode(`${h}.${p}`);
    const sig = b64urlToUint8Array(s);
    const ok = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      publicKey,
      sig as unknown as BufferSource,
      data as unknown as BufferSource
    );
    if (!ok) return null;
    const payloadJson = JSON.parse(new TextDecoder().decode(b64urlToUint8Array(p)));
    return { header: headerJson, payload: payloadJson };
  } catch {
    return null;
  }
}

export function isExpValid(exp?: number): boolean {
  if (!exp) return true;
  return Date.now() < exp;
}
