// Lightweight licensing & quota management (local-first)
// Token format (initial): base64(JSON.stringify({ plan, dailyAllowance, features, expiresAt? }))

import { saveData, loadData } from './storage';
import { importEs256PublicKey, verifyJwsEs256, isExpValid, ES256Jwk } from './crypto';

export type PlanName = 'free' | 'pro' | 'enterprise';

export interface LicenseInfo {
  plan: PlanName;
  dailyAllowance: number; // analyses per UTC day
  usedToday: number;      // increment on analysis start; refund on hard failure
  features: Record<string, boolean>;
  expiresAt?: number;     // epoch ms (optional)
  trial?: boolean;
  lastResetDay?: string;  // YYYY-MM-DD (UTC)
}

const LICENSE_KEY = 'license.info';

const DEFAULT_FREE: LicenseInfo = {
  plan: 'free',
  dailyAllowance: 5,
  usedToday: 0,
  features: {
    advancedGaps: false,
    csvExport: false,
    multiToneBullets: false,
  },
  trial: false,
};

function utcDayString(d = new Date()): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10);
}

export async function loadLicense(): Promise<LicenseInfo> {
  const lic = await loadData<LicenseInfo>(LICENSE_KEY, DEFAULT_FREE);
  return ensureReset(lic);
}

export async function saveLicense(info: LicenseInfo): Promise<void> {
  await saveData(LICENSE_KEY, info);
}

function ensureReset(lic: LicenseInfo): LicenseInfo {
  const today = utcDayString();
  if (lic.lastResetDay !== today) {
    return { ...lic, usedToday: 0, lastResetDay: today };
  }
  return lic;
}

export async function getStatus(): Promise<{ info: LicenseInfo; remaining: number }> {
  const lic = await loadLicense();
  const remaining = Math.max(0, lic.dailyAllowance - lic.usedToday);
  return { info: lic, remaining };
}

export async function canConsume(): Promise<{ allowed: boolean; info: LicenseInfo; remaining: number }> {
  let lic = await loadLicense();
  lic = ensureReset(lic);
  const remaining = Math.max(0, lic.dailyAllowance - lic.usedToday);
  return { allowed: remaining > 0, info: lic, remaining };
}

export async function consumeOne(): Promise<{ info: LicenseInfo; remaining: number }> {
  let lic = await loadLicense();
  lic = ensureReset(lic);
  lic.usedToday = Math.min(lic.usedToday + 1, lic.dailyAllowance + 100); // cap to avoid overflow
  lic.lastResetDay = utcDayString();
  await saveLicense(lic);
  return { info: lic, remaining: Math.max(0, lic.dailyAllowance - lic.usedToday) };
}

export async function refundOne(): Promise<{ info: LicenseInfo; remaining: number }> {
  let lic = await loadLicense();
  lic = ensureReset(lic);
  lic.usedToday = Math.max(0, lic.usedToday - 1);
  await saveLicense(lic);
  return { info: lic, remaining: Math.max(0, lic.dailyAllowance - lic.usedToday) };
}

// Activation: decode token and persist as LicenseInfo (no crypto yet; stub for beta)
export async function activateToken(token: string): Promise<{ ok: boolean; info?: LicenseInfo; error?: string }> {
  // Dev escape hatch for private beta: allow base64 JSON if token starts with 'dev.'
  if (token.startsWith('dev.')) {
    try {
      const json = JSON.parse(atob(token.slice(4)));
      const plan = (json.plan || 'free') as PlanName;
      const dailyAllowance = Number(json.dailyAllowance ?? (plan === 'pro' ? 200 : 5));
      const features = typeof json.features === 'object' && json.features ? json.features : {};
      const info: LicenseInfo = ensureReset({
        plan,
        dailyAllowance: Math.max(1, dailyAllowance),
        usedToday: 0,
        features,
        expiresAt: typeof json.expiresAt === 'number' ? json.expiresAt : undefined,
        trial: !!json.trial,
        lastResetDay: utcDayString(),
      });
      await saveLicense(info);
      return { ok: true, info };
    } catch {
      return { ok: false, error: 'Invalid dev token' };
    }
  }

  try {
    // Expect JWS (ES256) format header.payload.signature
    // Public key should be embedded (safe; verify-only) or loaded from config.
    const pubJwk: ES256Jwk = {
      kty: 'EC', crv: 'P-256',
      // Placeholder coordinates — replace with your real public key before release
      x: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      y: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
    };
    const pub = await importEs256PublicKey(pubJwk);
    const verified = await verifyJwsEs256(token, pub);
    if (!verified) return { ok: false, error: 'Signature verification failed' };
    const payload = verified.payload || {};
    if (!isExpValid(payload.expiresAt)) return { ok: false, error: 'Token expired' };
    const plan = (payload.plan || 'free') as PlanName;
    const dailyAllowance = Number(payload.dailyAllowance ?? (plan === 'pro' ? 200 : 5));
    const features = typeof payload.features === 'object' && payload.features ? payload.features : {};
    const info: LicenseInfo = ensureReset({
      plan,
      dailyAllowance: Math.max(1, dailyAllowance),
      usedToday: 0,
      features,
      expiresAt: typeof payload.expiresAt === 'number' ? payload.expiresAt : undefined,
      trial: !!payload.trial,
      lastResetDay: utcDayString(),
    });
    await saveLicense(info);
    return { ok: true, info };
  } catch (e: any) {
    return { ok: false, error: 'Invalid activation token' };
  }
}

export function isExpired(info: LicenseInfo): boolean {
  if (!info.expiresAt) return false;
  return Date.now() > info.expiresAt;
}
