export type AssetStatus =
  | "AVAILABLE"
  | "CHECKED_OUT"
  | "MAINTENANCE"
  | "RETIRED";
export type BookingStatus =
  | "DRAFT"
  | "RESERVED"
  | "ONGOING"
  | "OVERDUE"
  | "COMPLETE"
  | "CANCELLED";
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

export interface AssetModel {
  id: string;
  name: string;
  brand?: string;
  modelNo?: string;
  categoryId?: string;
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
  assetModelId?: string;
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

export interface Kit {
  id: string;
  name: string;
  description?: string;
  status: string;
  qrCode: string;
  assetIds: string[];
  categoryId?: string;
  locationId?: string;
  image?: string;
  createdAt: string;
}

export interface Booking {
  id: string;
  name: string;
  description?: string;
  status: BookingStatus;
  custodianId: string;
  fromDate: string;
  toDate: string;
  actualReturnDate?: string;
  returnCondition?: string;
  assetIds: string[];
  kitIds: string[];
  createdBy: string;
  createdAt: string;
  history: { status: BookingStatus; at: string; by: string }[];
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
  assetModels: AssetModel[];
  custodians: Custodian[];
  assets: Asset[];
  kits: Kit[];
  bookings: Booking[];
  audits: Audit[];
}
