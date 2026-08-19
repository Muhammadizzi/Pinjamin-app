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
  Booking,
  BookingStatus,
  Category,
  Tag,
  Location,
  CustomField,
  AssetModel,
  Custodian,
  Kit,
  Audit,
} from "./types";
import { generateId, generateQRCode } from "./utils";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import { getCachedAdminUsername } from "./auth-client";

const STORAGE_KEY = "pinjamin_data_v3_gf";

/** Baris hasil parse CSV impor aset (lihat app/assets/page.tsx). */
export type AssetImportRow = {
  name: string;
  status?: AssetStatus;
  categoryName?: string;
  locationName?: string;
  qrCode?: string;
  value?: number;
  serialNumber?: string;
  description?: string;
  custodianName?: string;
  tagNames?: string;
  modelName?: string;
};

export type ImportAssetsResult = {
  imported: number;
  /** Dilewati: nama kosong, atau QR/id sudah ada (duplikat). */
  skipped: number;
  categoriesCreated: number;
  locationsCreated: number;
  custodiansCreated: number;
  tagsCreated: number;
  modelsCreated: number;
};

type StoreContextType = AppData & {
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
  importAssets: (rows: AssetImportRow[]) => ImportAssetsResult;
  addCategory: (c: Omit<Category, "id" | "createdAt">) => void;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  addTag: (t: Omit<Tag, "id" | "createdAt">) => void;
  updateTag: (id: string, patch: Partial<Tag>) => void;
  deleteTag: (id: string) => void;
  addLocation: (l: Omit<Location, "id" | "createdAt">) => string;
  updateLocation: (id: string, patch: Partial<Location>) => void;
  deleteLocation: (id: string) => void;
  addCustomField: (f: Omit<CustomField, "id" | "createdAt">) => void;
  deleteCustomField: (id: string) => void;
  addAssetModel: (m: Omit<AssetModel, "id" | "createdAt">) => void;
  deleteAssetModel: (id: string) => void;
  addCustodian: (c: Omit<Custodian, "id" | "createdAt">) => void;
  updateCustodian: (id: string, patch: Partial<Custodian>) => void;
  deleteCustodian: (id: string) => void;
  addKit: (k: Omit<Kit, "id" | "qrCode" | "createdAt">) => void;
  deleteKit: (id: string) => void;
  addBooking: (
    b: Omit<
      Booking,
      "id" | "createdAt" | "history" | "status" | "createdBy"
    > & { status?: BookingStatus }
  ) => { ok: boolean; error?: string; id?: string };
  updateBookingStatus: (
    id: string,
    status: BookingStatus,
    extra?: Partial<Booking>
  ) => void;
  deleteBooking: (id: string) => void;
  addAudit: (
    a: Omit<Audit, "id" | "createdAt" | "items"> & { assetIds: string[] }
  ) => void;
  updateAuditItem: (
    auditId: string,
    assetId: string,
    patch: Partial<import("./types").AuditItem>
  ) => void;
  completeAudit: (id: string) => void;
  deleteAudit: (id: string) => void;
  resetData: () => void;
  /** Timpa store dengan data contoh Garudafood (seed). */
  loadDemoData: () => void;
  isHydrated: boolean;
  isSupabase: boolean;
};

const StoreContext = createContext<StoreContextType | null>(null);

// Helpers to convert camelCase <-> snake_case for Supabase
const toSnake = (s: string) =>
  s.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);
const toCamel = (s: string) =>
  s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
function toDbRow(obj: any): any {
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[toSnake(k)] = v;
  }
  return out;
}
function fromDbRow(obj: any): any {
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    out[toCamel(k)] = v;
  }
  // fix dates
  if (out.createdAt && typeof out.createdAt === "string")
    out.createdAt = out.createdAt;
  if (out.updatedAt) out.updatedAt = out.updatedAt;
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

