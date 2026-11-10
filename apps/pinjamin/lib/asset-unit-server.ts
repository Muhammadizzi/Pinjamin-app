import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid, salinanDariModel } from "./resource-config";
import { normalSerial } from "./asset-model";

/**
 * Logika server bersama untuk POST & PATCH unit aset
 * (app/api/data/assets/route.ts dan [id]/route.ts).
 */

export type HasilSiapkan =
  | { ok: true; row: Record<string, unknown> }
  | { ok: false; status: number; error: string };

/**
 * Lengkapi baris unit sebelum ditulis:
 * - unit bermodel SELALU memakai nama/kategori/spesifikasi/foto modelnya —
 *   nilai yang dikirim client untuk kolom itu diabaikan, supaya unit tidak
 *   pernah bercerita berbeda dari modelnya;
 * - serial number dirapikan, dan ditolak bila sudah dipakai unit lain.
 *
 * `modelIdSekarang` = model unit yang sedang diubah (PATCH), bila ada.
 */
export async function siapkanBarisUnit(
  supa: SupabaseClient,
  row: Record<string, unknown>,
  opsi: { kecualiId?: string; modelIdSekarang?: string | null } = {}
): Promise<HasilSiapkan> {
  const out = { ...row };

  if ("asset_model_id" in out) {
    const v = out.asset_model_id;
    if (v === "" || v === null) out.asset_model_id = null;
    else if (!isUuid(v))
      return { ok: false, status: 400, error: "Model aset tidak valid." };
  }

  const modelId =
    "asset_model_id" in out
      ? (out.asset_model_id as string | null)
      : opsi.modelIdSekarang ?? null;
  if (modelId) {
    const { data: model, error } = await supa
      .from("asset_models")
      .select("*")
      .eq("id", modelId)
      .maybeSingle();
    if (error) return { ok: false, status: 500, error: "Gagal membaca model." };
    if (!model)
      return { ok: false, status: 400, error: "Model aset tidak ditemukan." };
    Object.assign(out, salinanDariModel(model));
  }

  if ("serial_number" in out) {
    const sn =
      typeof out.serial_number === "string" ? out.serial_number.trim() : "";
    out.serial_number = sn || null;
    if (sn) {
      const { data, error } = await supa
        .from("assets")
        .select("id, serial_number")
        .not("serial_number", "is", null)
        .limit(5000);
      if (error)
        return { ok: false, status: 500, error: "Gagal memeriksa serial." };
      const kembar = (data || []).some(
        (a) =>
          a.id !== opsi.kecualiId &&
          normalSerial(a.serial_number as string) === normalSerial(sn)
      );
      if (kembar) {
        return {
          ok: false,
          status: 409,
          error: `Serial number ${sn} sudah dipakai unit lain.`,
        };
      }
    }
  }

  return { ok: true, row: out };
}
