"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { seedData } from "./seed";
import type {
  AppData,
  Asset,
  AssetStatus,
  Category,
  Tag,
  Location,
} from "./types";
import { generateId, generateQRCode } from "./utils";
import { isSupabaseConfigured } from "./supabase";
import { getCachedAdminUsername } from "./auth-client";
import { useT } from "./i18n";

const STORAGE_KEY = "pinjamin_data_v3_gf";

/** Baris hasil parse CSV impor aset (lihat app/assets/page.tsx). */

export type StoreContextType = AppData & {
  addAsset: (
    a: Omit<Asset, "id" | "qrCode" | "createdAt" | "updatedAt" | "notes">
  ) => void;
  updateAsset: (id: string, patch: Partial<Asset>) => void;
  deleteAsset: (id: string) => void;
  /**
   * Impor massal aset (CSV): buat kategori/lokasi baru berdasarkan nama bila
   * belum ada, lewati baris tanpa nama atau dengan QR/id duplikat. Semua
   * perubahan dilakukan dalam SATU setData (satu sinkron server).
   */
  addCategory: (c: Omit<Category, "id" | "createdAt">) => void;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  addTag: (t: Omit<Tag, "id" | "createdAt">) => void;
  updateTag: (id: string, patch: Partial<Tag>) => void;
  deleteTag: (id: string) => void;
  addLocation: (l: Omit<Location, "id" | "createdAt">) => string;
  updateLocation: (id: string, patch: Partial<Location>) => void;
  deleteLocation: (id: string) => void;
  resetData: () => void;
  /** Timpa store dengan data contoh Garudafood (seed). */
  loadDemoData: () => void;
  isHydrated: boolean;
  isSupabase: boolean;
};

const StoreContext = createContext<StoreContextType | null>(null);

// Helper konversi camelCase -> snake_case (untuk payload API).
const toSnake = (s: string) =>
  s.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);
function toDbRow(obj: any): any {
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[toSnake(k)] = v;
  }
  return out;
}

function loadFromStorage(): AppData {
  if (typeof window === "undefined") return seedData;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      if (
        parsed &&
        Array.isArray(parsed.assets) &&
        Object.values(parsed).some((v) => Array.isArray(v) && v.length > 0)
      ) {
        return parsed;
      }
    }
  } catch {}
  return seedData;
}
function saveToStorage(data: AppData) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Shared server store (app/api/store/route.ts) — sumber kebenaran lintas
 * browser saat Supabase TIDAK dikonfigurasi.
 *
 * Sebelum ini, AppData hanya hidup di localStorage per browser: data yang
 * dibuat di Safari tidak pernah muncul di Chrome. Sekarang client memuat
 * dari server; browser pertama yang menemukan server kosong mengunggah
 * data localStorage-nya (migrasi satu kali), lalu semua browser berbagi
 * data yang sama. localStorage tetap dipakai sebagai cache offline.
 */
/**
 * 401 dari /api/store berarti TIDAK ada sesi login admin — ini kondisi wajar
 * untuk halaman publik (landing/login), BUKAN kegagalan jaringan. Dibedakan
 * supaya fallback-nya senyap dan sinkron bisa diaktifkan belakangan.
 */
class UnauthorizedError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "UnauthorizedError";
  }
}

async function fetchServerStore(): Promise<AppData | null> {
  const res = await fetch("/api/store", { cache: "no-store" });
  if (res.status === 401) throw new UnauthorizedError("GET /api/store -> 401");
  if (!res.ok) throw new Error(`GET /api/store -> ${res.status}`);
  const json = await res.json();
  return (json?.data as AppData | undefined) ?? null;
}

async function pushServerStore(data: AppData): Promise<void> {
  const res = await fetch("/api/store", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });
  if (res.status === 401) throw new UnauthorizedError("PUT /api/store -> 401");
  if (!res.ok) throw new Error(`PUT /api/store -> ${res.status}`);
}

/** Ada isi nyata di salah satu koleksi? (seedData = semuanya kosong) */
function hasAnyItems(d: AppData): boolean {
  return Object.values(d).some((v) => Array.isArray(v) && v.length > 0);
}

