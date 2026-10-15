/**
 * Mode demo modul aset — data dummy untuk seminar, HANYA saat run lokal.
 *
 * Aktif bila server dijalankan dengan `pnpm sigap:demo` (SIGAP_DEMO=1) dan
 * bukan build production. Project Supabase lokal dan production adalah
 * project yang sama, jadi data dummy tidak boleh ditulis ke sana: semuanya
 * hidup di memori server ini. Tambah/edit/hapus selama demo berlaku sampai
 * server dimatikan, lalu kembali ke isi awal berkas ini.
 *
 * Yang tidak tersentuh: login admin dan tiket helpdesk — keduanya tetap
 * memakai database asli.
 *
 * Bentuk barisnya sengaja sama dengan baris tabel (snake_case), supaya
 * route API cukup melewatkannya ke `fromDbRow` seperti hasil kueri Supabase.
 */
import crypto from "node:crypto";
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
// Isi awal
// ---------------------------------------------------------------------------

/**
 * UUID tetap per entitas. Route admin menolak id yang bukan UUID, dan id yang
 * tetap membuat tautan halaman aset tidak berubah setiap server dinyalakan.
 */
const uid = (grup: string, n: number) =>
  `5160a900-${grup}-4000-8000-${String(n).padStart(12, "0")}`;
const KAT = (n: number) => uid("0ca7", n);
const LOK = (n: number) => uid("10ca", n);
const TAG = (n: number) => uid("7a90", n);
const ASET = (n: number) => uid("a5e7", n);
const PEMAKAI = (n: number) => uid("401d", n);

const KATEGORI = [
  {
    n: 1,
    name: "Laptop",
    description: "Laptop karyawan dan laptop cadangan",
    color: "#123367",
  },
  {
    n: 2,
    name: "Komputer",
    description: "PC desktop kantor dan PC operator",
    color: "#CBA12C",
  },
  {
    n: 3,
    name: "Perangkat Lain",
    description: "Server, jaringan, printer, dan UPS",
    color: "#10b981",
  },
];

const ALAMAT_PLANT =
  "Jl. Raya Rancaekek Km. 24,5, Cimanggung, Kabupaten Sumedang";

const LOKASI: { n: number; name: string; induk?: number }[] = [
  { n: 1, name: "Exist Plant" },
  { n: 2, name: "Dairy" },
  { n: 3, name: "New Plant" },
  { n: 4, name: "Snack" },
  { n: 5, name: "Office", induk: 1 },
  { n: 6, name: "Ruang Server", induk: 1 },
  { n: 7, name: "Office", induk: 2 },
  { n: 8, name: "Ruang Panel", induk: 2 },
  { n: 9, name: "Office", induk: 3 },
  { n: 10, name: "Line Produksi", induk: 3 },
  { n: 11, name: "Office", induk: 4 },
  { n: 12, name: "Gudang", induk: 4 },
];

const TAGS = [
  { n: 1, name: "Garansi Aktif", color: "#22c55e" },
  { n: 2, name: "Garansi Habis", color: "#ef4444" },
  { n: 3, name: "Perlu Upgrade", color: "#f59e0b" },
  { n: 4, name: "Cadangan (Spare)", color: "#64748b" },
  { n: 5, name: "Aset Kritis", color: "#8b5cf6" },
];
const [GARANSI_AKTIF, GARANSI_HABIS, PERLU_UPGRADE, CADANGAN, KRITIS] = [
  1, 2, 3, 4, 5,
];

/** Satu baris riwayat. `dari`/`sampai` dalam hari lalu; tanpa `sampai` = pemakai sekarang. */
type PemakaiDummy = {
  name: string;
  department: string;
  dari: number;
  sampai?: number;
  note?: string;
};

