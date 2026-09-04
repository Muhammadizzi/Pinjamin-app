import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Samakan kolom `assets.owner` dengan baris riwayat yang sedang terbuka.
 *
 * Riwayat adalah sumber kebenarannya; `owner` cuma cermin supaya daftar aset
 * dan halaman hasil pindai tidak perlu ikut membaca tabel riwayat. Dipanggil
 * setiap kali riwayat berubah dari sisi admin — tanpa ini, menghapus baris
 * teratas akan menyisakan nama pemilik lama yang sudah tidak punya dasar,
 * dan dua tempat itu mulai bercerita berbeda.
 */
export async function syncOwnerFromHolders(
  supa: SupabaseClient,
  assetId: string
): Promise<void> {
  const { data, error } = await supa
    .from("asset_holders")
    .select("name")
    .eq("asset_id", assetId)
    .is("to_date", null)
    .maybeSingle();
  if (error) {
    console.warn("[asset_holders] baca pemakai aktif gagal:", error.message);
    return;
  }
  const { error: tulisErr } = await supa
    .from("assets")
    .update({ owner: data?.name ?? null })
    .eq("id", assetId);
  if (tulisErr)
    console.warn("[asset_holders] samakan owner gagal:", tulisErr.message);
}
