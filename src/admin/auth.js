/**
 * Аутентификация для админ-панели.
 *
 * Cloudflare Workers — это не Node.js: нативные модули bcrypt/jsonwebtoken
 * недоступны. Вместо них используется встроенный Web Crypto API:
 *   - пароли:  PBKDF2-SHA256, 100 000 итераций, случайная соль на пользователя
 *              (криптографически эквивалентно bcrypt по стойкости для этой задачи)
 *   - сессии:  JWT HS256, подписанный вручную через HMAC-SHA256
 */

const JWT_ALG = 'HS256';
const TOKEN_TTL_SECONDS = 60 * 60 * 8; // 8 часов

// ---------- base64url ----------
function b64urlEncode(bytes) {
  let str = '';
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (const b of arr) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecodeToBytes(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
function utf8ToBytes(str) {
  return new TextEncoder().encode(str);
}
function bytesToUtf8(bytes) {
  return new TextDecoder().decode(bytes);
}
function bytesToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}
function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

// ---------- пароли (PBKDF2-SHA256) ----------
const PBKDF2_ITERATIONS = 100_000;

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', utf8ToBytes(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS },
    key,
    256
  );
  return `${PBKDF2_ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(new Uint8Array(bits))}`;
}

export async function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 3) return false;
  const [iterStr, saltHex, hashHex] = parts;
  const iterations = Number(iterStr);
  const salt = hexToBytes(saltHex);
  const key = await crypto.subtle.importKey('raw', utf8ToBytes(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  const computedHex = bytesToHex(new Uint8Array(bits));
  return timingSafeEqual(computedHex, hashHex);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ---------- JWT (HS256) ----------
async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', utf8ToBytes(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

export async function signJWT(payload, secret, ttlSeconds = TOKEN_TTL_SECONDS) {
  const header = { alg: JWT_ALG, typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + ttlSeconds };
  const headerB64 = b64urlEncode(utf8ToBytes(JSON.stringify(header)));
  const payloadB64 = b64urlEncode(utf8ToBytes(JSON.stringify(fullPayload)));
  const signingInput = `${headerB64}.${payloadB64}`;
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, utf8ToBytes(signingInput));
  const sigB64 = b64urlEncode(new Uint8Array(sig));
  return `${signingInput}.${sigB64}`;
}

export async function verifyJWT(token, secret) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;
  const signingInput = `${headerB64}.${payloadB64}`;
  const key = await hmacKey(secret);
  let sigBytes;
  try {
    sigBytes = b64urlDecodeToBytes(sigB64);
  } catch {
    return null;
  }
  const valid = await crypto.subtle.verify('HMAC', key, sigBytes, utf8ToBytes(signingInput));
  if (!valid) return null;
  let payload;
  try {
    payload = JSON.parse(bytesToUtf8(b64urlDecodeToBytes(payloadB64)));
  } catch {
    return null;
  }
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === 'number' && now >= payload.exp) return null;
  return payload;
}

// ---------- CSRF (double-submit cookie) ----------
export function generateCsrfToken() {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(24)));
}

// ---------- cookies ----------
export function parseCookies(request) {
  const header = request.headers.get('Cookie') || '';
  const out = {};
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

export function buildCookie(name, value, { maxAge, httpOnly = true, secure = true, sameSite = 'Strict' } = {}) {
  let cookie = `${name}=${encodeURIComponent(value)}; Path=/; SameSite=${sameSite}`;
  if (httpOnly) cookie += '; HttpOnly';
  if (secure) cookie += '; Secure';
  if (typeof maxAge === 'number') cookie += `; Max-Age=${maxAge}`;
  return cookie;
}

export function clearCookie(name, { secure = true } = {}) {
  return `${name}=; Path=/; Max-Age=0; SameSite=Strict; HttpOnly${secure ? '; Secure' : ''}`;
}

/** wrangler dev по умолчанию отдаёт http://localhost — Secure-cookie там браузер не примет. */
export function isHttpsRequest(request) {
  return new URL(request.url).protocol === 'https:';
}

export const SESSION_COOKIE = 'ilm_admin_session';
export const CSRF_COOKIE = 'ilm_admin_csrf';
export const TOKEN_TTL = TOKEN_TTL_SECONDS;
