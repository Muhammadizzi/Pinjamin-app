/**
 * Mode lokal modul aset — data seminar yang diinput sendiri, HANYA di laptop.
 *
 * Aktif bila server dijalankan dengan `pnpm sigap:dev` (SIGAP_DEMO=1) dan
 * bukan build production. Project Supabase di `.env.local` adalah project
 * yang sama dengan production, jadi data seminar tidak boleh ditulis ke sana.
 * Sebagai gantinya, data aset disimpan di `data/demo-aset.json` — folder yang
 * sudah di-.gitignore, sehingga tidak pernah ikut push atau deploy.
 *
 * Mulai dari kosong. Untuk mengulang dari nol, hentikan server lalu hapus
 * berkas itu.
 *
 * Yang tidak tersentuh: login admin dan tiket helpdesk — keduanya tetap
 * memakai database asli.
 *
 * Bentuk barisnya sengaja sama dengan baris tabel (snake_case), supaya
 * route API cukup melewatkannya ke `fromDbRow` seperti hasil kueri Supabase.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fromDbRow, type SimpleResourceKey } from "./resource-config";
import { locationPath } from "./location-path";
import type { Location } from "./types";

type Baris = Record<string, unknown>;

export function isDemoAset(): boolean {
  return (
    process.env.SIGAP_DEMO === "1" && process.env.NODE_ENV !== "production"
  );
}

// ---------------------------------------------------------------------------
// Penyimpanan
// ---------------------------------------------------------------------------

type KeadaanDemo = Record<SimpleResourceKey, Baris[]> & {
  assets: Baris[];
  holders: Baris[];
};

const BERKAS = path.join(
  process.env.PINJAMIN_DATA_DIR || path.join(process.cwd(), "data"),
  "demo-aset.json"
);

const kosong = (): KeadaanDemo => ({
  categories: [],
  locations: [],
  assets: [],
  holders: [],
});

/** Isi berkas, atau keadaan kosong bila berkasnya belum ada atau rusak. */
function muat(): KeadaanDemo {
  try {
    const isi = JSON.parse(fs.readFileSync(BERKAS, "utf8")) as KeadaanDemo;
    const k = kosong();
    for (const kunci of Object.keys(k) as (keyof KeadaanDemo)[]) {
      if (Array.isArray(isi?.[kunci]))
        (k as Record<string, unknown>)[kunci] = isi[kunci];
    }
    return k;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") {
      // Berkas rusak tidak ditimpa diam-diam: disisihkan dulu supaya data
      // seminar yang sudah diinput masih bisa diselamatkan.
      const cadangan = `${BERKAS}.rusak-${Date.now()}`;
      try {
        fs.renameSync(BERKAS, cadangan);
      } catch {}
      console.warn(`[demo] ${BERKAS} tidak terbaca, disisihkan ke ${cadangan}`);
    }
    return kosong();
  }
}

/**
 * Tulis ke berkas sementara lalu ganti namanya: kalau server mati di tengah
 * penulisan, berkas lama tetap utuh alih-alih terpotong setengah.
 */
function simpan() {
  const k = g.__sigapDemoAset;
  if (!k) return;
  fs.mkdirSync(path.dirname(BERKAS), { recursive: true });
  const sementara = `${BERKAS}.tmp`;
  fs.writeFileSync(sementara, JSON.stringify(k));
  fs.renameSync(sementara, BERKAS);
}

/**
 * Disimpan juga di globalThis: dev server Next memuat ulang modul saat berkas
 * disunting, dan tanpa ini setiap simpan kode membaca ulang berkas dari disk.
 */
const g = globalThis as typeof globalThis & { __sigapDemoAset?: KeadaanDemo };
function keadaan(): KeadaanDemo {
  if (!g.__sigapDemoAset) {
    g.__sigapDemoAset = muat();
    console.info(
      `[demo] Mode lokal aset aktif: data di ${BERKAS}, tidak disimpan ke database.`
    );
  }
  return g.__sigapDemoAset;
}

const sekarangIso = () => new Date().toISOString();
const terbaruDulu = (a: Baris, b: Baris) =>
  String(b.from_date).localeCompare(String(a.from_date));

// ---------------------------------------------------------------------------
// Baca semua (GET /api/data)
// ---------------------------------------------------------------------------

export function demoDataAset() {
  const k = keadaan();
  return {
    categories: k.categories.map(fromDbRow),
    locations: k.locations.map(fromDbRow),
    assets: k.assets.map((a) => ({ ...fromDbRow(a), notes: [] })),
  };
}

// ---------------------------------------------------------------------------
// Kategori, tag, lokasi
// ---------------------------------------------------------------------------

export function demoTambah(resource: SimpleResourceKey, row: Baris): Baris {
  const baris = { id: crypto.randomUUID(), created_at: sekarangIso(), ...row };
  keadaan()[resource].push(baris);
  simpan();
  return baris;
}

export function demoUbah(
  resource: SimpleResourceKey,
  id: string,
  patch: Baris
): Baris | null {
  const baris = keadaan()[resource].find((x) => x.id === id);
  if (!baris) return null;
  Object.assign(baris, patch);
  simpan();
  return baris;
}

