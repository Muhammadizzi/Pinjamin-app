import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "node:fs";
import path from "node:path";

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

/**
 * Profil admin persisten (fullName, username, avatar, hash password) disimpan
 * di data/admin.json — folder yang sama dengan store.json (sudah di-gitignore).
 * File dibuat lazy saat pertama kali dibutuhkan lewat Account Settings;
 * kalau belum ada, dipakai kredensial default di atas (adminsystem/admin123).
 */
const DATA_DIR =
  process.env.PINJAMIN_DATA_DIR || path.join(process.cwd(), "data");
const ADMIN_FILE = path.join(DATA_DIR, "admin.json");

export interface AdminProfile {
  username: string;
  fullName: string;
  avatar: string; // URL / data URL
  hash: string;
}

let profileCache: AdminProfile | null = null;

export function getAdminProfile(): AdminProfile {
  if (profileCache) return profileCache;
  try {
    const raw = fs.readFileSync(ADMIN_FILE, "utf8");
    const p = JSON.parse(raw);
    if (p && typeof p.username === "string" && typeof p.hash === "string") {
      profileCache = {
        username: p.username,
        fullName: typeof p.fullName === "string" ? p.fullName : "Administrator",
        avatar: typeof p.avatar === "string" ? p.avatar : "",
        hash: p.hash,
      };
      return profileCache;
    }
  } catch {
    /* file belum ada / corrupt → fallback default */
  }
  profileCache = {
    username: ADMIN_USERNAME,
    fullName: "Administrator",
    avatar: "",
    hash: ADMIN_PASSWORD_HASH,
  };
  return profileCache;
}

function persistProfile(next: AdminProfile): AdminProfile {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${ADMIN_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(next), "utf8");
  fs.renameSync(tmp, ADMIN_FILE); // atomic agar tidak setengah-tertulis
  profileCache = next;
  return next;
}

export function updateAdminProfile(
  patch: Partial<Pick<AdminProfile, "fullName" | "username" | "avatar">>
): AdminProfile {
  return persistProfile({ ...getAdminProfile(), ...patch });
}

export function setAdminPassword(newPlain: string): AdminProfile {
  return persistProfile({ ...getAdminProfile(), hash: hashPassword(newPlain) });
}

export function getAdminCredentials() {
  const p = getAdminProfile();
  return { username: p.username, hash: p.hash };
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

export function hashPassword(plain: string) {
  return bcrypt.hashSync(plain, 10);
}
