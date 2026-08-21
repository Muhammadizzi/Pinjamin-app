/**
 * Auth admin SIGAP (PRD §6.1 / §15).
 *
 * - Login username + password (bukan email).
 * - Password bcrypt, tidak pernah plaintext.
 * - Sesi JWT HS256 di cookie httpOnly + Secure + SameSite.
 * - Token version: ganti password mematikan sesi lama.
 * - Sumber kredensial: Supabase `admins` (jika service role ada) →
 *   data/admin.json → fallback env / default demo (hanya non-production).
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "./supabase-server";
import {
  AUTH_COOKIE,
  SESSION_MAX_AGE_LONG,
  type AdminProfile,
  type PublicAdmin,
  type SessionPayload,
} from "./auth-types";
import {
  clearCookieOptions,
  sessionCookieOptions,
  signSession,
  verifySession,
} from "./auth-edge";
import {
  loginLimiter,
  ticketLimiter,
  trackLimiter,
  clientIp,
} from "./rate-limit";

export {
  AUTH_COOKIE,
  SESSION_MAX_AGE_LONG,
  SESSION_MAX_AGE_SHORT,
} from "./auth-types";
export type { AdminProfile, PublicAdmin, SessionPayload } from "./auth-types";
export {
  signSession,
  verifySession,
  sessionCookieOptions,
  clearCookieOptions,
} from "./auth-edge";
export { loginLimiter, ticketLimiter, trackLimiter, clientIp };

const DATA_DIR =
  process.env.PINJAMIN_DATA_DIR || path.join(process.cwd(), "data");
const ADMIN_FILE = path.join(DATA_DIR, "admin.json");

const DEFAULT_ADMIN_ID = "00000000-0000-0000-0000-000000000001";
/** bcrypt("admin123") — hanya fallback development. */
const DEFAULT_PASSWORD_HASH =
  "$2b$10$5.IJMK0xao/c3qsPEeW5EulR37iU7EEr0CZyJ3a9OVtN/M/wrbzxG";
/** Hash dummy agar compare selalu dijalankan (anti timing-oracle username). */
const DUMMY_HASH =
  "$2b$10$sbwx18nwhuv.BqJqV3cbF.drdq8Zvgs5sOtS4xp0CVa3CRxdLezWe";

const USERNAME_RE = /^[a-zA-Z0-9._-]{3,32}$/;

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Username wajib diisi.")
    .max(32, "Username terlalu panjang."),
  password: z
    .string()
    .min(1, "Password wajib diisi.")
    .max(128, "Password terlalu panjang."),
  remember: z.boolean().optional(),
});

export const profileSchema = z.object({
  fullName: z.string().trim().max(80).default(""),
  username: z
    .string()
    .trim()
    .regex(
      USERNAME_RE,
      "Username 3–32 karakter: huruf, angka, titik, strip, atau underscore."
    ),
  avatar: z.string().max(1_500_000).optional(),
});

export const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Password saat ini wajib diisi."),
  newPassword: z
    .string()
    .min(8, "Password baru minimal 8 karakter.")
    .max(128)
    .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), {
      message: "Password baru harus berisi huruf dan angka.",
    }),
});

let profileCache: AdminProfile | null = null;
let profileCachedAt = 0;

/**
 * Umur cache profil admin.
 *
 * Cache ini per-proses. Di host multi-instance (Vercel) instance yang tidak
 * memproses "ganti password" akan menyimpan token_version lama selamanya, dan
 * menolak cookie baru dengan tv yang sudah naik — user seperti ter-logout
 * acak tergantung instance mana yang melayani. TTL pendek membuat semua
 * instance menyusul dalam hitungan detik.
 */
const PROFILE_CACHE_TTL_MS = 30_000;

function cachedProfile(): AdminProfile | null {
  if (!profileCache) return null;
  if (Date.now() - profileCachedAt > PROFILE_CACHE_TTL_MS) return null;
  return profileCache;
}

function setProfileCache(p: AdminProfile) {
  profileCache = p;
  profileCachedAt = Date.now();
  return p;
}

function envUsername() {
  return (process.env.ADMIN_USERNAME || "adminsystem").trim();
}

const isProduction = () => process.env.NODE_ENV === "production";

/** Hash dari ADMIN_PASSWORD (plaintext env) — dihitung sekali, di-cache. */
let envPlainHashCache: string | null = null;

function baseProfile(hash: string): AdminProfile {
  return {
    id: DEFAULT_ADMIN_ID,
    username: envUsername(),
    fullName: process.env.ADMIN_NAME?.trim() || "Administrator",
    avatar: "",
    hash,
    tokenVersion: 1,
  };
}