type AsetDummy = {
  n: number;
  name: string;
  description?: string;
  status: "GOOD" | "DAMAGED" | "MAINTENANCE";
  kategori: number;
  lokasi: number;
  qr: string;
  value: number;
  sn?: string;
  spec: string;
  tag: number[];
  pemakai: PemakaiDummy[];
  /** Hari lalu saat aset didaftarkan dan terakhir diubah. */
  dibuat: number;
  diubah: number;
};

const DAFTAR_ASET: AsetDummy[] = [
  // ---- Laptop ----
  {
    n: 1,
    name: "Lenovo ThinkPad E14 Gen 5",
    description: "Laptop kerja staf Finance",
    status: "GOOD",
    kategori: 1,
    lokasi: 5,
    qr: "PIN-K7Q2M9XA",
    value: 13750000,
    sn: "PF4KZ1A7",
    spec: "Intel Core i5-1335U, RAM 16 GB, SSD 512 GB, Windows 11 Pro",
    tag: [GARANSI_AKTIF],
    pemakai: [{ name: "Rina Marlina", department: "Finance", dari: 210 }],
    dibuat: 210,
    diubah: 14,
  },
  {
    n: 2,
    name: "Lenovo ThinkPad T14 Gen 3",
    description: "Laptop kerja staf QC Dairy",
    status: "GOOD",
    kategori: 1,
    lokasi: 7,
    qr: "PIN-3RT8VZ1C",
    value: 19900000,
    sn: "PF3WQ8C2",
    spec: "Intel Core i7-1255U, RAM 16 GB, SSD 512 GB, Windows 11 Pro",
    tag: [GARANSI_AKTIF],
    pemakai: [
      {
        name: "Dedi Kurniawan",
        department: "PPIC",
        dari: 400,
        sampai: 120,
        note: "Pindah ke PC desktop",
      },
      { name: "Yudi Hermawan", department: "QC", dari: 120 },
    ],
    dibuat: 400,
    diubah: 120,
  },
  {
    n: 3,
    name: "HP ProBook 440 G9",
    description: "Laptop kerja staf HRD",
    status: "GOOD",
    kategori: 1,
    lokasi: 9,
    qr: "PIN-W5N4H2LD",
    value: 12400000,
    sn: "5CG2341KQZ",
    spec: "Intel Core i5-1235U, RAM 8 GB, SSD 512 GB, Windows 11 Pro",
    tag: [PERLU_UPGRADE],
    pemakai: [{ name: "Fitri Handayani", department: "HRD", dari: 300 }],
    dibuat: 300,
    diubah: 41,
  },
  {
    n: 4,
    name: "Dell Latitude 3440",
    description: "Laptop kerja staf Warehouse",
    status: "GOOD",
    kategori: 1,
    lokasi: 11,
    qr: "PIN-9JX6P3QE",
    value: 14200000,
    sn: "7KX2LZ3",
    spec: "Intel Core i5-1335U, RAM 16 GB, SSD 256 GB, Windows 11 Pro",
    tag: [GARANSI_AKTIF],
    pemakai: [{ name: "Agus Setiawan", department: "Warehouse", dari: 90 }],
    dibuat: 90,
    diubah: 9,
  },
  {
    n: 5,
    name: "Asus ExpertBook B1400",
    description: "Engsel layar patah, sedang diperbaiki di vendor",
    status: "MAINTENANCE",
    kategori: 1,
    lokasi: 5,
    qr: "PIN-B2C8T7MF",
    value: 10300000,
    sn: "N8NX0331",
    spec: "Intel Core i5-1135G7, RAM 8 GB, SSD 512 GB, Windows 10 Pro",
    tag: [GARANSI_HABIS, PERLU_UPGRADE],
    pemakai: [{ name: "Nurul Aini", department: "Purchasing", dari: 700 }],
    dibuat: 700,
    diubah: 6,
  },
  {
    n: 6,
    name: "HP EliteBook 840 G8",
    description: "Laptop admin jaringan dan server",
    status: "GOOD",
    kategori: 1,
    lokasi: 6,
    qr: "PIN-Q4Z1R6KG",
    value: 21500000,
    sn: "5CG1452MXR",
    spec: "Intel Core i7-1165G7, RAM 16 GB, SSD 512 GB, Windows 11 Pro",
    tag: [KRITIS],
    pemakai: [{ name: "Hendra Gunawan", department: "FA IT", dari: 500 }],
    dibuat: 500,
    diubah: 33,
  },
  {
    n: 7,
    name: "Lenovo ThinkPad L14 Gen 1",
    description: "Baterai drop, laptop mati bila charger dicabut",
    status: "DAMAGED",
    kategori: 1,
    lokasi: 12,
    qr: "PIN-H8L3W5NH",
    value: 11800000,
    sn: "PF2AB7QK",
    spec: "Intel Core i5-10210U, RAM 8 GB, HDD 1 TB, Windows 10 Pro",
    tag: [GARANSI_HABIS, PERLU_UPGRADE],
    pemakai: [
      {
        name: "Ujang Supriatna",
        department: "Warehouse",
        dari: 1000,
        sampai: 400,
        note: "Pensiun",
      },
      { name: "Wawan Kurnia", department: "Warehouse", dari: 400 },
    ],
    dibuat: 1000,
    diubah: 3,
  },
  {
    n: 8,
    name: "Acer TravelMate P214",
    description: "Laptop cadangan untuk pengganti sementara",
    status: "GOOD",
    kategori: 1,
    lokasi: 6,
    qr: "PIN-5VD9F2YJ",
    value: 9600000,
    sn: "NXVPNSN007",
    spec: "Intel Core i5-1135G7, RAM 8 GB, SSD 256 GB, Windows 11 Pro",
    tag: [CADANGAN],
    pemakai: [
      {
        name: "Iis Rohayati",
        department: "GA",
        dari: 260,
        sampai: 60,
        note: "Dipakai selama laptop utama diperbaiki",
      },
    ],
    dibuat: 260,
    diubah: 60,
  },

  // ---- Komputer ----
  {
    n: 9,
    name: "PC Dell OptiPlex 7010 SFF",
    description: "PC kerja staf Finance",
    status: "GOOD",
    kategori: 2,
    lokasi: 5,
    qr: "PIN-T6M1K8PK",
    value: 15300000,
    sn: "9HQ4M33",
    spec: "Intel Core i5-13500, RAM 16 GB, SSD 512 GB, Windows 11 Pro, monitor 24 inci",
    tag: [GARANSI_AKTIF],
    pemakai: [{ name: "Tatang Sutisna", department: "Finance", dari: 150 }],
    dibuat: 150,
    diubah: 20,
  },
  {
    n: 10,
    name: "PC HP ProDesk 400 G7 SFF",
    description:
      "Lambat saat membuka banyak aplikasi, perlu tambah RAM dan SSD",
    status: "GOOD",
    kategori: 2,
    lokasi: 7,
    qr: "PIN-N3X7B4QL",
    value: 9800000,
    sn: "4CE0281ZTN",
    spec: "Intel Core i3-10100, RAM 4 GB, HDD 1 TB, Windows 10 Pro",
    tag: [PERLU_UPGRADE, GARANSI_HABIS],
    pemakai: [
      { name: "Dian Permata", department: "Admin Produksi", dari: 800 },
    ],
    dibuat: 800,
    diubah: 27,
  },
  {
    n: 11,
    name: "PC Lenovo ThinkCentre M70s Gen 3",
    description: "PC operator untuk pencatatan hasil produksi",
    status: "GOOD",
    kategori: 2,
    lokasi: 10,
    qr: "PIN-E9G2S5RM",
    value: 12600000,
    sn: "MJ0GK2LP",
    spec: "Intel Core i5-12400, RAM 8 GB, SSD 256 GB, Windows 11 Pro",
    tag: [KRITIS],
    pemakai: [{ name: "Rizky Ramadhan", department: "Produksi", dari: 180 }],
    dibuat: 180,
    diubah: 11,
  },
  {
    n: 12,
    name: "PC Rakitan Intel Core i3",
    description: "Power supply mati, menunggu penggantian",
    status: "DAMAGED",
    kategori: 2,
    lokasi: 12,
    qr: "PIN-1ZP6C3WN",
    value: 6500000,
    spec: "Intel Core i3-9100, RAM 8 GB, HDD 500 GB, Windows 10 Pro",
    tag: [GARANSI_HABIS],
    pemakai: [{ name: "Budi Santoso", department: "Warehouse", dari: 1100 }],
    dibuat: 1100,
    diubah: 2,
  },
  {
    n: 13,
    name: "PC Dell OptiPlex 3000 Micro",
    description: "PC pemantau di ruang panel listrik",
    status: "GOOD",
    kategori: 2,
    lokasi: 8,
    qr: "PIN-R5H8J1TP",
    value: 10900000,
    sn: "3PLT8K3",
    spec: "Intel Core i5-12500T, RAM 8 GB, SSD 256 GB, Windows 11 Pro",
    tag: [KRITIS],
    pemakai: [{ name: "Asep Saepudin", department: "Engineering", dari: 240 }],
    dibuat: 240,
    diubah: 18,
  },
  {
    n: 14,
    name: "PC Lenovo ThinkCentre neo 50s Gen 4",
    description: "PC kerja staf HRD",
    status: "GOOD",
    kategori: 2,
    lokasi: 11,
    qr: "PIN-D7Y4L9VQ",
    value: 11200000,
    sn: "MJ0HQ5RT",
    spec: "Intel Core i5-13400, RAM 16 GB, SSD 512 GB, Windows 11 Pro",
    tag: [GARANSI_AKTIF],
    pemakai: [{ name: "Ratna Sari", department: "HRD", dari: 60 }],
    dibuat: 60,
    diubah: 5,
  },
  {
    n: 15,
    name: "PC HP ProDesk 600 G6 SFF",
    description: "Sedang instal ulang ke Windows 11",
    status: "MAINTENANCE",
    kategori: 2,
    lokasi: 9,
    qr: "PIN-M2F6Q8XR",
    value: 13100000,
    sn: "4CE1093PLX",
    spec: "Intel Core i5-10500, RAM 8 GB, SSD 256 GB, Windows 10 Pro",
    tag: [PERLU_UPGRADE],
    pemakai: [{ name: "Dedi Kurniawan", department: "PPIC", dari: 120 }],
    dibuat: 650,
    diubah: 1,
  },

  // ---- Perangkat lain ----
  {
    n: 16,
    name: "Server Dell PowerEdge R250",
    description: "Server file dan aplikasi internal plant",
    status: "GOOD",
    kategori: 3,
    lokasi: 6,
    qr: "PIN-8KW3N5ZS",
    value: 48500000,
    sn: "6TRW5J3",
    spec: "Intel Xeon E-2314, RAM 32 GB, 2 x SSD 960 GB (RAID 1), Windows Server 2022",
    tag: [KRITIS, GARANSI_AKTIF],
    pemakai: [{ name: "Hendra Gunawan", department: "FA IT", dari: 330 }],
    dibuat: 330,
    diubah: 25,
  },
  {
    n: 17,
    name: "Switch Cisco Catalyst 2960-X 24 Port",
    description: "Switch inti jaringan Exist Plant",
    status: "GOOD",
    kategori: 3,
    lokasi: 6,
    qr: "PIN-G4T9D1BT",
    value: 23000000,
    sn: "FOC2231X0AB",
    spec: "24 port Gigabit PoE+, 4 uplink SFP",
    tag: [KRITIS],
    pemakai: [{ name: "Arif Rahman", department: "FA IT", dari: 900 }],
    dibuat: 900,
    diubah: 70,
  },
  {
    n: 18,
    name: "Printer Epson L3210",
    description: "Head printer tersumbat, hasil cetak bergaris",
    status: "DAMAGED",
    kategori: 3,
    lokasi: 7,
    qr: "PIN-X6R2V7CU",
    value: 2600000,
    sn: "X8HN021734",
    spec: "Printer tinta, print/scan/copy, USB",
    tag: [GARANSI_HABIS],
    pemakai: [
      { name: "Nining Kurniasih", department: "Admin Produksi", dari: 520 },
    ],
    dibuat: 520,
    diubah: 4,
  },
  {
    n: 19,
    name: "UPS APC Smart-UPS 1500VA",
    description: "Sedang penggantian baterai",
    status: "MAINTENANCE",
    kategori: 3,
    lokasi: 6,
    qr: "PIN-A3J5M8DV",
    value: 9400000,
    sn: "AS2204151122",
    spec: "1500 VA / 1000 W, line interactive, layar LCD",
    tag: [KRITIS],
    pemakai: [{ name: "Arif Rahman", department: "FA IT", dari: 600 }],
    dibuat: 600,
    diubah: 2,
  },
  {
    n: 20,
    name: "Access Point Ubiquiti UniFi U6 Lite",
    description: "Wi-Fi untuk area line produksi",
    status: "GOOD",
    kategori: 3,
    lokasi: 10,
    qr: "PIN-L9B1H4EW",
    value: 2300000,
    sn: "245A4C6E81F2",
    spec: "Wi-Fi 6, dual band, daya PoE",
    tag: [GARANSI_AKTIF],
    pemakai: [{ name: "Arif Rahman", department: "FA IT", dari: 45 }],
    dibuat: 45,
    diubah: 45,
  },
];

