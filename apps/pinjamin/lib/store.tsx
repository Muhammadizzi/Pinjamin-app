"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { seedData } from "./seed";
import type {
  AppData,
  Asset,
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
import type { SimpleResourceKey } from "./resource-config";

const STORAGE_KEY = "pinjamin_data_v2_clean";

type StoreContextType = AppData & {
  addAsset: (
    a: Omit<Asset, "id" | "qrCode" | "createdAt" | "updatedAt" | "notes">
  ) => void;
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
  isHydrated: boolean;
  isSupabase: boolean;
};

const StoreContext = createContext<StoreContextType | null>(null);

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

// --- Transport layer -------------------------------------------------
// All reads/writes go through our own authenticated API routes
// (app/api/data/**), which verify the pinjamin_session JWT server-side and
// use the Supabase service_role key. The browser no longer talks to
// Supabase directly for data, so RLS can be enabled on every table without
// the app losing access to its own data.

async function apiRequest(
  path: string,
  init?: RequestInit
): Promise<any | null> {
  try {
    const res = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      credentials: "same-origin",
    });
    if (res.status === 401) {
      if (typeof window !== "undefined") window.location.href = "/login";
      return null;
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn(
        `[api] ${init?.method || "GET"} ${path} failed:`,
        json.error || res.status
      );
      return null;
    }
    return json;
  } catch (e) {
    console.warn(`[api] ${init?.method || "GET"} ${path} exception`, e);
    return null;
  }
}

