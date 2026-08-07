"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { seedData } from "./seed";
import type { AppData, Asset, Booking, BookingStatus, Category, Tag, Location, CustomField, AssetModel, Custodian, Kit, Audit } from "./types";
import { generateId, generateQRCode } from "./utils";
import { getSupabase, isSupabaseConfigured } from "./supabase";

const STORAGE_KEY = "pinjamin_data_v2_clean";

type StoreContextType = AppData & {
  addAsset: (a: Omit<Asset, "id" | "qrCode" | "createdAt" | "updatedAt" | "notes">) => void;
  updateAsset: (id: string, patch: Partial<Asset>) => void;
  deleteAsset: (id: string) => void;
  addCategory: (c: Omit<Category, "id" | "createdAt">) => void;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  addTag: (t: Omit<Tag, "id" | "createdAt">) => void;
  deleteTag: (id: string) => void;
  addLocation: (l: Omit<Location, "id" | "createdAt">) => void;
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
  addBooking: (b: Omit<Booking, "id" | "createdAt" | "history" | "status" | "createdBy"> & { status?: BookingStatus }) => { ok: boolean; error?: string; id?: string };
  updateBookingStatus: (id: string, status: BookingStatus, extra?: Partial<Booking>) => void;
  deleteBooking: (id: string) => void;
  addAudit: (a: Omit<Audit, "id" | "createdAt" | "items"> & { assetIds: string[] }) => void;
  updateAuditItem: (auditId: string, assetId: string, patch: Partial<import("./types").AuditItem>) => void;
  completeAudit: (id: string) => void;
  deleteAudit: (id: string) => void;
  resetData: () => void;
  isHydrated: boolean;
  isSupabase: boolean;
};

const StoreContext = createContext<StoreContextType | null>(null);

// Helpers to convert camelCase <-> snake_case for Supabase
const toSnake = (s: string) => s.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);
const toCamel = (s: string) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
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
  if (out.createdAt && typeof out.createdAt === "string") out.createdAt = out.createdAt;
  if (out.updatedAt) out.updatedAt = out.updatedAt;
  return out;
}

