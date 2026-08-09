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
  tags: ["name"],
  locations: ["name", "description", "address", "parent_id"],
  customFields: ["name", "type", "required", "options"],
  assetModels: ["name", "brand", "model_no", "category_id"],
  custodians: ["name", "nik", "department", "email", "phone"],
  kits: ["name", "description", "status"],
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