/**
 * Kredensial fallback ketika tabel `admins` dan data/admin.json tidak ada.
 *
 * Urutan: ADMIN_PASSWORD_HASH → ADMIN_PASSWORD (di-hash saat runtime) →
 * demo `admin123` HANYA di luar production. Di production tanpa salah satu
 * env di atas hasilnya null: login ditolak, bukan jatuh ke sandi demo yang
 * hash-nya ada di source code publik.
 */
async function fallbackProfile(): Promise<AdminProfile | null> {
  const envHash = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (envHash) return baseProfile(envHash);

  const plain = process.env.ADMIN_PASSWORD?.trim();
  if (plain && plain.length >= 8) {
    if (!envPlainHashCache) envPlainHashCache = await hashPassword(plain);
    return baseProfile(envPlainHashCache);
  }

  if (isProduction()) return null;
  return baseProfile(DEFAULT_PASSWORD_HASH);
}

/** Profil "terkunci": bentuk lengkap tapi hash kosong → tidak pernah cocok. */
function lockedProfile(): AdminProfile {
  return baseProfile("");
}

/**
 * Apakah ada sumber kredensial admin yang bisa dipakai login?
 * Dipakai route login untuk memberi pesan konfigurasi yang jelas alih-alih
 * "username atau password salah" yang menyesatkan.
 */
export async function isAdminConfigured(): Promise<boolean> {
  if (await loadFirstFromSupabase()) return true;
  if (await loadFromFile()) return true;
  return !!(await fallbackProfile());
}

function normalizeProfile(raw: unknown): AdminProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  const username = typeof p.username === "string" ? p.username : "";
  const hash =
    typeof p.hash === "string"
      ? p.hash
      : typeof p.password_hash === "string"
      ? p.password_hash
      : "";
  if (!username || !hash) return null;
  return {
    id: typeof p.id === "string" && p.id ? p.id : DEFAULT_ADMIN_ID,
    username,
    fullName:
      typeof p.fullName === "string"
        ? p.fullName
        : typeof p.name === "string"
        ? p.name
        : "Administrator",
    avatar:
      typeof p.avatar === "string"
        ? p.avatar
        : typeof p.avatar_url === "string"
        ? p.avatar_url
        : "",
    hash,
    tokenVersion:
      typeof p.tokenVersion === "number"
        ? p.tokenVersion
        : typeof p.token_version === "number"
        ? p.token_version
        : 1,
  };
}

function mapDbAdmin(row: Record<string, unknown>): AdminProfile {
  return {
    id: String(row.id || DEFAULT_ADMIN_ID),
    username: String(row.username),
    fullName: String(row.name || "Administrator"),
    avatar: typeof row.avatar_url === "string" ? row.avatar_url : "",
    hash: String(row.password_hash),
    tokenVersion: typeof row.token_version === "number" ? row.token_version : 1,
  };
}

