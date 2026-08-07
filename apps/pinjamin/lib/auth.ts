import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.AUTH_SECRET || "pinjamin-dev-secret-please-change";
const COOKIE_NAME = "pinjamin_session";
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

const attempts = new Map<string, { count: number; firstAt: number }>();

// hardcode admin - password: admin123 (hashed with bcrypt 10)
// hash generated: $2a$10$X9Z... we generate at runtime for demo if not exists
const ADMIN_USERNAME = "adminsystem";
const ADMIN_PASSWORD_HASH = bcrypt.hashSync("admin123", 10);

export function getAdminCredentials() {
  return { username: ADMIN_USERNAME, hash: ADMIN_PASSWORD_HASH };
}

export function signSession(payload: { username: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifySession(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as { username: string };
  } catch {
    return null;
  }
}

export const authConfig = {
  cookieName: COOKIE_NAME,
  jwtSecret: JWT_SECRET,
};

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
