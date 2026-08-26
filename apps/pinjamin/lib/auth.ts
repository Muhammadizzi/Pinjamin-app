/**
 * Auth admin SIGAP (PRD §6.1 / §15).
 *
 * - Login username + password (bukan email).
 * - Password bcrypt, tidak pernah plaintext.
 * - Sesi JWT HS256 di cookie httpOnly + Secure + SameSite.
 * - Token version: ganti password mematikan sesi lama.
 * - Sumber kredensial: Supabase `admins` (jika service role ada) →
 *   data/admin.json → fallback env / default demo (hanya non-production).
 *
 * SIGAP punya BANYAK admin dengan peran berbeda (lihat AdminRole di
 * auth-types.ts). Karena itu tidak ada lagi "profil admin" tunggal di modul
 * ini: setiap profil selalu diresolusi dari sesi pemanggil. Versi sebelumnya
 * memakai satu cache global berisi baris admin PERTAMA — begitu ada admin
 * kedua, cache itu akan menyajikan profil orang lain kepada siapa pun yang
 * kebetulan dilayani instance yang sama.
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
  isAdminRole,
  type AdminProfile,
  type AdminRole,
  type PublicAdmin,
  type SessionPayload,
} from "./auth-types";
import { isWorkingOrder } from "./ticket-shared";
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
  ADMIN_ROLES,
  isAdminRole,
  isHelpdesk,
} from "./auth-types";
export type {
  AdminProfile,
  AdminRole,
  PublicAdmin,
  SessionPayload,
} from "./auth-types";
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

/**
 * Cache profil admin, DIKUNCI PER USERNAME.
 *
 * Dulu satu variabel global. Dengan empat admin, request admin GA dan admin
 * IT dilayani proses yang sama, dan siapa pun yang menulis terakhir menang —
 * artinya seorang admin bisa menerima profil, peran, dan working order milik
 * orang lain. Kunci per username membuat itu mustahil.
 */
const profileCache = new Map<string, { profile: AdminProfile; at: number }>();

/**
 * Umur cache profil admin.
 *
 * Cache ini per-proses. Di host multi-instance (Vercel) instance yang tidak
 * memproses "ganti password" akan menyimpan token_version lama selamanya, dan
 * menolak cookie baru dengan tv yang sudah naik — user seperti ter-logout
 * acak tergantung instance mana yang melayani. TTL pendek membuat semua
 * instance menyusul dalam hitungan detik.
 *
 * TTL ini juga membatasi berapa lama peran yang dicabut di database masih
 * dihormati proses ini.
 */
const PROFILE_CACHE_TTL_MS = 30_000;

const cacheKey = (username: string) => username.trim().toLowerCase();

function cachedProfile(username: string): AdminProfile | null {
  const hit = profileCache.get(cacheKey(username));
  if (!hit) return null;
  if (Date.now() - hit.at > PROFILE_CACHE_TTL_MS) return null;
  return hit.profile;
}

function setProfileCache(p: AdminProfile) {
  profileCache.set(cacheKey(p.username), { profile: p, at: Date.now() });
  return p;
}

function envUsername() {
  return (process.env.ADMIN_USERNAME || "adminsystem").trim();
}

const isProduction = () => process.env.NODE_ENV === "production";

/** Hash dari ADMIN_PASSWORD (plaintext env) — dihitung sekali, di-cache. */
let envPlainHashCache: string | null = null;

/**
 * Admin darurat dari env / demo. SELALU berperan ASSET.
 *
 * Jalur ini tidak punya cara menyatakan working order, dan admin helpdesk
 * tanpa working order akan berhadapan dengan antrean kosong sambil mengira
 * tidak ada tiket masuk. Akun helpdesk hanya boleh lahir dari tabel `admins`,
 * tempat constraint database memaksa keduanya terisi bersamaan.
 */
function baseProfile(hash: string): AdminProfile {
  return {
    id: DEFAULT_ADMIN_ID,
    username: envUsername(),
    fullName: process.env.ADMIN_NAME?.trim() || "Administrator",
    avatar: "",
    role: "ASSET",
    workingOrder: null,
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
    ...readRole(p.role, p.workingOrder ?? p.working_order),
    hash,
    tokenVersion:
      typeof p.tokenVersion === "number"
        ? p.tokenVersion
        : typeof p.token_version === "number"
        ? p.token_version
        : 1,
  };
}

