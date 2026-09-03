/**
 * Kondisi fisik aset. Tiga keadaan saja — DIHAPUSKAN dibuang atas permintaan
 * pemilik produk: aset yang tidak dipakai lagi dihapus dari registri, bukan
 * disimpan dengan penanda, karena stikernya pun sudah dicabut dari barangnya.
 */
export type AssetStatus = "GOOD" | "DAMAGED" | "MAINTENANCE";

export interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  createdAt: string;
}

export interface Location {
  id: string;
  name: string;
  description?: string;
  address?: string;
  parentId?: string | null;
  /** Lokasi induk (gedung/area) yang menaungi sub-lokasi. */
  isParent?: boolean;
  image?: string;
  createdAt: string;
}

export interface Asset {
  id: string;
  name: string;
  description?: string;
  status: AssetStatus;
  categoryId?: string;
  locationId?: string;
  qrCode: string;
  mainImage?: string;
  value?: number;
  serialNumber?: string;
  /** Pemilik/pemegang aset sekarang. Teks bebas, diketik admin. */
  owner?: string;
  /** Spesifikasi teknis bebas, mis. "Core i5, RAM 8GB, SSD 512GB". */
  spec?: string;
  tagIds: string[];
  notes: AssetNote[];
  createdAt: string;
  updatedAt: string;
}

export interface AssetNote {
  id: string;
  assetId: string;
  content: string;
  type: string;
  createdAt: string;
}

export interface AppData {
  categories: Category[];
  tags: Tag[];
  locations: Location[];
  assets: Asset[];
}

/**
 * Satu baris riwayat pemakai aset.
 *
 * `toDate` kosong = pemakai sekarang. Saat admin mengganti pemilik aset,
 * baris berjalan ditutup (toDate diisi) dan baris baru dibuka — jadi kolom
 * `owner` di aset dan baris teratas di sini selalu bercerita hal yang sama.
 */
export interface AssetHolder {
  id: string;
  assetId: string;
  name: string;
  department?: string;
  fromDate: string;
  toDate?: string | null;
  note?: string;
  createdAt: string;
}
