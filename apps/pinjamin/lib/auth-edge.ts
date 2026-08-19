/**
 * JWT HS256 + cookie helpers — Web Crypto only, jalan di Edge & Node.
 * Dipakai proxy/middleware untuk memverifikasi sesi (bukan cuma cek cookie ada).
 */
import {
  AUTH_COOKIE,
  SESSION_MAX_AGE_LONG,
  type SessionPayload,
} from "./auth-types";

const DEV_FALLBACK = "pinjamin-dev-secret-please-change";

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.SESSION_SECRET || "";
  if (process.env.NODE_ENV === "production") {
    if (!secret || secret === DEV_FALLBACK || secret.length < 16) {
      throw new Error(
        "AUTH_SECRET wajib di-set di production (min 16 karakter). Generate: openssl rand -base64 32"
      );
    }
    return secret;
  }
  return secret || DEV_FALLBACK;
}

export function getAuthSecretSafe(): string | null {
  try {
    return getAuthSecret();
  } catch {
    return null;
  }
}

function b64urlEncode(data: Uint8Array | string): string {
  const bytes =
    typeof data === "string" ? new TextEncoder().encode(data) : data;
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlDecode(str: string): Uint8Array {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string, usage: KeyUsage[]) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usage
  );
}

export async function signSession(
  payload: Omit<SessionPayload, "iat" | "exp">,
  maxAgeSec = SESSION_MAX_AGE_LONG
): Promise<string> {
  const secret = getAuthSecret();
  const now = Math.floor(Date.now() / 1000);
  const full: SessionPayload = {
    ...payload,
    iat: now,
    exp: now + maxAgeSec,
  };
  const header = b64urlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64urlEncode(JSON.stringify(full));
  const data = `${header}.${body}`;
  const key = await hmacKey(secret, ["sign"]);
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data))
  );
  return `${data}.${b64urlEncode(sig)}`;
}

export async function verifySession(
  token: string
): Promise<SessionPayload | null> {
  if (!token || token.split(".").length !== 3) return null;
  const secret = getAuthSecretSafe();
  if (!secret) return null;
  try {
    const [h, p, s] = token.split(".");
    if (!h || !p || !s) return null;
    const key = await hmacKey(secret, ["verify"]);
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      b64urlDecode(s) as BufferSource,
      new TextEncoder().encode(`${h}.${p}`)
    );
    if (!ok) return null;
    const payload = JSON.parse(
      new TextDecoder().decode(b64urlDecode(p))
    ) as SessionPayload;
    if (!payload?.username || !payload.exp) return null;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export type CookieOpts = {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge: number;
};

export function sessionCookieOptions(
  maxAge = SESSION_MAX_AGE_LONG
): CookieOpts {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  };
}

export function clearCookieOptions(): CookieOpts {
  return {
    ...sessionCookieOptions(0),
    maxAge: 0,
  };
}

export { AUTH_COOKIE };
