export type AssetStatus =
  | "AVAILABLE"
  | "CHECKED_OUT"
  | "MAINTENANCE"
  | "RETIRED";
export type AuditStatus = "OPEN" | "COMPLETED";
export type AuditResult = "FOUND" | "MISSING" | "DAMAGED";

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

export interface CustomField {
  id: string;
  name: string;
  type: "text" | "number" | "date" | "boolean" | "option";
  required: boolean;
  options?: string[];
  /** Kategori yang memakai field ini. Kosong/undefined = semua kategori. */
  categoryIds?: string[];
  createdAt: string;
}

export interface Custodian {
  id: string;
  name: string;
  nik?: string;
  department?: string;
  email?: string;
  phone?: string;
  createdAt: string;
}

export interface Asset {
  id: string;
  name: string;
  description?: string;
  status: AssetStatus;
  categoryId?: string;
  locationId?: string;
  custodianId?: string | null;
  qrCode: string;
  mainImage?: string;
  value?: number;
  serialNumber?: string;
  tagIds: string[];
  customValues: Record<string, string>;
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

export interface Audit {
  id: string;
  name: string;
  status: AuditStatus;
  createdBy: string;
  createdAt: string;
  items: AuditItem[];
}

export interface AuditItem {
  id: string;
  auditId: string;
  assetId: string;
  result: AuditResult | null;
  note?: string;
  scannedAt?: string;
}

export interface AppData {
  categories: Category[];
  tags: Tag[];
  locations: Location[];
  customFields: CustomField[];
  custodians: Custodian[];
  assets: Asset[];
  audits: Audit[];
}