/**
 * Baca peran + working order dari sumber apa pun (baris DB atau admin.json).
 *
 * Peran yang tidak dikenal — termasuk yang HILANG, seperti pada database yang
 * belum menjalankan supabase/11-admin-roles.sql — jatuh ke ASSET, bukan
 * HELPDESK. Itu memang menjaga perilaku lama tetap utuh sebelum migrasi
 * dijalankan, tapi alasan utamanya: HELPDESK adalah peran yang menyaring, dan
 * peran menyaring yang lahir dari data rusak akan menyaring ke wilayah yang
 * tidak pernah diberikan kepada siapa pun.
 *
 * HELPDESK tanpa working order yang sah juga diturunkan ke ASSET, karena
 * admin helpdesk tanpa antrean tidak punya arti yang bisa dipertahankan.
 */
function readRole(
  rawRole: unknown,
  rawWo: unknown
): Pick<AdminProfile, "role" | "workingOrder"> {
  const role: AdminRole = isAdminRole(rawRole) ? rawRole : "ASSET";
  if (role !== "HELPDESK") return { role: "ASSET", workingOrder: null };
  const wo = typeof rawWo === "string" ? rawWo.trim() : "";
  if (!isWorkingOrder(wo)) {
    console.warn(
      `[auth] admin berperan HELPDESK tanpa working order sah (${JSON.stringify(
        rawWo
      )}); diturunkan ke ASSET. Perbaiki barisnya di tabel admins.`
    );
    return { role: "ASSET", workingOrder: null };
  }
  return { role: "HELPDESK", workingOrder: wo };
}