async function loadFromFile(): Promise<AdminProfile | null> {
  try {
    const raw = await fs.readFile(ADMIN_FILE, "utf8");
    return normalizeProfile(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function saveToFile(profile: AdminProfile) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${ADMIN_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(profile, null, 2), "utf8");
  await fs.rename(tmp, ADMIN_FILE);
}

const ADMIN_SELECT =
  "id, username, password_hash, name, avatar_url, token_version";
const ADMIN_SELECT_LEGACY = "id, username, password_hash, name, avatar_url";

async function selectAdmin(
  build: (
    columns: string
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>
): Promise<AdminProfile | null> {
  let { data, error } = await build(ADMIN_SELECT);
  if (error && /token_version/i.test(error.message)) {
    ({ data, error } = await build(ADMIN_SELECT_LEGACY));
  }
  if (error || !data) return null;
  return mapDbAdmin(data as Record<string, unknown>);
}

async function loadFromSupabaseByUsername(
  username: string
): Promise<AdminProfile | null> {
  const supa = getSupabaseAdmin();
  if (!supa) return null;
  // `%` dan `_` adalah wildcard LIKE — di-escape supaya username "%" tidak
  // cocok dengan baris admin mana pun.
  const pattern = username.replace(/[\\%_]/g, (m) => `\\${m}`);
  return selectAdmin((columns) =>
    supa.from("admins").select(columns).ilike("username", pattern).maybeSingle()
  );
}

async function loadFirstFromSupabase(): Promise<AdminProfile | null> {
  const supa = getSupabaseAdmin();
  if (!supa) return null;
  return selectAdmin((columns) =>
    supa
      .from("admins")
      .select(columns)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()
  );
}

async function saveToSupabase(profile: AdminProfile) {
  const supa = getSupabaseAdmin();
  if (!supa) return;
  const row = {
    id: profile.id,
    username: profile.username,
    password_hash: profile.hash,
    name: profile.fullName,
    avatar_url: profile.avatar || null,
    token_version: profile.tokenVersion,
  };
  const { error } = await supa.from("admins").upsert(row, { onConflict: "id" });
  if (error) {
    // token_version mungkin belum ada di schema lama — coba tanpa kolom itu.
    const { token_version: _tv, ...rest } = row;
    const retry = await supa.from("admins").upsert(rest, { onConflict: "id" });
    if (retry.error) {
      console.warn(
        "[auth] gagal menyimpan admin ke Supabase:",
        retry.error.message
      );
    }
  }
}

export async function getAdminProfile(): Promise<AdminProfile> {
  const cached = cachedProfile();
  if (cached) return cached;
  const fromDb = await loadFirstFromSupabase();
  if (fromDb) return setProfileCache(fromDb);
  const fromFile = await loadFromFile();
  if (fromFile) return setProfileCache(fromFile);
  return setProfileCache((await fallbackProfile()) || lockedProfile());
}

async function persistProfile(next: AdminProfile): Promise<AdminProfile> {
  setProfileCache(next);
  await Promise.all([
    saveToFile(next).catch((e) =>
      console.warn("[auth] gagal tulis admin.json:", (e as Error).message)
    ),
    saveToSupabase(next),
  ]);
  return next;
}

export function toPublicAdmin(p: AdminProfile): PublicAdmin {
  return {
    id: p.id,
    username: p.username,
    fullName: p.fullName,
    avatar: p.avatar,
  };
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function authenticateAdmin(
  username: string,
  password: string
): Promise<AdminProfile | null> {
  const fromDb = await loadFromSupabaseByUsername(username);
  const fileOrFallback = fromDb
    ? null
    : (await loadFromFile()) || (await fallbackProfile());
  const candidate =
    fromDb ||
    (fileOrFallback &&
    fileOrFallback.username.toLowerCase() === username.toLowerCase()
      ? fileOrFallback
      : null);

  // Selalu jalankan bcrypt (walau user tidak ada) agar waktu respons tidak
  // membocorkan username mana yang valid.
  const hash = candidate?.hash || DUMMY_HASH;
  const ok = await verifyPassword(password, hash);
  if (!ok || !candidate?.hash) return null;

  setProfileCache(candidate);
  return candidate;
}

/**
 * Bootstrap: jika ADMIN_PASSWORD di-set dan belum ada file/DB, hash & persist.
 * Dipanggil sekali dari login route (lazy).
 */
export async function bootstrapAdminFromEnv(): Promise<void> {
  const plain = process.env.ADMIN_PASSWORD;
  if (!plain || plain.length < 8) return;
  const existingFile = await loadFromFile();
  const existingDb = await loadFirstFromSupabase();
  if (existingFile || existingDb) return;
  const hash = await hashPassword(plain);
  await persistProfile({
    ...baseProfile(hash),
    username: envUsername(),
  });
}

export async function updateAdminProfile(
  patch: Partial<Pick<AdminProfile, "fullName" | "username" | "avatar">>
): Promise<AdminProfile> {
  const current = await getAdminProfile();
  return persistProfile({ ...current, ...patch });
}

export async function setAdminPassword(
  newPlain: string
): Promise<AdminProfile> {
  const current = await getAdminProfile();
  return persistProfile({
    ...current,
    hash: await hashPassword(newPlain),
    tokenVersion: current.tokenVersion + 1,
  });
}

/** @deprecated pakai getAdminProfile — tetap diekspor agar import lama aman. */
export async function getAdminCredentials() {
  const p = await getAdminProfile();
  return { username: p.username, hash: p.hash };
}

export async function requireAuth(
  req: NextRequest
): Promise<SessionPayload | null> {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySession(token);
  if (!session) return null;
  try {
    const admin = await getAdminProfile();
    if (session.username.toLowerCase() !== admin.username.toLowerCase()) {
      return null;
    }
    if (typeof session.tv === "number" && session.tv !== admin.tokenVersion) {
      return null;
    }
    return session;
  } catch {
    // Kalau store admin gagal dibaca, tetap hormati JWT yang valid
    // (mis. disk ephemeral) — username sudah di dalam token.
    return session;
  }
}

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export async function attachSessionCookie(
  res: NextResponse,
  admin: AdminProfile,
  maxAge = SESSION_MAX_AGE_LONG
) {
  const token = await signSession(
    { sub: admin.id, username: admin.username, tv: admin.tokenVersion },
    maxAge
  );
  res.cookies.set(AUTH_COOKIE, token, sessionCookieOptions(maxAge));
  return res;
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(AUTH_COOKIE, "", clearCookieOptions());
  return res;
}

/** Kompat lama: checkRateLimit = login limiter. */
export { loginLimiter as loginRateLimit };
export function checkRateLimit(ip: string) {
  return loginLimiter.check(ip);
}
export function resetRateLimit(ip: string) {
  loginLimiter.reset(ip);
}
