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

const STORAGE_KEY = "pinjamin_data_v2_clean";

type StoreContextType = AppData & {
  // assets
  addAsset: (
    a: Omit<Asset, "id" | "qrCode" | "createdAt" | "updatedAt" | "notes">
  ) => void;
  updateAsset: (id: string, patch: Partial<Asset>) => void;
  deleteAsset: (id: string) => void;
  // categories
  addCategory: (c: Omit<Category, "id" | "createdAt">) => void;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  // tags
  addTag: (t: Omit<Tag, "id" | "createdAt">) => void;
  deleteTag: (id: string) => void;
  // locations
  addLocation: (l: Omit<Location, "id" | "createdAt">) => void;
  updateLocation: (id: string, patch: Partial<Location>) => void;
  deleteLocation: (id: string) => void;
  // custom fields
  addCustomField: (f: Omit<CustomField, "id" | "createdAt">) => void;
  deleteCustomField: (id: string) => void;
  // models
  addAssetModel: (m: Omit<AssetModel, "id" | "createdAt">) => void;
  deleteAssetModel: (id: string) => void;
  // custodians
  addCustodian: (c: Omit<Custodian, "id" | "createdAt">) => void;
  updateCustodian: (id: string, patch: Partial<Custodian>) => void;
  deleteCustodian: (id: string) => void;
  // kits
  addKit: (k: Omit<Kit, "id" | "qrCode" | "createdAt">) => void;
  deleteKit: (id: string) => void;
  // bookings
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
  // audits
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
  // utils
  resetData: () => void;
  isHydrated: boolean;
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

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(seedData);
  const [isHydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Hapus data lama v1 agar benar-benar kosong sesuai request user
    try {
      localStorage.removeItem("pinjamin_data_v1");
      localStorage.removeItem("pinjamin_data_v1_clean");
    } catch {}
    const loaded = loadFromStorage();
    // migrate: ensure overdue computed on read
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
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) saveToStorage(data);
  }, [data, isHydrated]);

  // compute overdue on the fly helper
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
    addAsset: (a) =>
      setData((d) => ({
        ...d,
        assets: [
          {
            ...a,
            id: generateId(),
            qrCode: generateQRCode(),
            notes: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as Asset,
          ...d.assets,
        ],
      })),
    updateAsset: (id, patch) =>
      setData((d) => ({
        ...d,
        assets: d.assets.map((x) =>
          x.id === id
            ? { ...x, ...patch, updatedAt: new Date().toISOString() }
            : x
        ),
      })),
    deleteAsset: (id) =>
      setData((d) => ({ ...d, assets: d.assets.filter((x) => x.id !== id) })),
    addCategory: (c) =>
      setData((d) => ({
        ...d,
        categories: [
          { ...c, id: generateId(), createdAt: new Date().toISOString() },
          ...d.categories,
        ],
      })),
    updateCategory: (id, patch) =>
      setData((d) => ({
        ...d,
        categories: d.categories.map((x) =>
          x.id === id ? { ...x, ...patch } : x
        ),
      })),
    deleteCategory: (id) =>
      setData((d) => ({
        ...d,
        categories: d.categories.filter((x) => x.id !== id),
      })),
    addTag: (t) =>
      setData((d) => ({
        ...d,
        tags: [
          { ...t, id: generateId(), createdAt: new Date().toISOString() },
          ...d.tags,
        ],
      })),
    deleteTag: (id) =>
      setData((d) => ({ ...d, tags: d.tags.filter((x) => x.id !== id) })),
    addLocation: (l) =>
      setData((d) => ({
        ...d,
        locations: [
          { ...l, id: generateId(), createdAt: new Date().toISOString() },
          ...d.locations,
        ],
      })),
    updateLocation: (id, patch) =>
      setData((d) => ({
        ...d,
        locations: d.locations.map((x) =>
          x.id === id ? { ...x, ...patch } : x
        ),
      })),
    deleteLocation: (id) =>
      setData((d) => ({
        ...d,
        locations: d.locations.filter((x) => x.id !== id),
      })),
    addCustomField: (f) =>
      setData((d) => ({
        ...d,
        customFields: [
          { ...f, id: generateId(), createdAt: new Date().toISOString() },
          ...d.customFields,
        ],
      })),
    deleteCustomField: (id) =>
      setData((d) => ({
        ...d,
        customFields: d.customFields.filter((x) => x.id !== id),
      })),
    addAssetModel: (m) =>
      setData((d) => ({
        ...d,
        assetModels: [
          { ...m, id: generateId(), createdAt: new Date().toISOString() },
          ...d.assetModels,
        ],
      })),
    deleteAssetModel: (id) =>
      setData((d) => ({
        ...d,
        assetModels: d.assetModels.filter((x) => x.id !== id),
      })),
    addCustodian: (c) =>
      setData((d) => ({
        ...d,
        custodians: [
          { ...c, id: generateId(), createdAt: new Date().toISOString() },
          ...d.custodians,
        ],
      })),
    updateCustodian: (id, patch) =>
      setData((d) => ({
        ...d,
        custodians: d.custodians.map((x) =>
          x.id === id ? { ...x, ...patch } : x
        ),
      })),
    deleteCustodian: (id) =>
      setData((d) => ({
        ...d,
        custodians: d.custodians.filter((x) => x.id !== id),
      })),
    addKit: (k) =>
      setData((d) => ({
        ...d,
        kits: [
          {
            ...k,
            id: generateId(),
            qrCode: "KIT-" + generateId().slice(0, 6),
            createdAt: new Date().toISOString(),
          } as Kit,
          ...d.kits,
        ],
      })),
    deleteKit: (id) =>
      setData((d) => ({ ...d, kits: d.kits.filter((x) => x.id !== id) })),
    addBooking: (b) => {
      // check conflict: overlapping dates for same asset
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
      setData((d) => {
        // update asset status to CHECKED_OUT if ongoing
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
    updateBookingStatus: (id, status, extra) =>
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
      }),
    deleteBooking: (id) =>
      setData((d) => ({
        ...d,
        bookings: d.bookings.filter((x) => x.id !== id),
      })),
    addAudit: (a) =>
      setData((d) => ({
        ...d,
        audits: [
          {
            id: generateId(),
            name: a.name,
            status: "OPEN",
            createdBy: "adminsystem",
            createdAt: new Date().toISOString(),
            items: a.assetIds.map((aid) => ({
              id: generateId(),
              auditId: "",
              assetId: aid,
              result: null,
            })),
          } as Audit,
          ...d.audits,
        ],
      })),
    updateAuditItem: (auditId, assetId, patch) =>
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
      })),
    completeAudit: (id) =>
      setData((d) => ({
        ...d,
        audits: d.audits.map((a) =>
          a.id === id ? { ...a, status: "COMPLETED" as const } : a
        ),
      })),
    deleteAudit: (id) =>
      setData((d) => ({ ...d, audits: d.audits.filter((x) => x.id !== id) })),
    resetData: () => {
      localStorage.removeItem(STORAGE_KEY);
      setData(seedData);
    },
  };

  return <StoreContext.Provider value={ctx}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