function mapDbAdmin(row: Record<string, unknown>): AdminProfile {
  return {
    id: String(row.id || DEFAULT_ADMIN_ID),
    username: String(row.username),
    fullName: String(row.name || "Administrator"),
    avatar: typeof row.avatar_url === "string" ? row.avatar_url : "",
    ...readRole(row.role, row.working_order),
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

/**
 * Daftar kolom, dari terlengkap ke paling lama. Dicoba berurutan supaya
 * aplikasi baru tetap bisa login pada database yang SQL-nya belum dijalankan
 * — di SIGAP kolom ditambahkan manual, jadi jeda antara deploy dan migrasi
 * adalah keadaan normal, bukan kecelakaan.
 */
const ADMIN_SELECTS = [
  "id, username, password_hash, name, avatar_url, token_version, role, working_order",
  "id, username, password_hash, name, avatar_url, token_version",
  "id, username, password_hash, name, avatar_url",
];

/** Error Postgres saat kolom yang diminta belum ada. */
const isMissingColumn = (message: string) =>
  /column .* does not exist|token_version|working_order|\brole\b/i.test(
    message
  );

/**
 * Semua akun admin, untuk pemilih akun saat berpindah meja.
 *
 * TIDAK mengembalikan hash — pemanggilnya wajib melewatkannya lewat
 * toPublicAdmin(). Daftar ini hanya boleh keluar ke pemegang sesi admin yang
 * sah: nama pengguna bukan rahasia besar, tapi memberikannya cuma-cuma ke
 * publik berarti menyerahkan separuh kredensial kepada penebak sandi.
 */
export async function listAdminAccounts(): Promise<AdminProfile[]> {
  const supa = getSupabaseAdmin();
  if (supa) {
    for (const columns of ADMIN_SELECTS) {
      const { data, error } = await supa
        .from("admins")
        .select(columns)
        .order("created_at", { ascending: true })
        .limit(50);
      if (!error) {
        return ((data as unknown as Record<string, unknown>[]) || []).map(
          mapDbAdmin
        );
      }
      if (!isMissingColumn(error.message)) return [];
    }
    return [];
  }

  // Backend file / env hanya sanggup menampung satu admin.
  const satu = (await loadFromFile()) || (await fallbackProfile());
  return satu ? [satu] : [];
}

async function selectAdmin(
  build: (
    columns: string
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>
): Promise<AdminProfile | null> {
  for (const columns of ADMIN_SELECTS) {
    const { data, error } = await build(columns);
    if (!error)
      return data ? mapDbAdmin(data as Record<string, unknown>) : null;
    if (!isMissingColumn(error.message)) return null;
  }
  return null;
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
    role: profile.role,
    working_order: profile.workingOrder,
  };
  const { error } = await supa.from("admins").upsert(row, { onConflict: "id" });
  if (error) {
    // Kolom peran / token_version mungkin belum ada di schema lama. Yang
    // dibuang hanya kolom, bukan barisnya — admin tetap bisa ganti nama dan
    // password sebelum supabase/11-admin-roles.sql dijalankan.
    const { role: _r, working_order: _w, token_version: _tv, ...rest } = row;
    const retry = await supa.from("admins").upsert(rest, { onConflict: "id" });
    if (retry.error) {
      console.warn(
        "[auth] gagal menyimpan admin ke Supabase:",
        retry.error.message
      );
    }
  }
}

/**
 * Profil satu admin berdasarkan username-nya.
 *
 * Ini pengganti getAdminProfile() lama yang selalu mengembalikan baris admin
 * PERTAMA. Fungsi lama tidak sekadar kurang tepat dengan banyak admin — ia
 * memberi profil, peran, dan working order orang lain kepada siapa pun yang
 * bertanya, sehingga admin GA yang membuka Ticketing bisa melihat antrean IT.
 *
 * Mengembalikan null bila username-nya tidak dikenal, supaya pemanggil bisa
 * memperlakukan sesi itu sebagai tidak sah alih-alih menerima profil pengganti.
 */
export async function getAdminByUsername(
  username: string
): Promise<AdminProfile | null> {
  if (!username) return null;
  const cached = cachedProfile(username);
  if (cached) return cached;

  const fromDb = await loadFromSupabaseByUsername(username);
  if (fromDb) return setProfileCache(fromDb);

  const cocok = (p: AdminProfile | null) =>
    p && p.username.toLowerCase() === username.toLowerCase() ? p : null;

  const fromFile = cocok(await loadFromFile());
  if (fromFile) return setProfileCache(fromFile);

  return cocok(await fallbackProfile());
}

async function persistProfile(next: AdminProfile): Promise<AdminProfile> {
  setProfileCache(next);
  // admin.json hanya sanggup menampung SATU admin. Selama Supabase ada, ia
  // yang jadi sumber kebenaran dan menulis ke file hanya akan menimpa
  // admin.json dengan siapa pun yang terakhir mengubah profilnya.
  if (getSupabaseAdmin()) {
    await saveToSupabase(next);
  } else {
    await saveToFile(next).catch((e) =>
      console.warn("[auth] gagal tulis admin.json:", (e as Error).message)
    );
  }
  return next;
}

export function toPublicAdmin(p: AdminProfile): PublicAdmin {
  return {
    id: p.id,
    username: p.username,
    fullName: p.fullName,
    avatar: p.avatar,
    role: p.role,
    workingOrder: p.workingOrder,
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

/**
 * Ubah profil SATU admin. `current` datang dari sesi pemanggil, bukan dari
 * pencarian di dalam fungsi ini — supaya mustahil menyunting profil orang
 * lain hanya karena barisnya kebetulan yang pertama di tabel.
 *
 * `role` dan `workingOrder` sengaja TIDAK ikut dalam patch: seorang admin
 * tidak boleh memindahkan dirinya sendiri ke working order lain, apalagi
 * mengangkat dirinya jadi admin aset. Perpindahan peran dilakukan di database.
 */
export async function updateAdminProfile(
  current: AdminProfile,
  patch: Partial<Pick<AdminProfile, "fullName" | "username" | "avatar">>
): Promise<AdminProfile> {
  return persistProfile({ ...current, ...patch });
}

export async function setAdminPassword(
  current: AdminProfile,
  newPlain: string
): Promise<AdminProfile> {
  return persistProfile({
    ...current,
    hash: await hashPassword(newPlain),
    tokenVersion: current.tokenVersion + 1,
  });
}

/* ------------------------------------------------------------------ */
/* Gerbang: sesi -> profil -> peran                                    */
/* ------------------------------------------------------------------ */

/**
 * Profil admin pemilik request, dibaca ULANG dari database.
 *
 * Peran di dalam JWT hanya petunjuk rute untuk proxy Edge; ia dibekukan saat
 * login. Yang menentukan data apa yang boleh disentuh adalah baris admin saat
 * ini, jadi peran yang dicabut berhenti berlaku dalam hitungan detik
 * (PROFILE_CACHE_TTL_MS) tanpa menunggu admin login ulang.
 */
export async function requireAdmin(
  req: NextRequest
): Promise<AdminProfile | null> {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySession(token);
  if (!session) return null;

  const admin = await getAdminByUsername(session.username);
  if (!admin || !admin.hash) return null;
  if (typeof session.tv === "number" && session.tv !== admin.tokenVersion) {
    return null;
  }
  return admin;
}

/**
 * Gerbang aplikasi ASET.
 *
 * Admin helpdesk berhenti di sini — inilah yang membuat "admin GA tidak bisa
 * masuk jadi admin aset" berlaku sungguhan. Menyembunyikan menu di sidebar
 * saja tidak cukup: endpoint /api/data/** bisa dipanggil langsung dengan
 * cookie helpdesk yang sah.
 */
export async function requireAssetAdmin(
  req: NextRequest
): Promise<AdminProfile | null> {
  const admin = await requireAdmin(req);
  return admin && admin.role === "ASSET" ? admin : null;
}

/**
 * Gerbang aplikasi HELPDESK. Yang lolos dijamin punya working order, sehingga
 * pemanggil tidak perlu menangani kemungkinan "admin tanpa antrean".
 */
export async function requireHelpdeskAdmin(
  req: NextRequest
): Promise<(AdminProfile & { workingOrder: string }) | null> {
  const admin = await requireAdmin(req);
  if (!admin || admin.role !== "HELPDESK" || !admin.workingOrder) return null;
  return admin as AdminProfile & { workingOrder: string };
}

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

/** 403 — sesi sah, tapi perannya bukan yang dituntut endpoint ini. */
export function forbidden(
  message = "Akun Anda tidak punya akses ke bagian ini."
) {
  return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * Hasil gerbang peran: profil yang lolos, atau respons penolakan siap pakai.
 *
 * Bentuk ini ada supaya route bisa membedakan 401 dari 403 tanpa mengulang
 * logikanya belasan kali. Bedanya bukan kosmetik: 401 berarti "tidak ada
 * sesi", dan client memperlakukannya sebagai ter-logout lalu melempar ke
 * /login. Membalas 401 kepada admin helpdesk yang sesinya sah akan
 * menendangnya keluar dari aplikasinya sendiri hanya karena ia menyentuh
 * endpoint milik peran lain.
 */
export type RoleGate<T> =
  | { ok: true; admin: T }
  | { ok: false; res: NextResponse };

export async function gateAssetAdmin(
  req: NextRequest
): Promise<RoleGate<AdminProfile>> {
  const admin = await requireAdmin(req);
  if (!admin) return { ok: false, res: unauthorized() };
  if (admin.role !== "ASSET") {
    return {
      ok: false,
      res: forbidden("Akun helpdesk tidak punya akses ke manajemen aset."),
    };
  }
  return { ok: true, admin };
}

export async function gateHelpdeskAdmin(
  req: NextRequest
): Promise<RoleGate<AdminProfile & { workingOrder: string }>> {
  const admin = await requireAdmin(req);
  if (!admin) return { ok: false, res: unauthorized() };
  if (admin.role !== "HELPDESK" || !admin.workingOrder) {
    return {
      ok: false,
      res: forbidden("Akun ini tidak punya akses ke panel Tiket Bantuan."),
    };
  }
  return { ok: true, admin: admin as AdminProfile & { workingOrder: string } };
}

/**
 * Tiket ini milik antrean admin tersebut?
 *
 * Dipakai SETIAP endpoint tiket yang menyentuh satu tiket berdasarkan id.
 * Menyaring daftar saja tidak cukup: id tiket muncul di respons dan mudah
 * ditebak, jadi tanpa pemeriksaan ini admin GA masih bisa menutup atau
 * menghapus tiket IT dengan memanggil endpointnya langsung.
 */
export function ownsTicket(
  admin: { workingOrder: string },
  ticket: { workingOrder: string }
): boolean {
  return ticket.workingOrder === admin.workingOrder;
}

export async function attachSessionCookie(
  res: NextResponse,
  admin: AdminProfile,
  maxAge = SESSION_MAX_AGE_LONG
) {
  const token = await signSession(
    {
      sub: admin.id,
      username: admin.username,
      tv: admin.tokenVersion,
      role: admin.role,
      wo: admin.workingOrder,
    },
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