// ---------------------------------------------------------------------------
// Keadaan di memori
// ---------------------------------------------------------------------------

type KeadaanDemo = Record<SimpleResourceKey, Baris[]> & {
  assets: Baris[];
  assetTags: { asset_id: string; tag_id: string }[];
  holders: Baris[];
};

function isiAwal(): KeadaanDemo {
  const sekarang = Date.now();
  const tgl = (hariLalu: number) =>
    new Date(sekarang - hariLalu * 86_400_000).toISOString();

  const k: KeadaanDemo = {
    categories: KATEGORI.map((c) => ({
      id: KAT(c.n),
      name: c.name,
      description: c.description,
      color: c.color,
      created_at: tgl(1200),
    })),
    tags: TAGS.map((t) => ({
      id: TAG(t.n),
      name: t.name,
      color: t.color,
      created_at: tgl(1200),
    })),
    locations: LOKASI.map((l) => ({
      id: LOK(l.n),
      name: l.name,
      description: null,
      address: l.induk ? null : ALAMAT_PLANT,
      parent_id: l.induk ? LOK(l.induk) : null,
      is_parent: !l.induk,
      image: null,
      created_at: tgl(1200),
    })),
    assets: [],
    assetTags: [],
    holders: [],
  };

  let nomorPemakai = 0;
  for (const a of DAFTAR_ASET) {
    const id = ASET(a.n);
    const aktif = a.pemakai.find((p) => p.sampai === undefined);
    k.assets.push({
      id,
      name: a.name,
      description: a.description ?? null,
      status: a.status,
      category_id: KAT(a.kategori),
      location_id: LOK(a.lokasi),
      qr_code: a.qr,
      main_image: null,
      value: a.value,
      serial_number: a.sn ?? null,
      owner: aktif?.name ?? null,
      spec: a.spec,
      created_at: tgl(a.dibuat),
      updated_at: tgl(a.diubah),
    });
    for (const t of a.tag) k.assetTags.push({ asset_id: id, tag_id: TAG(t) });
    for (const p of a.pemakai) {
      k.holders.push({
        id: PEMAKAI(++nomorPemakai),
        asset_id: id,
        name: p.name,
        department: p.department,
        from_date: tgl(p.dari),
        to_date: p.sampai === undefined ? null : tgl(p.sampai),
        note: p.note ?? null,
        created_at: tgl(p.dari),
      });
    }
  }
  return k;
}

