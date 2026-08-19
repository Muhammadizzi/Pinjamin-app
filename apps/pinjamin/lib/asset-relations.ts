import { isUuid } from "./resource-config";

export type CustomValueRow = {
  asset_id: string;
  custom_field_id: string;
  value: string;
};

/**
 * Ubah map { [customFieldId]: value } dari client menjadi baris
 * `asset_custom_values`. Kunci yang bukan UUID (custom field lokal yang
 * belum tersinkron) dibuang, nilai dipotong 2000 karakter.
 */
export function customValueRows(
  assetId: string,
  raw: unknown
): CustomValueRow[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const out: CustomValueRow[] = [];
  for (const [fieldId, value] of Object.entries(
    raw as Record<string, unknown>
  )) {
    if (!isUuid(fieldId)) continue;
    if (value === null || value === undefined || value === "") continue;
    out.push({
      asset_id: assetId,
      custom_field_id: fieldId,
      value: String(value).slice(0, 2000),
    });
  }
  return out;
}