/** Hapus dengan efek yang sama seperti foreign key di database. */
export function demoHapus(resource: SimpleResourceKey, id: string): void {
  const k = keadaan();
  k[resource] = k[resource].filter((x) => x.id !== id);
  if (resource === "categories") {
    for (const a of k.assets) if (a.category_id === id) a.category_id = null;
  } else {
    for (const a of k.assets) if (a.location_id === id) a.location_id = null;
    for (const l of k.locations) if (l.parent_id === id) l.parent_id = null;
  }
  simpan();
}

// ---------------------------------------------------------------------------
// Aset
// ---------------------------------------------------------------------------

/** null bila kode QR sudah dipakai (di database: UNIQUE qr_code). */
export function demoTambahAset(row: Baris): Baris | null {
  const k = keadaan();
  if (k.assets.some((a) => a.qr_code === row.qr_code)) return null;
  const waktu = sekarangIso();
  const baris: Baris = {
    id: crypto.randomUUID(),
    description: null,
    category_id: null,
    location_id: null,
    main_image: null,
    value: null,
    serial_number: null,
    owner: null,
    spec: null,
    created_at: waktu,
    updated_at: waktu,
    ...row,
  };
  k.assets.push(baris);
  simpan();
  return baris;
}

export function demoUbahAset(id: string, patch: Baris): Baris | null {
  const baris = keadaan().assets.find((a) => a.id === id);
  if (!baris) return null;
  if (Object.keys(patch).length > 0) {
    Object.assign(baris, patch, { updated_at: sekarangIso() });
  }
  simpan();
  return baris;
}

export function demoHapusAset(id: string): void {
  const k = keadaan();
  k.assets = k.assets.filter((a) => a.id !== id);
  k.holders = k.holders.filter((h) => h.asset_id !== id);
  simpan();
}

// ---------------------------------------------------------------------------
// Riwayat pemakai — aturannya sama dengan app/api/data/assets/[id]/holders
// ---------------------------------------------------------------------------

/** Cermin lib/asset-holders.ts: kolom owner = pemakai yang masih terbuka. */
function samakanPemilik(assetId: string) {
  const k = keadaan();
  const aset = k.assets.find((a) => a.id === assetId);
  if (aset) {
    const aktif = k.holders.find(
      (h) => h.asset_id === assetId && h.to_date === null
    );
    aset.owner = aktif?.name ?? null;
  }
  simpan();
}

export function demoDaftarPemakai(assetId: string): Baris[] {
  return keadaan()
    .holders.filter((h) => h.asset_id === assetId)
    .sort(terbaruDulu);
}

export function demoTambahPemakai(
  assetId: string,
  isi: { name: string; department: string; note: string; mulai: Date }
): Baris | null {
  const k = keadaan();
  if (!k.assets.some((a) => a.id === assetId)) return null;

  const aktif = k.holders.find(
    (h) => h.asset_id === assetId && h.to_date === null
  );
  if (aktif) {
    const sebelum = new Date(aktif.from_date as string).getTime();
    aktif.to_date = new Date(
      Math.max(isi.mulai.getTime(), sebelum)
    ).toISOString();
  }

  const baris: Baris = {
    id: crypto.randomUUID(),
    asset_id: assetId,
    name: isi.name.slice(0, 150),
    department: isi.department ? isi.department.slice(0, 100) : null,
    note: isi.note || null,
    from_date: isi.mulai.toISOString(),
    to_date: null,
    created_at: sekarangIso(),
  };
  k.holders.push(baris);
  samakanPemilik(assetId);
  return baris;
}

export function demoHapusPemakai(assetId: string, holderId: string): void {
  const k = keadaan();
  k.holders = k.holders.filter(
    (h) => !(h.id === holderId && h.asset_id === assetId)
  );
  samakanPemilik(assetId);
}

export function demoAkhiriPemakai(assetId: string, holderId: string): void {
  const baris = keadaan().holders.find(
    (h) => h.id === holderId && h.asset_id === assetId && h.to_date === null
  );
  if (baris) baris.to_date = sekarangIso();
  samakanPemilik(assetId);
}

// ---------------------------------------------------------------------------
// Halaman hasil pindai (GET /api/public/asset/<kode>)
// ---------------------------------------------------------------------------

/** Kolom yang sama dengan select di route publik — harga & id tidak ikut. */
const KOLOM_PUBLIK = [
  "qr_code",
  "name",
  "description",
  "status",
  "main_image",
  "serial_number",
  "owner",
  "spec",
  "created_at",
  "updated_at",
];

export function demoAsetPublik(code: string) {
  const k = keadaan();
  const aset = k.assets.find((a) => a.qr_code === code);
  if (!aset) return null;

  const aman: Baris = {};
  for (const kolom of KOLOM_PUBLIK) aman[kolom] = aset[kolom] ?? null;

  const kategori = k.categories.find((c) => c.id === aset.category_id);
  const lokasi = k.locations.find((l) => l.id === aset.location_id);
  const semuaLokasi = k.locations.map(fromDbRow) as unknown as Location[];

  return {
    asset: {
      ...fromDbRow(aman),
      category: kategori?.name ?? null,
      categoryColor: kategori?.color ?? null,
      location: lokasi?.name ?? null,
      locationPath: locationPath(
        semuaLokasi,
        aset.location_id as string | null
      ),
    },
    holders: demoDaftarPemakai(aset.id as string)
      .slice(0, 20)
      .map((h) =>
        fromDbRow({
          name: h.name,
          department: h.department,
          from_date: h.from_date,
          to_date: h.to_date,
        })
      ),
  };
}