/** Teriakkan error Supabase: console.error + dispatch event buat UI. */
function fireSupaError(context: string, err: unknown) {
  const msg =
    err && typeof err === "object" && "message" in err
      ? (err as Error).message
      : String(err);
  const full = `[Supabase] ${context}: ${msg}`;
  console.error(full);
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(
        new CustomEvent("pinjamin:supa-error", { detail: full })
      );
    } catch {}
  }
}

// Mapping nama tabel DB -> resource generic di /api/data/[resource] untuk
// resource sederhana (categories, tags, dll). assets/audits TIDAK ada di
// sini untuk insert — mereka pakai route khusus (lihat apiMutate).
const TABLE_TO_API: Record<string, string> = {
  categories: "categories",
  tags: "tags",
  locations: "locations",
  assets: "assets",
};

// Mutasi via /api/data/[resource] — ganti direct Supabase (anon key).
async function supaInsert(table: string, row: any) {
  const resource = TABLE_TO_API[table];
  if (!resource || !isSupabaseConfigured()) return;
  try {
    const dbRow = toDbRow(row);
    const res = await fetch(`/api/data/${resource}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dbRow),
    });
    if (res.status === 401) return; // sesi habis, sinkron tertunda
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      fireSupaError(
        `insert ${table} via API`,
        new Error(err.error || "HTTP " + res.status)
      );
    }
  } catch (e) {
    fireSupaError(`insert ${table} via API exception`, e);
  }
}
async function supaUpdate(table: string, id: string, patch: any) {
  const resource = TABLE_TO_API[table];
  if (!resource || !isSupabaseConfigured()) return;
  try {
    const dbPatch = toDbRow(patch);
    // Patch kosong (mis. hanya field yang di-undefined) tidak perlu bulak-balik
    // ke server — dan server memang menolaknya dengan 400 "No valid fields".
    if (Object.keys(dbPatch).length === 0) return;
    const res = await fetch(`/api/data/${resource}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dbPatch),
    });
    if (res.status === 401) return;
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      fireSupaError(
        `update ${table} via API`,
        new Error(err.error || "HTTP " + res.status)
      );
    }
  } catch (e) {
    fireSupaError(`update ${table} via API exception`, e);
  }
}
async function supaDelete(table: string, id: string) {
  const resource = TABLE_TO_API[table];
  if (!resource || !isSupabaseConfigured()) return;
  try {
    const res = await fetch(`/api/data/${resource}/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.status === 401) return;
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      fireSupaError(
        `delete ${table} via API`,
        new Error(err.error || "HTTP " + res.status)
      );
    }
  } catch (e) {
    fireSupaError(`delete ${table} via API exception`, e);
  }
}

/**
 * Mutasi langsung ke route khusus (assets/audits) yang punya
 * kontrak payload sendiri. Tidak konversi toDbRow otomatis — pemanggil
 * menyiapkan body sesuai kontrak route tersebut.
 */
async function apiMutate(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: any
) {
  if (!isSupabaseConfigured()) return;
  try {
    const res = await fetch(path, {
      method,
      headers:
        body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) return; // sesi habis, sinkron tertunda
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      fireSupaError(
        `${method} ${path}`,
        new Error(err.error || "HTTP " + res.status)
      );
    }
  } catch (e) {
    fireSupaError(`${method} ${path} exception`, e);
  }
}
export function StoreProvider({ children }: { children: React.ReactNode }) {
  // StoreProvider berada DI DALAM I18nProvider (app/layout.tsx), jadi pesan
  const { t } = useT();
  const [data, setData] = useState<AppData>(seedData);
  const [isHydrated, setHydrated] = useState(false);
  const [isSupabase, setIsSupabase] = useState(false);
  const [supaError, setSupaError] = useState<string | null>(null);
  const pathname = usePathname();
  /**
   * true setelah server store berhasil dihubungi saat hidrasi — mulai saat
   * itu setiap perubahan data di-PUT ke server (debounced) supaya semua
   * browser berbagi state yang sama. Tetap false pada mode Supabase (yang
   * punya jalur sinkron sendiri) dan saat server tak terjangkau.
   */
  const serverSyncRef = useRef(false);
  /**
   * true bila sinkron server TERTUNDA karena belum login (GET /api/store
   * kena 401 di landing/login). Provider ini tidak ikut remount saat login
   * (client-side navigation), jadi hidrasi harus diulang begitu sesi ada —
   * lihat efek retry di bawah.
   */
  const authRetryRef = useRef(false);
  const hydratingRef = useRef(false);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Nonaktifkan sinkron server & persenjatai retry setelah login. */
  const disarmServerSync = (guestLog?: string) => {
    if (!authRetryRef.current && guestLog) console.info(guestLog);
    serverSyncRef.current = false;
    authRetryRef.current = true;
  };

  /**
   * Hidrasi dari server store — dipanggil saat mount DAN diulang setelah
   * login sukses. Idempotent: hydratingRef mencegah panggilan tumpang-tindih.
   */
  const hydrateFromServer = useCallback(async () => {
    if (isSupabaseConfigured() || hydratingRef.current) return;
    hydratingRef.current = true;
    // Tampilkan cache lokal dengan normalisasi overdue (dipakai bila
    // server kosong atau tak terjangkau).
    const loaded = loadFromStorage();
    try {
      const serverData = await fetchServerStore();
      // Server terjangkau & sesi valid → aktifkan sinkron dua arah.
      serverSyncRef.current = true;
      authRetryRef.current = false;

      if (serverData && hasAnyItems(serverData)) {
        // Server sudah punya data nyata → sumber kebenaran.
        const normalized = serverData;
        setData(normalized);
        saveToStorage(normalized);
      } else {
        // Server kosong (atau hanya koleksi kosong) → pakai cache lokal,
        // atau seed dummy Garudafood jika lokal juga kosong.
        const local = hasAnyItems(loaded) ? loaded : seedData;
        setData(local);
        if (hasAnyItems(local)) {
          pushServerStore(local).catch((e) => {
            if (e instanceof UnauthorizedError) disarmServerSync();
            else console.warn("[store] migrasi ke server gagal", e);
          });
        }
      }
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        // Mode tamu (landing/login tanpa sesi) — kondisi WAJAR, jangan
        // berisik; sinkron otomatis aktif setelah login admin.
        disarmServerSync(
          "[store] Mode tamu: sinkron server otomatis aktif setelah login admin."
        );
      } else {
        // Server store tidak tersedia → kembali ke mode lokal per-browser
        // (perilaku lama; data tidak hilang, hanya tidak tersinkron).
        console.warn(
          "[store] Server store tidak tersedia, memakai localStorage saja",
          e
        );
      }
      setData(loaded);
    } finally {
      hydratingRef.current = false;
      setHydrated(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.removeItem("pinjamin_data_v1");
      localStorage.removeItem("pinjamin_data_v1_clean");
    } catch {}
    const checkSupa = isSupabaseConfigured();
    setIsSupabase(checkSupa);

    // If Supabase configured, load via authenticated API endpoint (/api/data).
    // Server-side admin client reads all tables in one round-trip, no anon key.
    if (checkSupa) {
      (async () => {
        try {
          const res = await fetch("/api/data", { cache: "no-store" });
          if (res.status === 401) {
            // Belum login — store kosong dulu tanpa error.
            // Data akan termuat setelah login lewat retry mechanism.
            setData(seedData);
            return;
          }
          if (!res.ok) throw new Error(`GET /api/data -> ${res.status}`);
          const json = await res.json();
          if (json.configured && json.data) {
            const normalized = json.data as AppData;
            setData(normalized);
            saveToStorage(normalized);
          } else {
            // Admin key tidak dikonfigurasi di server atau response kosong.
            const loaded = loadFromStorage();
            if (hasAnyItems(loaded)) setData(loaded);
          }
        } catch (e) {
          console.warn(
            "[Supabase] load via /api/data gagal, fallback localStorage",
            e
          );
          const loaded = loadFromStorage();
          if (hasAnyItems(loaded)) setData(loaded);
        } finally {
          setHydrated(true);
        }
      })();
    } else {
      void hydrateFromServer();
    }
  }, [hydrateFromServer]);

  /**
   * AKTIVASI sinkron setelah login. Login melakukan client-side navigation
   * (router.push("/dashboard")), sehingga StoreProvider TIDAK remount dan
   * hidrasi awal — yang kena 401 di halaman publik — harus diulang di sini;
   * tanpa ini sinkron lintas-browser tidak pernah aktif sampai user reload
   * manual (inilah bug "memakai localStorage saja" setelah login).
   */
  useEffect(() => {
    const retry = () => {
      if (!isSupabase && authRetryRef.current && !serverSyncRef.current) {
        void hydrateFromServer();
      }
      // Untuk mode Supabase: re-fetch data setelah login.
      if (isSupabase) {
        (async () => {
          try {
            const res = await fetch("/api/data", { cache: "no-store" });
            if (res.ok) {
              const json = await res.json();
              if (json.configured && json.data) {
                const fresh = json.data as AppData;
                setData(fresh);
                saveToStorage(fresh);
              }
            }
          } catch {}
        })();
      }
    };
    const onSessionEnd = () => {
      if (!isSupabase) disarmServerSync();
      // Untuk Supabase: reset data saat logout.
      if (isSupabase) setData(seedData);
    };
    window.addEventListener("pinjamin:session", retry);
    window.addEventListener("pinjamin:session-end", onSessionEnd);
    // Jaring pengaman: berhasil berada di area non-publik berarti sesi
    // sudah valid (middleware hanya melewatkan request ber-token).
    if (pathname !== "/" && !pathname.startsWith("/login")) retry();
    return () => {
      window.removeEventListener("pinjamin:session", retry);
      window.removeEventListener("pinjamin:session-end", onSessionEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, isSupabase, hydrateFromServer]);

  useEffect(() => {
    if (isHydrated) saveToStorage(data);
  }, [data, isHydrated]);

  // Sinkron ke server store (lintas-browser): satu PUT debounced per burst
  // mutasi. PUT terakhir-menang — cukup untuk pemakaian single-user demo;
  // model ini juga dipakai gerbang migrasi saat hidrasi.
  useEffect(() => {
    if (!isHydrated || isSupabase || !serverSyncRef.current) return;
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      pushServerStore(data).catch((e) => {
        if (e instanceof UnauthorizedError) {
          // Sesi berakhir (logout/kadaluarsa) → matikan sinkron sementara;
          // login berikutnya menghidupkannya lagi lewat efek retry.
          disarmServerSync();
        } else {
          console.warn("[store] sinkron ke server gagal", e);
        }
      });
    }, 400);
    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, [data, isHydrated, isSupabase]);

  // Dengarkan error Supabase dan tampilkan di UI. Auto-hilang 10 detik.
  useEffect(() => {
    const handler = (e: Event) => {
      const msg = (e as CustomEvent<string>).detail;
      setSupaError(msg);
      setTimeout(() => setSupaError(null), 10_000);
    };
    window.addEventListener("pinjamin:supa-error", handler);
    return () => window.removeEventListener("pinjamin:supa-error", handler);
  }, []);

  const ctx: StoreContextType = {
    ...data,
    isHydrated,
    isSupabase,
    addAsset: (a) => {
      const newAsset = {
        ...a,
        id: generateId(),
        qrCode: generateQRCode(),
        notes: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Asset;
      // Sinkron ke Supabase via route khusus /api/data/assets
      // (route tsb yang membuat asset + relasi asset_tags sekaligus).
      if (isSupabaseConfigured()) {
        apiMutate("/api/data/assets", "POST", {
          ...toDbRow({
            // id & qrCode ikut dikirim supaya baris DB memakai identitas yang
            // sama dengan state lokal (edit/hapus setelahnya langsung kena).
            id: newAsset.id,
            qrCode: newAsset.qrCode,
            name: newAsset.name,
            description: newAsset.description,
            status: newAsset.status,
            categoryId: newAsset.categoryId,
            locationId: newAsset.locationId,
            mainImage: newAsset.mainImage,
            value: newAsset.value,
            serialNumber: newAsset.serialNumber,
          }),
          tagIds: a.tagIds || [],
        });
      }
      setData((d) => ({ ...d, assets: [newAsset, ...d.assets] }));
    },
    updateAsset: (id, patch) => {
      if (isSupabaseConfigured()) {
        const { tagIds, notes: _notes, ...fields } = patch;
        apiMutate(`/api/data/assets/${encodeURIComponent(id)}`, "PATCH", {
          ...toDbRow(fields),
          ...(Array.isArray(tagIds) ? { tagIds } : {}),
        });
      }
      setData((d) => ({
        ...d,
        assets: d.assets.map((x) =>
          x.id === id
            ? { ...x, ...patch, updatedAt: new Date().toISOString() }
            : x
        ),
      }));
    },
    deleteAsset: (id) => {
      if (isSupabaseConfigured()) supaDelete("assets", id);
      setData((d) => ({ ...d, assets: d.assets.filter((x) => x.id !== id) }));
    },
    addCategory: (c) => {
      const row = {
        ...c,
        id: generateId(),
        createdAt: new Date().toISOString(),
      } as Category;
      if (isSupabaseConfigured()) supaInsert("categories", row);
      setData((d) => ({ ...d, categories: [row, ...d.categories] }));
    },
    updateCategory: (id, patch) => {
      if (isSupabaseConfigured()) supaUpdate("categories", id, patch);
      setData((d) => ({
        ...d,
        categories: d.categories.map((x) =>
          x.id === id ? { ...x, ...patch } : x
        ),
      }));
    },
    deleteCategory: (id) => {
      if (isSupabaseConfigured()) supaDelete("categories", id);
      setData((d) => ({
        ...d,
        categories: d.categories.filter((x) => x.id !== id),
      }));
    },
    addTag: (t) => {
      const row = {
        ...t,
        id: generateId(),
        createdAt: new Date().toISOString(),
      } as Tag;
      if (isSupabaseConfigured()) supaInsert("tags", row);
      setData((d) => ({ ...d, tags: [row, ...d.tags] }));
    },
    updateTag: (id, patch) => {
      if (isSupabaseConfigured()) supaUpdate("tags", id, patch);
      setData((d) => ({
        ...d,
        tags: d.tags.map((x) => (x.id === id ? { ...x, ...patch } : x)),
      }));
    },
    deleteTag: (id) => {
      if (isSupabaseConfigured()) supaDelete("tags", id);
      setData((d) => ({
        ...d,
        tags: d.tags.filter((x) => x.id !== id),
      }));
    },
    addLocation: (l) => {
      const row = {
        ...l,
        id: generateId(),
        createdAt: new Date().toISOString(),
      } as Location;
      if (isSupabaseConfigured()) supaInsert("locations", row);
      setData((d) => ({ ...d, locations: [row, ...d.locations] }));
      return row.id;
    },
    updateLocation: (id, patch) => {
      if (isSupabaseConfigured()) supaUpdate("locations", id, patch);
      setData((d) => ({
        ...d,
        locations: d.locations.map((x) =>
          x.id === id ? { ...x, ...patch } : x
        ),
      }));
    },
    deleteLocation: (id) => {
      if (isSupabaseConfigured()) supaDelete("locations", id);
      setData((d) => ({
        ...d,
        locations: d.locations.filter((x) => x.id !== id),
      }));
    },
    resetData: () => {
      localStorage.removeItem(STORAGE_KEY);
      setData(seedData);
      if (isSupabaseConfigured()) {
        console.log(
          "[Supabase] reset requested - clear local only, use SQL 00-reset for DB"
        );
      }
    },
    loadDemoData: () => {
      const next = seedData;
      setData(next);
      saveToStorage(next);
    },
  };

  return (
    <>
      {supaError && (
        <div className="fixed top-4 right-4 z-[9999] max-w-md bg-red-50 dark:bg-red-900/80 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg shadow-xl text-sm">
          <div className="flex items-start justify-between gap-2">
            <span className="font-medium">⚠️ {supaError}</span>
            <button
              onClick={() => setSupaError(null)}
              className="text-red-500 hover:text-red-700 dark:text-red-300 dark:hover:text-red-100 shrink-0 ml-2"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      <StoreContext.Provider value={ctx}>{children}</StoreContext.Provider>
    </>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