/** Tandai booking yang lewat jatuh tempo sebagai OVERDUE (komputasi tampilan). */
function normalizeOverdueBookings(d: AppData): AppData {
  const now = new Date();
  return {
    ...d,
    bookings: d.bookings.map((b) =>
      (b.status === "ONGOING" || b.status === "RESERVED") &&
      new Date(b.toDate) < now
        ? { ...b, status: "OVERDUE" as BookingStatus }
        : b
    ),
  };
}

// Supabase force helpers
async function supaInsert(table: string, row: any) {
  const supa = getSupabase();
  if (!supa) return;
  try {
    const dbRow = toDbRow(row);
    // Ensure UUID for Supabase if id is not UUID (use randomUUID)
    if (dbRow.id && !/^[0-9a-f]{8}-/.test(dbRow.id)) {
      try {
        dbRow.id = crypto.randomUUID();
        row.id = dbRow.id;
      } catch {}
    }
    const { error } = await supa.from(table).insert(dbRow);
    if (error)
      console.warn(`[Supabase] insert ${table} failed:`, error.message);
    else console.log(`[Supabase] inserted ${table} ${row.id}`);
  } catch (e) {
    console.warn(`[Supabase] insert ${table} exception`, e);
  }
}
async function supaUpdate(table: string, id: string, patch: any) {
  const supa = getSupabase();
  if (!supa) return;
  try {
    const dbPatch = toDbRow(patch);
    const { error } = await supa.from(table).update(dbPatch).eq("id", id);
    if (error)
      console.warn(`[Supabase] update ${table} failed:`, error.message);
  } catch (e) {
    console.warn(`[Supabase] update ${table} exception`, e);
  }
}
async function supaDelete(table: string, id: string) {
  const supa = getSupabase();
  if (!supa) return;
  try {
    const { error } = await supa.from(table).delete().eq("id", id);
    if (error)
      console.warn(`[Supabase] delete ${table} failed:`, error.message);
  } catch (e) {
    console.warn(`[Supabase] delete ${table} exception`, e);
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(seedData);
  const [isHydrated, setHydrated] = useState(false);
  const [isSupabase, setIsSupabase] = useState(false);
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
    const loaded = normalizeOverdueBookings(loadFromStorage());
    try {
      const serverData = await fetchServerStore();
      // Server terjangkau & sesi valid → aktifkan sinkron dua arah.
      serverSyncRef.current = true;
      authRetryRef.current = false;

      if (serverData && hasAnyItems(serverData)) {
        // Server sudah punya data nyata → sumber kebenaran.
        const normalized = normalizeOverdueBookings(serverData);
        setData(normalized);
        saveToStorage(normalized);
      } else {
        // Server kosong (atau hanya koleksi kosong) → pakai cache lokal,
        // atau seed dummy Garudafood jika lokal juga kosong.
        const local = hasAnyItems(loaded)
          ? loaded
          : normalizeOverdueBookings(seedData);
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

    // If Supabase configured, force load from Supabase (source of truth)
    if (checkSupa) {
      (async () => {
        const supa = getSupabase()!;
        try {
          const tables: (keyof AppData)[] = [
            "categories",
            "tags",
            "locations",
            "customFields",
            "assetModels",
            "custodians",
            "assets",
            "kits",
            "bookings",
            "audits",
          ];
          // Map JS keys to DB table names
          const tableMap: Record<string, string> = {
            categories: "categories",
            tags: "tags",
            locations: "locations",
            customFields: "custom_fields",
            assetModels: "asset_models",
            custodians: "custodians",
            assets: "assets",
            kits: "kits",
            bookings: "bookings",
            audits: "audits",
          };
          const results: Partial<AppData> = {};
          for (const key of tables) {
            const dbTable = tableMap[key as string] || key;
            try {
              const { data: rows, error } = await supa
                .from(dbTable)
                .select("*")
                .limit(100);
              if (!error && rows) {
                (results as any)[key] = rows.map(fromDbRow);
              } else if (error) {
                console.warn(
                  `[Supabase] fetch ${dbTable} error:`,
                  error.message
                );
                (results as any)[key] = (seedData as any)[key] || [];
              }
            } catch (e) {
              console.warn(`[Supabase] fetch ${key} exception`, e);
              (results as any)[key] = (seedData as any)[key] || [];
            }
          }
          // Also handle bookings overdue
          if (results.bookings) {
            const now = new Date();
            results.bookings = (results.bookings as any).map((b: any) => {
              if (
                (b.status === "ONGOING" || b.status === "RESERVED") &&
                new Date(b.toDate) < now
              ) {
                return { ...b, status: "OVERDUE" as BookingStatus };
              }
              return b;
            });
          }
          setData((prev) => ({ ...prev, ...results }) as AppData);
        } catch (e) {
          console.warn("[Supabase] load failed, fallback to localStorage", e);
          const loaded = loadFromStorage();
          setData(loaded);
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
    };
    const onSessionEnd = () => {
      if (!isSupabase) disarmServerSync();
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

  const computedBookings = data.bookings.map((b) => {
    if (
      (b.status === "ONGOING" || b.status === "RESERVED") &&
      new Date(b.toDate) < new Date() &&
      !b.actualReturnDate
    ) {
      return { ...b, status: "OVERDUE" as BookingStatus };
    }
    return b;
  });

  const ctx: StoreContextType = {
    ...data,
    bookings: computedBookings,
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
      // Force to Supabase
      if (isSupabaseConfigured()) {
        supaInsert("assets", {
          ...newAsset,
          tagIds: undefined,
          customValues: undefined,
          notes: undefined,
        });
        // handle asset_tags
        if (a.tagIds?.length) {
          (async () => {
            const supa = getSupabase();
            if (!supa) return;
            for (const tagId of a.tagIds) {
              await supa
                .from("asset_tags")
                .insert({ asset_id: newAsset.id, tag_id: tagId })
                .then(
                  ({ error }) =>
                    error && console.warn("asset_tags insert", error.message)
                );
            }
          })();
        }
      }
      setData((d) => ({ ...d, assets: [newAsset, ...d.assets] }));
    },
    updateAsset: (id, patch) => {
      if (isSupabaseConfigured()) supaUpdate("assets", id, patch);
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
    importAssets: (rows) => {
      const result: ImportAssetsResult = {
        imported: 0,
        skipped: 0,
        categoriesCreated: 0,
        locationsCreated: 0,
        custodiansCreated: 0,
        tagsCreated: 0,
        modelsCreated: 0,
      };
      const now = new Date().toISOString();
      const VALID_STATUS: AssetStatus[] = [
        "AVAILABLE",
        "CHECKED_OUT",
        "MAINTENANCE",
        "RETIRED",
      ];
      const supa = isSupabaseConfigured();
      const PALETTE = [
        "#123367",
        "#CBA12C",
        "#3b82f6",
        "#10b981",
        "#8b5cf6",
        "#f59e0b",
        "#ef4444",
        "#64748b",
      ];

      setData((d) => {
        const categories = [...d.categories];
        const locations = [...d.locations];
        const custodians = [...d.custodians];
        const tags = [...d.tags];
        const assetModels = [...d.assetModels];
        const byName = <T extends { name: string }>(list: T[], name: string) =>
          list.find((x) => x.name.trim().toLowerCase() === name.toLowerCase());
        const takenQr = new Set(d.assets.map((a) => a.qrCode.toLowerCase()));
        const takenId = new Set(d.assets.map((a) => a.id));
        const newAssets: Asset[] = [];

        for (const row of rows) {
          const name = row.name?.trim();
          if (!name) {
            result.skipped++;
            continue;
          }
          const qr = row.qrCode?.trim() || "";
          const incomingId = (row as { id?: string }).id?.trim?.() || "";
          if (
            (qr && takenQr.has(qr.toLowerCase())) ||
            (incomingId && takenId.has(incomingId))
          ) {
            result.skipped++;
            continue;
          }

          let categoryId: string | undefined;
          const catName = row.categoryName?.trim();
          if (catName) {
            let cat = byName(categories, catName);
            if (!cat) {
              cat = {
                id: generateId(),
                name: catName,
                description: "",
                color: PALETTE[categories.length % PALETTE.length]!,
                createdAt: now,
              };
              categories.push(cat);
              result.categoriesCreated++;
              if (supa) supaInsert("categories", cat);
            }
            categoryId = cat.id;
          }

          let locationId: string | undefined;
          const locName = row.locationName?.trim();
          if (locName) {
            let loc = byName(locations, locName);
            if (!loc) {
              loc = {
                id: generateId(),
                name: locName,
                description: "",
                parentId: null,
                createdAt: now,
              };
              locations.push(loc);
              result.locationsCreated++;
              if (supa) supaInsert("locations", loc);
            }
            locationId = loc.id;
          }

          let custodianId: string | null = null;
          const cusName = row.custodianName?.trim();
          if (cusName) {
            let cus = byName(custodians, cusName);
            if (!cus) {
              cus = {
                id: generateId(),
                name: cusName,
                createdAt: now,
              };
              custodians.push(cus);
              result.custodiansCreated++;
              if (supa) supaInsert("custodians", cus);
            }
            custodianId = cus.id;
          }

          let assetModelId: string | undefined;
          const modelName = row.modelName?.trim();
          if (modelName) {
            let model = byName(assetModels, modelName);
            if (!model) {
              model = {
                id: generateId(),
                name: modelName,
                categoryId,
                createdAt: now,
              };
              assetModels.push(model);
              result.modelsCreated++;
              if (supa) supaInsert("asset_models", model);
            }
            assetModelId = model.id;
          }

          const tagIds: string[] = [];
          const rawTags = row.tagNames?.trim();
          if (rawTags) {
            for (const part of rawTags.split(/[,;|/]+/)) {
              const tname = part.trim();
              if (!tname) continue;
              let tag = byName(tags, tname);
              if (!tag) {
                tag = { id: generateId(), name: tname, createdAt: now };
                tags.push(tag);
                result.tagsCreated++;
                if (supa) supaInsert("tags", tag);
              }
              tagIds.push(tag.id);
            }
          }

          const status: AssetStatus =
            row.status && VALID_STATUS.includes(row.status)
              ? row.status
              : custodianId
              ? "CHECKED_OUT"
              : "AVAILABLE";

          const qrCode = qr || generateQRCode();
          const asset: Asset = {
            id: generateId(),
            name,
            description: row.description?.trim() || undefined,
            status,
            categoryId,
            locationId,
            assetModelId,
            custodianId,
            qrCode,
            value:
              typeof row.value === "number" && Number.isFinite(row.value)
                ? row.value
                : undefined,
            serialNumber: row.serialNumber?.trim() || undefined,
            tagIds,
            customValues: {},
            notes: [],
            createdAt: now,
            updatedAt: now,
          };
          newAssets.push(asset);
          takenQr.add(qrCode.toLowerCase());
          result.imported++;
          if (supa)
            supaInsert("assets", {
              ...asset,
              tagIds: undefined,
              customValues: undefined,
              notes: undefined,
            });
        }

        if (newAssets.length === 0 && result.categoriesCreated === 0) {
          return d;
        }
        return {
          ...d,
          categories,
          locations,
          custodians,
          tags,
          assetModels,
          assets: [...newAssets.reverse(), ...d.assets],
        };
      });

      return result;
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
    addCustomField: (f) => {
      const row = {
        ...f,
        id: generateId(),
        createdAt: new Date().toISOString(),
      } as CustomField;
      if (isSupabaseConfigured()) supaInsert("custom_fields", row);
      setData((d) => ({ ...d, customFields: [row, ...d.customFields] }));
    },
    deleteCustomField: (id) => {
      if (isSupabaseConfigured()) supaDelete("custom_fields", id);
      setData((d) => ({
        ...d,
        customFields: d.customFields.filter((x) => x.id !== id),
      }));
    },
    addAssetModel: (m) => {
      const row = {
        ...m,
        id: generateId(),
        createdAt: new Date().toISOString(),
      } as AssetModel;
      if (isSupabaseConfigured()) supaInsert("asset_models", row);
      setData((d) => ({ ...d, assetModels: [row, ...d.assetModels] }));
    },
    deleteAssetModel: (id) => {
      if (isSupabaseConfigured()) supaDelete("asset_models", id);
      setData((d) => ({
        ...d,
        assetModels: d.assetModels.filter((x) => x.id !== id),
      }));
    },
    addCustodian: (c) => {
      const row = {
        ...c,
        id: generateId(),
        createdAt: new Date().toISOString(),
      } as Custodian;
      if (isSupabaseConfigured()) supaInsert("custodians", row);
      setData((d) => ({ ...d, custodians: [row, ...d.custodians] }));
    },
    updateCustodian: (id, patch) => {
      if (isSupabaseConfigured()) supaUpdate("custodians", id, patch);
      setData((d) => ({
        ...d,
        custodians: d.custodians.map((x) =>
          x.id === id ? { ...x, ...patch } : x
        ),
      }));
    },
    deleteCustodian: (id) => {
      if (isSupabaseConfigured()) supaDelete("custodians", id);
      setData((d) => ({
        ...d,
        custodians: d.custodians.filter((x) => x.id !== id),
      }));
    },
    addKit: (k) => {
      const row = {
        ...k,
        id: generateId(),
        qrCode: "KIT-" + generateId().slice(0, 6),
        createdAt: new Date().toISOString(),
      } as Kit;
      if (isSupabaseConfigured()) supaInsert("kits", row);
      setData((d) => ({ ...d, kits: [row, ...d.kits] }));
    },
    deleteKit: (id) => {
      if (isSupabaseConfigured()) supaDelete("kits", id);
      setData((d) => ({ ...d, kits: d.kits.filter((x) => x.id !== id) }));
    },
    addBooking: (b) => {
      const newFrom = new Date(b.fromDate);
      const newTo = new Date(b.toDate);
      for (const ex of data.bookings) {
        if (ex.status === "CANCELLED" || ex.status === "COMPLETE") continue;
        const exFrom = new Date(ex.fromDate);
        const exTo = new Date(ex.toDate);
        const overlap = newFrom <= exTo && newTo >= exFrom;
        if (!overlap) continue;
        const intersectAssets = b.assetIds.some((aid) =>
          ex.assetIds.includes(aid)
        );
        if (intersectAssets) {
          return {
            ok: false,
            error: `Bentrok dengan booking "${ex.name}" (${ex.id}) pada rentang tanggal yang sama.`,
          };
        }
      }
      const id = generateId();
      const nowIso = new Date().toISOString();
      const from = new Date(b.fromDate);
      const status: BookingStatus =
        b.status || (from > new Date() ? "RESERVED" : "ONGOING");
      const booking: Booking = {
        id,
        name: b.name,
        description: b.description,
        status,
        custodianId: b.custodianId,
        fromDate: b.fromDate,
        toDate: b.toDate,
        assetIds: b.assetIds,
        kitIds: b.kitIds || [],
        createdBy: getCachedAdminUsername(),
        createdAt: nowIso,
        history: [{ status, at: nowIso, by: getCachedAdminUsername() }],
      };
      if (isSupabaseConfigured()) {
        supaInsert("bookings", booking);
        // booking_assets
        (async () => {
          const supa = getSupabase();
          if (!supa) return;
          for (const aid of b.assetIds) {
            await supa
              .from("booking_assets")
              .insert({ booking_id: id, asset_id: aid });
          }
        })();
      }
      setData((d) => {
        let assets = d.assets;
        if (status === "ONGOING") {
          assets = assets.map((a) =>
            b.assetIds.includes(a.id)
              ? {
                  ...a,
                  status: "CHECKED_OUT" as const,
                  custodianId: b.custodianId,
                }
              : a
          );
        }
        return { ...d, assets, bookings: [booking, ...d.bookings] };
      });
      return { ok: true, id };
    },
    updateBookingStatus: (id, status, extra) => {
      if (isSupabaseConfigured())
        supaUpdate("bookings", id, { status, ...extra });
      setData((d) => {
        const bookings = d.bookings.map((bk) => {
          if (bk.id !== id) return bk;
          const hist = [
            ...bk.history,
            {
              status,
              at: new Date().toISOString(),
              by: getCachedAdminUsername(),
            },
          ];
          return {
            ...bk,
            ...extra,
            status,
            history: hist,
            ...(status === "COMPLETE"
              ? { actualReturnDate: new Date().toISOString() }
              : {}),
          };
        });
        const target = d.bookings.find((x) => x.id === id);
        let assets = d.assets;
        if (target) {
          if (status === "COMPLETE" || status === "CANCELLED") {
            assets = assets.map((a) =>
              target.assetIds.includes(a.id)
                ? { ...a, status: "AVAILABLE" as const, custodianId: null }
                : a
            );
            if (isSupabaseConfigured()) {
              // update assets status in supabase
              for (const aid of target.assetIds)
                supaUpdate("assets", aid, {
                  status: "AVAILABLE",
                  custodian_id: null,
                });
            }
          } else if (status === "ONGOING") {
            assets = assets.map((a) =>
              target.assetIds.includes(a.id)
                ? {
                    ...a,
                    status: "CHECKED_OUT" as const,
                    custodianId: target.custodianId,
                  }
                : a
            );
            if (isSupabaseConfigured()) {
              for (const aid of target.assetIds)
                supaUpdate("assets", aid, {
                  status: "CHECKED_OUT",
                  custodian_id: target.custodianId,
                });
            }
          }
        }
        return { ...d, assets, bookings };
      });
    },
    deleteBooking: (id) => {
      if (isSupabaseConfigured()) supaDelete("bookings", id);
      setData((d) => ({
        ...d,
        bookings: d.bookings.filter((x) => x.id !== id),
      }));
    },
    addAudit: (a) => {
      const newAudit = {
        id: generateId(),
        name: a.name,
        status: "OPEN" as const,
        createdBy: getCachedAdminUsername(),
        createdAt: new Date().toISOString(),
        items: a.assetIds.map((aid) => ({
          id: generateId(),
          auditId: "",
          assetId: aid,
          result: null,
        })),
      } as Audit;
      if (isSupabaseConfigured())
        supaInsert("audits", {
          id: newAudit.id,
          name: newAudit.name,
          status: newAudit.status,
          createdBy: newAudit.createdBy,
        });
      setData((d) => ({ ...d, audits: [newAudit, ...d.audits] }));
    },
    updateAuditItem: (auditId, assetId, patch) => {
      if (isSupabaseConfigured()) {
        // update audit_items
        (async () => {
          const supa = getSupabase();
          if (!supa) return;
          await supa
            .from("audit_items")
            .update(toDbRow(patch))
            .eq("audit_id", auditId)
            .eq("asset_id", assetId);
        })();
      }
      setData((d) => ({
        ...d,
        audits: d.audits.map((aud) =>
          aud.id === auditId
            ? {
                ...aud,
                items: aud.items.map((it) =>
                  it.assetId === assetId
                    ? { ...it, ...patch, scannedAt: new Date().toISOString() }
                    : it
                ),
              }
            : aud
        ),
      }));
    },
    completeAudit: (id) => {
      if (isSupabaseConfigured())
        supaUpdate("audits", id, { status: "COMPLETED" });
      setData((d) => ({
        ...d,
        audits: d.audits.map((a) =>
          a.id === id ? { ...a, status: "COMPLETED" as const } : a
        ),
      }));
    },
    deleteAudit: (id) => {
      if (isSupabaseConfigured()) supaDelete("audits", id);
      setData((d) => ({ ...d, audits: d.audits.filter((x) => x.id !== id) }));
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
      const next = normalizeOverdueBookings(seedData);
      setData(next);
      saveToStorage(next);
    },
  };

  return <StoreContext.Provider value={ctx}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
