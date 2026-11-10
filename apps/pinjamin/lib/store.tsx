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
  AssetModel,
  AssetStatus,
  Category,
  Location,
} from "./types";
import { generateId, generateQRCode } from "./utils";
import { isSupabaseConfigured } from "./supabase";
import { getCachedAdminUsername } from "./auth-client";
import { useT } from "./i18n";

const STORAGE_KEY = "pinjamin_data_v3_gf";

/**
 * Keadaan awal sebelum data sungguhan sampai.
 *
 * Dulu tempat ini diisi `seedData` — 28 aset contoh. Akibatnya render pertama
 * setiap halaman admin memuat angka yang tidak ada hubungannya dengan isi
 * database, dan angka itu sempat terlihat sekejap sebelum data asli menimpanya.
 *
 * Kosong lebih jujur. Nol yang berubah jadi angka benar terbaca sebagai "sedang
 * memuat"; angka salah yang berubah jadi angka benar terbaca sebagai "sistemnya
 * keliru". Data contoh tetap tersedia lewat tombol yang memang diminta admin.
 */
const dataKosong: AppData = {
  categories: [],
  locations: [],
  assets: [],
  assetModels: [],
};

/**
 * Lengkapi AppData dari sumber yang mungkin lebih tua dari fitur model aset
 * (cache localStorage, respons deployment lama) — koleksi yang hilang
 * dianggap kosong, bukan undefined yang membuat halaman crash.
 */
function rapikan(d: Partial<AppData>): AppData {
  return {
    categories: d.categories ?? [],
    locations: d.locations ?? [],
    assets: d.assets ?? [],
    assetModels: d.assetModels ?? [],
  };
}

/** Kolom unit yang disalin dari modelnya (cermin salinanDariModel di server). */
function salinanModel(m: AssetModel): Partial<Asset> {
  return {
    name: m.name,
    categoryId: m.categoryId || undefined,
    spec: m.spec || undefined,
    mainImage: m.image || undefined,
  };
}

/** Baris hasil parse CSV impor aset (lihat app/assets/page.tsx). */

