// Allowlists of columns clients may write per resource. Requests are picked
// against these lists (not spread blindly) so a crafted payload can't set
// columns like id / created_at / qr_code / created_by.

export type SimpleResourceKey =
  | "categories"
  | "tags"
  | "locations"
  | "customFields"
  | "assetModels"
  | "custodians"
  | "kits";

export const SIMPLE_RESOURCE_TABLE: Record<SimpleResourceKey, string> = {
  categories: "categories",
  tags: "tags",
  locations: "locations",
  customFields: "custom_fields",
  assetModels: "asset_models",
  custodians: "custodians",
  kits: "kits",
};

export const SIMPLE_RESOURCE_FIELDS: Record<SimpleResourceKey, string[]> = {
  categories: ["name", "description", "color"],
  tags: ["name", "color"],
  locations: [
    "name",
    "description",
    "address",
    "parent_id",
    "is_parent",
    "image",
  ],
  customFields: ["name", "type", "required", "options", "category_ids"],
  assetModels: ["name", "brand", "model_no", "category_id"],
  custodians: ["name", "nik", "department", "email", "phone"],
  kits: [
    "name",
    "description",
    "status",
    "image",
    "category_id",
    "location_id",
  ],
};

/**
 * Kolom yang menyimpan URL gambar per tabel. Dipakai saat menghapus record
 * supaya objek di Supabase Storage ikut dibersihkan, bukan jadi file yatim.
 */
export const IMAGE_COLUMN: Record<string, string> = {
  assets: "main_image",
  locations: "image",
  kits: "image",
};

export const ASSET_FIELDS = [
  "name",
  "description",
  "status",
  "category_id",
  "location_id",
  "asset_model_id",
  "custodian_id",
  "main_image",
  "value",
  "serial_number",
];

export const BOOKING_UPDATE_FIELDS = [
  "status",
  "actual_return_date",
  "return_condition",
];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * Kode QR yang boleh dipakai apa adanya dari client: kode bawaan aplikasi
 * (PIN-XXXXXXXX / KIT-XXXXXX) maupun kode inventaris sendiri dari impor CSV.
 * Dibatasi karakter aman + panjang kolom (VARCHAR(50)).
 */
const QR_RE = /^[A-Za-z0-9][A-Za-z0-9._/-]{2,49}$/;

export function isQrCode(value: unknown): value is string {
  return typeof value === "string" && QR_RE.test(value);
}

/**
 * Id yang dikirim client dipakai apa adanya BILA berupa UUID valid.
 *
 * Kenapa: store client membuat entitas secara optimistis dengan id sendiri,
 * lalu memakai id itu untuk PATCH/DELETE berikutnya. Kalau server malah
 * membuat UUID baru (DEFAULT gen_random_uuid()), id lokal dan id DB berbeda —
 * setiap edit/hapus setelah "tambah" akan mengenai baris yang tidak ada
 * sampai halaman di-reload. Dengan menerima id client, kedua sisi sinkron.
 */
export function clientIdRow(body: unknown): Record<string, string> {
  const id = (body as Record<string, unknown> | null)?.id;
  return isUuid(id) ? { id } : {};
}

export function pickAllowed(
  body: unknown,
  fields: string[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!body || typeof body !== "object") return out;
  for (const f of fields) {
    if (Object.prototype.hasOwnProperty.call(body, f)) {
      out[f] = (body as Record<string, unknown>)[f];
    }
  }
  return out;
}

const toSnake = (s: string) =>
  s.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);
const toCamel = (s: string) =>
  s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

export function toDbRow(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[toSnake(k)] = v;
  }
  return out;
}

export function fromDbRow(
  obj: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[toCamel(k)] = v;
  }
  return out;
}
