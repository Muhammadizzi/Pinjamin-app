import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "pinjamin_session";
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const DEV_ONLY_JWT_SECRET = "pinjamin-dev-secret-please-change";

let cachedSecret: string | null = null;

// Fails fast in production instead of silently signing/verifying JWTs with a
// secret that is checked into source control. In development it falls back
// to a known value so `next dev` keeps working without extra setup.
function getJwtSecret(): string {
  if (cachedSecret) return cachedSecret;
  const fromEnv = process.env.AUTH_SECRET?.trim();
  if (fromEnv) {
    cachedSecret = fromEnv;
    return cachedSecret;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET belum di-set. Generate dengan `openssl rand -base64 32` dan set sebagai env var sebelum deploy ke production."
    );
  }
  console.warn(
    "[auth] AUTH_SECRET tidak di-set - memakai secret default untuk development. Jangan pernah deploy ke production tanpa AUTH_SECRET."
  );
  cachedSecret = DEV_ONLY_JWT_SECRET;
  return cachedSecret;
}

const attempts = new Map<string, { count: number; firstAt: number }>();

// hardcode admin - password: admin123 (hashed with bcrypt 10)
// hash generated: $2a$10$X9Z... we generate at runtime for demo if not exists
const ADMIN_USERNAME = "adminsystem";
const ADMIN_PASSWORD_HASH = bcrypt.hashSync("admin123", 10);

export function getAdminCredentials() {
  return { username: ADMIN_USERNAME, hash: ADMIN_PASSWORD_HASH };
}

export function signSession(payload: { username: string }) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function verifySession(token: string) {
  try {
    return jwt.verify(token, getJwtSecret()) as { username: string };
  } catch {
    return null;
  }
}

export const authConfig = {
  cookieName: COOKIE_NAME,
};

/**
 * Server-side session check for API routes (Node runtime). Verifies the JWT
 * signature/expiry - unlike the edge middleware, which only checks cookie
 * presence for UX redirects and must never be treated as the real gate.
 */
export function requireAuth(req: NextRequest): { username: string } | null {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export function checkRateLimit(ip: string) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry) {
    attempts.set(ip, { count: 1, firstAt: now });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }
  if (now - entry.firstAt > WINDOW_MS) {
    attempts.set(ip, { count: 1, firstAt: now });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }
  if (entry.count >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((entry.firstAt + WINDOW_MS - now) / 1000),
    };
  }
  entry.count++;
  return { allowed: true, remaining: MAX_ATTEMPTS - entry.count };
}

export function resetRateLimit(ip: string) {
  attempts.delete(ip);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}
