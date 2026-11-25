import crypto from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(crypto.scrypt);

// Keep signing secret in process.env with an in-memory crypto.randomBytes(32) fallback
const IN_MEMORY_FALLBACK_KEY = crypto.randomBytes(32).toString('hex');

function getSigningSecret(): string {
  return process.env.SESSION_SECRET || IN_MEMORY_FALLBACK_KEY;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;

  try {
    const keyBuffer = Buffer.from(keyHex, 'hex');
    const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
    if (keyBuffer.length !== derivedKey.length) return false;
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

const TOKEN_PREFIX = 'ipet1.';
export const SESSION_COOKIE_NAME = 'ipet247_session';
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const SESSION_TTL_MS = SESSION_TTL_SECONDS * 1000;

export function parseSessionCookie(cookieHeader?: string): string | null {
  if (!cookieHeader || typeof cookieHeader !== 'string') return null;
  const pairs = cookieHeader.split(';');
  for (const rawPair of pairs) {
    const eqIndex = rawPair.indexOf('=');
    if (eqIndex <= 0) continue;
    const name = rawPair.slice(0, eqIndex).trim();
    if (name !== SESSION_COOKIE_NAME) continue;
    const rawValue = rawPair.slice(eqIndex + 1).trim();
    if (!rawValue) return null;
    try {
      return decodeURIComponent(rawValue);
    } catch {
      return null;
    }
  }
  return null;
}

export function formatSessionSetCookie(token: string): string {
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=${SESSION_TTL_SECONDS}`;
}

export function formatSessionClearCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=0`;
}

export function signSessionToken(uid: string): string {
  const payload = {
    uid,
    iat: Date.now(),
    exp: Date.now() + SESSION_TTL_MS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signatureB64 = crypto
    .createHmac('sha256', getSigningSecret())
    .update(payloadB64)
    .digest('base64url');
  return `${TOKEN_PREFIX}${payloadB64}.${signatureB64}`;
}

export function verifySessionToken(token: string): { uid: string } | null {
  if (!token.startsWith(TOKEN_PREFIX)) return null;
  const body = token.slice(TOKEN_PREFIX.length);
  const dotIdx = body.indexOf('.');
  if (dotIdx <= 0) return null;

  const payloadB64 = body.slice(0, dotIdx);
  const signatureB64 = body.slice(dotIdx + 1);
  if (!payloadB64 || !signatureB64) return null;

  try {
    const expectedSig = crypto
      .createHmac('sha256', getSigningSecret())
      .update(payloadB64)
      .digest('base64url');

    const sigBuf = Buffer.from(signatureB64, 'utf8');
    const expectedBuf = Buffer.from(expectedSig, 'utf8');
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

    const decoded = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8')
    ) as { uid?: string; exp?: number };

    if (!decoded.uid || typeof decoded.exp !== 'number') return null;
    if (Date.now() > decoded.exp) return null;

    return { uid: decoded.uid };
  } catch {
    return null;
  }
}

export function hashResetCode(code: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const digest = crypto
    .createHash('sha256')
    .update(`${salt}:${code.trim()}`)
    .digest('hex');
  return `${salt}:${digest}`;
}

export function verifyResetCodeHash(code: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, digestHex] = parts;
  if (!salt || !digestHex) return false;

  try {
    const expectedHex = crypto
      .createHash('sha256')
      .update(`${salt}:${code.trim()}`)
      .digest('hex');
    const a = Buffer.from(digestHex, 'hex');
    const b = Buffer.from(expectedHex, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