function loadFromStorage(): AppData {
  if (typeof window === "undefined") return seedData;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return seedData;
}
function saveToStorage(data: AppData) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
    if (error) console.warn(`[Supabase] insert ${table} failed:`, error.message);
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
    if (error) console.warn(`[Supabase] update ${table} failed:`, error.message);
  } catch (e) {
    console.warn(`[Supabase] update ${table} exception`, e);
  }
}
async function supaDelete(table: string, id: string) {
  const supa = getSupabase();
  if (!supa) return;
  try {
    const { error } = await supa.from(table).delete().eq("id", id);
    if (error) console.warn(`[Supabase] delete ${table} failed:`, error.message);
  } catch (e) {
    console.warn(`[Supabase] delete ${table} exception`, e);
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(seedData);
  const [isHydrated, setHydrated] = useState(false);
  const [isSupabase, setIsSupabase] = useState(false);

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
          const tables: (keyof AppData)[] = ["categories", "tags", "locations", "customFields", "assetModels", "custodians", "assets", "kits", "bookings", "audits"];
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
              const { data: rows, error } = await supa.from(dbTable).select("*").limit(100);
              if (!error && rows) {
                (results as any)[key] = rows.map(fromDbRow);
              } else if (error) {
                console.warn(`[Supabase] fetch ${dbTable} error:`, error.message);
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
              if ((b.status === "ONGOING" || b.status === "RESERVED") && new Date(b.toDate) < now) {
                return { ...b, status: "OVERDUE" as BookingStatus };
              }
              return b;
            });
          }
          setData((prev) => ({ ...prev, ...results } as AppData));
        } catch (e) {
          console.warn("[Supabase] load failed, fallback to localStorage", e);
          const loaded = loadFromStorage();
          setData(loaded);
        } finally {
          setHydrated(true);
        }
      })();
    } else {
      const loaded = loadFromStorage();
      const now = new Date();
      loaded.bookings = loaded.bookings.map((b) => {
        if ((b.status === "ONGOING" || b.status === "RESERVED") && new Date(b.toDate) < now) {
          return { ...b, status: "OVERDUE" as BookingStatus };
        }
        return b;
      });
      setData(loaded);
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (isHydrated) saveToStorage(data);
  }, [data, isHydrated]);

  const computedBookings = data.bookings.map((b) => {
    if ((b.status === "ONGOING" || b.status === "RESERVED") && new Date(b.toDate) < new Date() && !b.actualReturnDate) {
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
      const newAsset = { ...a, id: generateId(), qrCode: generateQRCode(), notes: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as Asset;
      // Force to Supabase
      if (isSupabaseConfigured()) {
        supaInsert("assets", { ...newAsset, tagIds: undefined, customValues: undefined, notes: undefined });
        // handle asset_tags
        if (a.tagIds?.length) {
          (async () => {
            const supa = getSupabase();
            if (!supa) return;
            for (const tagId of a.tagIds) {
              await supa.from("asset_tags").insert({ asset_id: newAsset.id, tag_id: tagId }).then(({ error }) => error && console.warn("asset_tags insert", error.message));
            }
          })();
        }
      }
      setData((d) => ({ ...d, assets: [newAsset, ...d.assets] }));
    },
    updateAsset: (id, patch) => {
      if (isSupabaseConfigured()) supaUpdate("assets", id, patch);
      setData((d) => ({ ...d, assets: d.assets.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: new Date().toISOString() } : x)) }));
    },
    deleteAsset: (id) => {
      if (isSupabaseConfigured()) supaDelete("assets", id);
      setData((d) => ({ ...d, assets: d.assets.filter((x) => x.id !== id) }));
    },
    addCategory: (c) => {
      const row = { ...c, id: generateId(), createdAt: new Date().toISOString() } as Category;
      if (isSupabaseConfigured()) supaInsert("categories", row);
      setData((d) => ({ ...d, categories: [row, ...d.categories] }));
    },
    updateCategory: (id, patch) => {
      if (isSupabaseConfigured()) supaUpdate("categories", id, patch);
      setData((d) => ({ ...d, categories: d.categories.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
    },
    deleteCategory: (id) => {
      if (isSupabaseConfigured()) supaDelete("categories", id);
      setData((d) => ({ ...d, categories: d.categories.filter((x) => x.id !== id) }));
    },
    addTag: (t) => {
      const row = { ...t, id: generateId(), createdAt: new Date().toISOString() } as Tag;
      if (isSupabaseConfigured()) supaInsert("tags", row);
      setData((d) => ({ ...d, tags: [row, ...d.tags] }));
    },
    deleteTag: (id) => {
      if (isSupabaseConfigured()) supaDelete("tags", id);
      setData((d) => ({ ...d, tags: d.tags.filter((x) => x.id !== id) }));
    },
    addLocation: (l) => {
      const row = { ...l, id: generateId(), createdAt: new Date().toISOString() } as Location;
      if (isSupabaseConfigured()) supaInsert("locations", row);
      setData((d) => ({ ...d, locations: [row, ...d.locations] }));
    },
    updateLocation: (id, patch) => {
      if (isSupabaseConfigured()) supaUpdate("locations", id, patch);
      setData((d) => ({ ...d, locations: d.locations.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
    },
    deleteLocation: (id) => {
      if (isSupabaseConfigured()) supaDelete("locations", id);
      setData((d) => ({ ...d, locations: d.locations.filter((x) => x.id !== id) }));
    },
    addCustomField: (f) => {
      const row = { ...f, id: generateId(), createdAt: new Date().toISOString() } as CustomField;
      if (isSupabaseConfigured()) supaInsert("custom_fields", row);
      setData((d) => ({ ...d, customFields: [row, ...d.customFields] }));
    },
    deleteCustomField: (id) => {
      if (isSupabaseConfigured()) supaDelete("custom_fields", id);
      setData((d) => ({ ...d, customFields: d.customFields.filter((x) => x.id !== id) }));
    },
    addAssetModel: (m) => {
      const row = { ...m, id: generateId(), createdAt: new Date().toISOString() } as AssetModel;
      if (isSupabaseConfigured()) supaInsert("asset_models", row);
      setData((d) => ({ ...d, assetModels: [row, ...d.assetModels] }));
    },
    deleteAssetModel: (id) => {
      if (isSupabaseConfigured()) supaDelete("asset_models", id);
      setData((d) => ({ ...d, assetModels: d.assetModels.filter((x) => x.id !== id) }));
    },
    addCustodian: (c) => {
      const row = { ...c, id: generateId(), createdAt: new Date().toISOString() } as Custodian;
      if (isSupabaseConfigured()) supaInsert("custodians", row);
      setData((d) => ({ ...d, custodians: [row, ...d.custodians] }));
    },
    updateCustodian: (id, patch) => {
      if (isSupabaseConfigured()) supaUpdate("custodians", id, patch);
      setData((d) => ({ ...d, custodians: d.custodians.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
    },
    deleteCustodian: (id) => {
      if (isSupabaseConfigured()) supaDelete("custodians", id);
      setData((d) => ({ ...d, custodians: d.custodians.filter((x) => x.id !== id) }));
    },
    addKit: (k) => {
      const row = { ...k, id: generateId(), qrCode: "KIT-" + generateId().slice(0, 6), createdAt: new Date().toISOString() } as Kit;
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
        const intersectAssets = b.assetIds.some((aid) => ex.assetIds.includes(aid));
        if (intersectAssets) {
          return { ok: false, error: `Bentrok dengan booking "${ex.name}" (${ex.id}) pada rentang tanggal yang sama.` };
        }
      }
      const id = generateId();
      const nowIso = new Date().toISOString();
      const from = new Date(b.fromDate);
      const status: BookingStatus = b.status || (from > new Date() ? "RESERVED" : "ONGOING");
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
        createdBy: "adminsystem",
        createdAt: nowIso,
        history: [{ status, at: nowIso, by: "adminsystem" }],
      };
      if (isSupabaseConfigured()) {
        supaInsert("bookings", booking);
        // booking_assets
        (async () => {
          const supa = getSupabase();
          if (!supa) return;
          for (const aid of b.assetIds) {
            await supa.from("booking_assets").insert({ booking_id: id, asset_id: aid });
          }
        })();
      }
      setData((d) => {
        let assets = d.assets;
        if (status === "ONGOING") {
          assets = assets.map((a) => (b.assetIds.includes(a.id) ? { ...a, status: "CHECKED_OUT" as const, custodianId: b.custodianId } : a));
        }
        return { ...d, assets, bookings: [booking, ...d.bookings] };
      });
      return { ok: true, id };
    },
    updateBookingStatus: (id, status, extra) => {
      if (isSupabaseConfigured()) supaUpdate("bookings", id, { status, ...extra });
      setData((d) => {
        const bookings = d.bookings.map((bk) => {
          if (bk.id !== id) return bk;
          const hist = [...bk.history, { status, at: new Date().toISOString(), by: "adminsystem" }];
          return { ...bk, ...extra, status, history: hist, ...(status === "COMPLETE" ? { actualReturnDate: new Date().toISOString() } : {}) };
        });
        const target = d.bookings.find((x) => x.id === id);
        let assets = d.assets;
        if (target) {
          if (status === "COMPLETE" || status === "CANCELLED") {
            assets = assets.map((a) => (target.assetIds.includes(a.id) ? { ...a, status: "AVAILABLE" as const, custodianId: null } : a));
            if (isSupabaseConfigured()) {
              // update assets status in supabase
              for (const aid of target.assetIds) supaUpdate("assets", aid, { status: "AVAILABLE", custodian_id: null });
            }
          } else if (status === "ONGOING") {
            assets = assets.map((a) => (target.assetIds.includes(a.id) ? { ...a, status: "CHECKED_OUT" as const, custodianId: target.custodianId } : a));
            if (isSupabaseConfigured()) {
              for (const aid of target.assetIds) supaUpdate("assets", aid, { status: "CHECKED_OUT", custodian_id: target.custodianId });
            }
          }
        }
        return { ...d, assets, bookings };
      });
    },
    deleteBooking: (id) => {
      if (isSupabaseConfigured()) supaDelete("bookings", id);
      setData((d) => ({ ...d, bookings: d.bookings.filter((x) => x.id !== id) }));
    },
    addAudit: (a) => {
      const newAudit = { id: generateId(), name: a.name, status: "OPEN" as const, createdBy: "adminsystem", createdAt: new Date().toISOString(), items: a.assetIds.map((aid) => ({ id: generateId(), auditId: "", assetId: aid, result: null })) } as Audit;
      if (isSupabaseConfigured()) supaInsert("audits", { id: newAudit.id, name: newAudit.name, status: newAudit.status, createdBy: newAudit.createdBy });
      setData((d) => ({ ...d, audits: [newAudit, ...d.audits] }));
    },
    updateAuditItem: (auditId, assetId, patch) => {
      if (isSupabaseConfigured()) {
        // update audit_items
        (async () => {
          const supa = getSupabase();
          if (!supa) return;
          await supa.from("audit_items").update(toDbRow(patch)).eq("audit_id", auditId).eq("asset_id", assetId);
        })();
      }
      setData((d) => ({
        ...d,
        audits: d.audits.map((aud) => (aud.id === auditId ? { ...aud, items: aud.items.map((it) => (it.assetId === assetId ? { ...it, ...patch, scannedAt: new Date().toISOString() } : it)) } : aud)),
      }));
    },
    completeAudit: (id) => {
      if (isSupabaseConfigured()) supaUpdate("audits", id, { status: "COMPLETED" });
      setData((d) => ({ ...d, audits: d.audits.map((a) => (a.id === id ? { ...a, status: "COMPLETED" as const } : a)) }));
    },
    deleteAudit: (id) => {
      if (isSupabaseConfigured()) supaDelete("audits", id);
      setData((d) => ({ ...d, audits: d.audits.filter((x) => x.id !== id) }));
    },
    resetData: () => {
      localStorage.removeItem(STORAGE_KEY);
      setData(seedData);
      // Also clear Supabase if configured (optional)
      if (isSupabaseConfigured()) {
        console.log("[Supabase] reset requested - clear local only, use SQL 00-reset for DB");
      }
    },
  };

  return <StoreContext.Provider value={ctx}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