export type StoreContextType = AppData & {
  addAsset: (
    a: Omit<Asset, "id" | "qrCode" | "createdAt" | "updatedAt" | "notes">
  ) => void;
  /** Daftarkan model aset; mengembalikan id-nya. */
  addAssetModel: (
    m: Omit<AssetModel, "id" | "createdAt" | "updatedAt">
  ) => string;
  /** Ubah model — semua unitnya ikut berubah (nama/kategori/spek/foto). */
  updateAssetModel: (id: string, patch: Partial<AssetModel>) => void;
  /** Hapus model. Pemanggil wajib memastikan model tidak punya unit. */
  deleteAssetModel: (id: string) => void;
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
  addLocation: (l: Omit<Location, "id" | "createdAt">) => string;
  updateLocation: (id: string, patch: Partial<Location>) => void;
  deleteLocation: (id: string) => void;
  resetData: () => void;
  /** Timpa store dengan data contoh Garudafood (seed). */
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
  if (typeof window === "undefined") return dataKosong;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      if (
        parsed &&
        Array.isArray(parsed.assets) &&
        Object.values(parsed).some((v) => Array.isArray(v) && v.length > 0)
      ) {
        return rapikan(parsed);
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

/** Ada isi nyata di salah satu koleksi? (dataKosong = semuanya kosong) */
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
// resource sederhana (categories, locations). assets TIDAK ada di
// sini untuk insert — mereka pakai route khusus (lihat apiMutate).
const TABLE_TO_API: Record<string, string> = {
  categories: "categories",
  locations: "locations",
  assets: "assets",
};

/**
 * Pelacak mutasi yang masih dalam perjalanan ke server.
 *
 * Store mengambil ulang /api/data setiap admin pindah halaman. GET yang
 * berangkat sebelum POST/PATCH/DELETE selesai bisa membawa data lama dan
 * menimpa perubahan yang baru saja dibuat — gejalanya: aset yang baru
 * disimpan tidak muncul di daftar sampai halaman dimuat ulang. Hasil GET
 * dibuang bila ada mutasi yang berjalan saat GET berangkat atau dimulai
 * selama GET berlangsung; perubahan lokal sudah ada di state.
 */
let mutasiBerjalan = 0;
let mutasiKe = 0;
function mulaiMutasi() {
  mutasiBerjalan++;
  mutasiKe++;
}
function selesaiMutasi() {
  mutasiBerjalan = Math.max(0, mutasiBerjalan - 1);
}

// Mutasi via /api/data/[resource] — ganti direct Supabase (anon key).
async function supaInsert(table: string, row: any) {
  const resource = TABLE_TO_API[table];
  if (!resource || !isSupabaseConfigured()) return;
  mulaiMutasi();
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
  } finally {
    selesaiMutasi();
  }
}
async function supaUpdate(table: string, id: string, patch: any) {
  const resource = TABLE_TO_API[table];
  if (!resource || !isSupabaseConfigured()) return;
  mulaiMutasi();
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
  } finally {
    selesaiMutasi();
  }
}
async function supaDelete(table: string, id: string) {
  const resource = TABLE_TO_API[table];
  if (!resource || !isSupabaseConfigured()) return;
  mulaiMutasi();
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
  } finally {
    selesaiMutasi();
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
  mulaiMutasi();
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
  } finally {
    selesaiMutasi();
  }
}
export function StoreProvider({ children }: { children: React.ReactNode }) {
  // StoreProvider berada DI DALAM I18nProvider (app/layout.tsx), jadi pesan
  const { t } = useT();
  const [data, setData] = useState<AppData>(dataKosong);
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
        const normalized = rapikan(serverData);
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
            // Belum login atau sesinya ditolak — store kosong, BUKAN data
            // contoh. Dulu di sini seedData, sehingga sesi yang kedaluwarsa
            // tampil sebagai 28 aset palsu yang terlihat asli, lengkap dengan
            // angka dasbornya. Data termuat setelah login lewat retry.
            setData(dataKosong);
            return;
          }
          if (!res.ok) throw new Error(`GET /api/data -> ${res.status}`);
          const json = await res.json();
          if (json.configured && json.data) {
            const normalized = rapikan(json.data as Partial<AppData>);
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
          const sibukSaatBerangkat = mutasiBerjalan > 0;
          const mutasiSaatBerangkat = mutasiKe;
          try {
            const res = await fetch("/api/data", { cache: "no-store" });
            if (res.ok) {
              const json = await res.json();
              // Lihat catatan pada mutasiBerjalan: data ini mungkin dibaca
              // sebelum perubahan terakhir tersimpan.
              if (sibukSaatBerangkat || mutasiKe !== mutasiSaatBerangkat) {
                return;
              }
              if (json.configured && json.data) {
                const fresh = rapikan(json.data as Partial<AppData>);
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
      // Untuk Supabase: kosongkan data saat logout (bukan data contoh).
      if (isSupabase) setData(dataKosong);
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
      const model = a.assetModelId
        ? data.assetModels.find((m) => m.id === a.assetModelId)
        : undefined;
      const newAsset = {
        ...a,
        ...(model ? salinanModel(model) : {}),
        id: generateId(),
        qrCode: generateQRCode(),
        notes: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Asset;
      // Sinkron ke Supabase via route khusus /api/data/assets.
      if (isSupabaseConfigured()) {
        apiMutate("/api/data/assets", "POST", {
          ...toDbRow({
            // id & qrCode ikut dikirim supaya baris DB memakai identitas yang
            // sama dengan state lokal (edit/hapus setelahnya langsung kena).
            id: newAsset.id,
            qrCode: newAsset.qrCode,
            assetModelId: newAsset.assetModelId,
            name: newAsset.name,
            description: newAsset.description,
            status: newAsset.status,
            categoryId: newAsset.categoryId,
            locationId: newAsset.locationId,
            mainImage: newAsset.mainImage,
            value: newAsset.value,
            serialNumber: newAsset.serialNumber,
            // Dulu tertinggal: spesifikasi tampil sebentar di layar lalu
            // hilang setelah muat ulang karena tidak pernah sampai ke DB.
            spec: newAsset.spec,
          }),
        });
      }
      setData((d) => ({ ...d, assets: [newAsset, ...d.assets] }));
    },
    updateAsset: (id, patch) => {
      if (isSupabaseConfigured()) {
        const { notes: _notes, ...fields } = patch;
        apiMutate(
          `/api/data/assets/${encodeURIComponent(id)}`,
          "PATCH",
          toDbRow(fields)
        );
      }
      setData((d) => ({
        ...d,
        assets: d.assets.map((x) => {
          if (x.id !== id) return x;
          const next = { ...x, ...patch, updatedAt: new Date().toISOString() };
          // Unit bermodel selalu memakai nama/kategori/spek/foto modelnya —
          // sama dengan yang dilakukan server.
          const model = next.assetModelId
            ? d.assetModels.find((m) => m.id === next.assetModelId)
            : undefined;
          return model ? { ...next, ...salinanModel(model) } : next;
        }),
      }));
    },
    addAssetModel: (m) => {
      const row: AssetModel = {
        ...m,
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (isSupabaseConfigured()) {
        apiMutate(
          "/api/data/asset-models",
          "POST",
          toDbRow({
            id: row.id,
            name: row.name,
            categoryId: row.categoryId || null,
            spec: row.spec || null,
            image: row.image || null,
          })
        );
      }
      setData((d) => ({
        ...d,
        assetModels: [...d.assetModels, row].sort((a, b) =>
          a.name.localeCompare(b.name)
        ),
      }));
      return row.id;
    },
    updateAssetModel: (id, patch) => {
      if (isSupabaseConfigured()) {
        const { id: _i, createdAt: _c, updatedAt: _u, ...fields } = patch;
        const body: Record<string, unknown> = {};
        if ("name" in fields) body.name = fields.name;
        if ("categoryId" in fields) body.categoryId = fields.categoryId || null;
        if ("spec" in fields) body.spec = fields.spec || null;
        if ("image" in fields) body.image = fields.image || null;
        apiMutate(
          `/api/data/asset-models/${encodeURIComponent(id)}`,
          "PATCH",
          toDbRow(body)
        );
      }
      setData((d) => {
        const assetModels = d.assetModels
          .map((m) =>
            m.id === id
              ? { ...m, ...patch, updatedAt: new Date().toISOString() }
              : m
          )
          .sort((a, b) => a.name.localeCompare(b.name));
        const model = assetModels.find((m) => m.id === id);
        return {
          ...d,
          assetModels,
          assets: model
            ? d.assets.map((x) =>
                x.assetModelId === id ? { ...x, ...salinanModel(model) } : x
              )
            : d.assets,
        };
      });
    },
    deleteAssetModel: (id) => {
      if (isSupabaseConfigured()) {
        apiMutate(`/api/data/asset-models/${encodeURIComponent(id)}`, "DELETE");
      }
      setData((d) => ({
        ...d,
        assetModels: d.assetModels.filter((m) => m.id !== id),
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
  };

  return (
    <>
      {supaError && (
        <div className="fixed top-4 right-4 z-[9999] max-w-md bg-red-50 dark:bg-red-900/80 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg shadow-xl text-sm">
          <div className="flex items-start justify-between gap-2">
            <span className="font-medium">{supaError}</span>
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