/**
 * Disimpan di globalThis, bukan variabel modul: dev server Next memuat ulang
 * modul saat berkas disunting, dan tanpa ini setiap simpan berkas akan
 * mengembalikan data demo ke isi awal di tengah presentasi.
 */
const g = globalThis as typeof globalThis & { __sigapDemoAset?: KeadaanDemo };
function keadaan(): KeadaanDemo {
  if (!g.__sigapDemoAset) {
    g.__sigapDemoAset = isiAwal();
    console.info(
      "[demo] Mode demo aset aktif: data dari lib/demo-aset.ts, perubahan tidak disimpan ke database."
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
    tags: k.tags.map(fromDbRow),
    locations: k.locations.map(fromDbRow),
    assets: k.assets.map((a) => ({
      ...fromDbRow(a),
      tagIds: k.assetTags
        .filter((t) => t.asset_id === a.id)
        .map((t) => t.tag_id),
      notes: [],
    })),
  };
}

// ---------------------------------------------------------------------------
// Kategori, tag, lokasi
// ---------------------------------------------------------------------------

export function demoTambah(resource: SimpleResourceKey, row: Baris): Baris {
  const baris = { id: crypto.randomUUID(), created_at: sekarangIso(), ...row };
  keadaan()[resource].push(baris);
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
  return baris;
}

/** Hapus dengan efek yang sama seperti foreign key di database. */
export function demoHapus(resource: SimpleResourceKey, id: string): void {
  const k = keadaan();
  k[resource] = k[resource].filter((x) => x.id !== id);
  if (resource === "categories") {
    for (const a of k.assets) if (a.category_id === id) a.category_id = null;
  } else if (resource === "locations") {
    for (const a of k.assets) if (a.location_id === id) a.location_id = null;
    for (const l of k.locations) if (l.parent_id === id) l.parent_id = null;
  } else {
    k.assetTags = k.assetTags.filter((t) => t.tag_id !== id);
  }
}

// ---------------------------------------------------------------------------
// Aset
// ---------------------------------------------------------------------------

function pasangTag(assetId: string, tagIds: string[]) {
  const k = keadaan();
  k.assetTags = k.assetTags
    .filter((t) => t.asset_id !== assetId)
    .concat(tagIds.map((tagId) => ({ asset_id: assetId, tag_id: tagId })));
}

/** null bila kode QR sudah dipakai (di database: UNIQUE qr_code). */
export function demoTambahAset(row: Baris, tagIds: string[]): Baris | null {
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
  pasangTag(baris.id as string, tagIds);
  return baris;
}

export function demoUbahAset(
  id: string,
  patch: Baris,
  tagIds?: string[]
): Baris | null {
  const baris = keadaan().assets.find((a) => a.id === id);
  if (!baris) return null;
  if (Object.keys(patch).length > 0) {
    Object.assign(baris, patch, { updated_at: sekarangIso() });
  }
  if (tagIds) pasangTag(id, tagIds);
  return baris;
}

export function demoHapusAset(id: string): void {
  const k = keadaan();
  k.assets = k.assets.filter((a) => a.id !== id);
  k.assetTags = k.assetTags.filter((t) => t.asset_id !== id);
  k.holders = k.holders.filter((h) => h.asset_id !== id);
}

// ---------------------------------------------------------------------------
// Riwayat pemakai — aturannya sama dengan app/api/data/assets/[id]/holders
// ---------------------------------------------------------------------------

/** Cermin lib/asset-holders.ts: kolom owner = pemakai yang masih terbuka. */
function samakanPemilik(assetId: string) {
  const k = keadaan();
  const aset = k.assets.find((a) => a.id === assetId);
  if (!aset) return;
  const aktif = k.holders.find(
    (h) => h.asset_id === assetId && h.to_date === null
  );
  aset.owner = aktif?.name ?? null;
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