async function apiInsert(resource: SimpleResourceKey, row: any) {
  const json = await apiRequest(`/api/data/${resource}`, {
    method: "POST",
    body: JSON.stringify(row),
  });
  return json?.data ?? null;
}
async function apiUpdate(resource: SimpleResourceKey, id: string, patch: any) {
  const json = await apiRequest(`/api/data/${resource}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return json?.data ?? null;
}
async function apiDelete(resource: SimpleResourceKey, id: string) {
  await apiRequest(`/api/data/${resource}/${id}`, { method: "DELETE" });
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

    (async () => {
      const json = await apiRequest("/api/data");
      if (json?.configured && json.data) {
        setIsSupabase(true);
        const now = new Date();
        const bookings = (json.data.bookings as Booking[]).map((b) => {
          if (
            (b.status === "ONGOING" || b.status === "RESERVED") &&
            new Date(b.toDate) < now
          ) {
            return { ...b, status: "OVERDUE" as BookingStatus };
          }
          return b;
        });
        setData({ ...json.data, bookings });
      } else {
        setIsSupabase(false);
        const loaded = loadFromStorage();
        const now = new Date();
        loaded.bookings = loaded.bookings.map((b) => {
          if (
            (b.status === "ONGOING" || b.status === "RESERVED") &&
            new Date(b.toDate) < now
          ) {
            return { ...b, status: "OVERDUE" as BookingStatus };
          }
          return b;
        });
        setData(loaded);
      }
      setHydrated(true);
    })();
  }, []);

  useEffect(() => {
    if (isHydrated) saveToStorage(data);
  }, [data, isHydrated]);

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
      if (isSupabase) {
        apiRequest("/api/data/assets", {
          method: "POST",
          body: JSON.stringify({ ...a, tagIds: a.tagIds }),
        });
      }
      setData((d) => ({ ...d, assets: [newAsset, ...d.assets] }));
    },
    updateAsset: (id, patch) => {
      if (isSupabase)
        apiRequest(`/api/data/assets/${id}`, {
          method: "PATCH",
          body: JSON.stringify(patch),
        });
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
      if (isSupabase)
        apiRequest(`/api/data/assets/${id}`, { method: "DELETE" });
      setData((d) => ({ ...d, assets: d.assets.filter((x) => x.id !== id) }));
    },
    addCategory: (c) => {
      const row = {
        ...c,
        id: generateId(),
        createdAt: new Date().toISOString(),
      } as Category;
      if (isSupabase) apiInsert("categories", c);
      setData((d) => ({ ...d, categories: [row, ...d.categories] }));
    },
    updateCategory: (id, patch) => {
      if (isSupabase) apiUpdate("categories", id, patch);
      setData((d) => ({
        ...d,
        categories: d.categories.map((x) =>
          x.id === id ? { ...x, ...patch } : x
        ),
      }));
    },
    deleteCategory: (id) => {
      if (isSupabase) apiDelete("categories", id);
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
      if (isSupabase) apiInsert("tags", t);
      setData((d) => ({ ...d, tags: [row, ...d.tags] }));
    },
    deleteTag: (id) => {
      if (isSupabase) apiDelete("tags", id);
      setData((d) => ({ ...d, tags: d.tags.filter((x) => x.id !== id) }));
    },
    addLocation: (l) => {
      const row = {
        ...l,
        id: generateId(),
        createdAt: new Date().toISOString(),
      } as Location;
      if (isSupabase) apiInsert("locations", l);
      setData((d) => ({ ...d, locations: [row, ...d.locations] }));
    },
    updateLocation: (id, patch) => {
      if (isSupabase) apiUpdate("locations", id, patch);
      setData((d) => ({
        ...d,
        locations: d.locations.map((x) =>
          x.id === id ? { ...x, ...patch } : x
        ),
      }));
    },
    deleteLocation: (id) => {
      if (isSupabase) apiDelete("locations", id);
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
      if (isSupabase) apiInsert("customFields", f);
      setData((d) => ({ ...d, customFields: [row, ...d.customFields] }));
    },
    deleteCustomField: (id) => {
      if (isSupabase) apiDelete("customFields", id);
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
      if (isSupabase) apiInsert("assetModels", m);
      setData((d) => ({ ...d, assetModels: [row, ...d.assetModels] }));
    },
    deleteAssetModel: (id) => {
      if (isSupabase) apiDelete("assetModels", id);
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
      if (isSupabase) apiInsert("custodians", c);
      setData((d) => ({ ...d, custodians: [row, ...d.custodians] }));
    },
    updateCustodian: (id, patch) => {
      if (isSupabase) apiUpdate("custodians", id, patch);
      setData((d) => ({
        ...d,
        custodians: d.custodians.map((x) =>
          x.id === id ? { ...x, ...patch } : x
        ),
      }));
    },
    deleteCustodian: (id) => {
      if (isSupabase) apiDelete("custodians", id);
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
      if (isSupabase) apiInsert("kits", k);
      setData((d) => ({ ...d, kits: [row, ...d.kits] }));
    },
    deleteKit: (id) => {
      if (isSupabase) apiDelete("kits", id);
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
        createdBy: "adminsystem",
        createdAt: nowIso,
        history: [{ status, at: nowIso, by: "adminsystem" }],
      };
      // Authoritative create + conflict re-check happens server-side; a
      // rejection here (e.g. a race with another session) only surfaces via
      // console.warn today, matching the pre-existing fire-and-forget pattern.
      if (isSupabase) {
        apiRequest("/api/data/bookings", {
          method: "POST",
          body: JSON.stringify({
            name: b.name,
            description: b.description,
            custodianId: b.custodianId,
            fromDate: b.fromDate,
            toDate: b.toDate,
            assetIds: b.assetIds,
            status,
          }),
        });
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
      if (isSupabase)
        apiRequest(`/api/data/bookings/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ status, ...extra }),
        });
      setData((d) => {
        const bookings = d.bookings.map((bk) => {
          if (bk.id !== id) return bk;
          const hist = [
            ...bk.history,
            { status, at: new Date().toISOString(), by: "adminsystem" },
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
          }
        }
        return { ...d, assets, bookings };
      });
    },
    deleteBooking: (id) => {
      if (isSupabase)
        apiRequest(`/api/data/bookings/${id}`, { method: "DELETE" });
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
        createdBy: "adminsystem",
        createdAt: new Date().toISOString(),
        items: a.assetIds.map((aid) => ({
          id: generateId(),
          auditId: "",
          assetId: aid,
          result: null,
        })),
      } as Audit;
      if (isSupabase)
        apiRequest("/api/data/audits", {
          method: "POST",
          body: JSON.stringify({ name: a.name, assetIds: a.assetIds }),
        });
      setData((d) => ({ ...d, audits: [newAudit, ...d.audits] }));
    },
    updateAuditItem: (auditId, assetId, patch) => {
      if (isSupabase) {
        apiRequest(`/api/data/audits/${auditId}/items`, {
          method: "PATCH",
          body: JSON.stringify({ assetId, ...patch }),
        });
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
      if (isSupabase)
        apiRequest(`/api/data/audits/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "COMPLETED" }),
        });
      setData((d) => ({
        ...d,
        audits: d.audits.map((a) =>
          a.id === id ? { ...a, status: "COMPLETED" as const } : a
        ),
      }));
    },
    deleteAudit: (id) => {
      if (isSupabase)
        apiRequest(`/api/data/audits/${id}`, { method: "DELETE" });
      setData((d) => ({ ...d, audits: d.audits.filter((x) => x.id !== id) }));
    },
    resetData: () => {
      localStorage.removeItem(STORAGE_KEY);
      setData(seedData);
      if (isSupabase) {
        console.log(
          "[api] reset requested - clear local only, use SQL 00-reset for DB"
        );
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
