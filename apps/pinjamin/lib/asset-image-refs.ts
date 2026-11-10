import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Apakah URL foto ini masih dirujuk model atau unit mana pun?
 *
 * Sejak ada model aset, satu foto dipakai bersama: model menyimpannya di
 * `asset_models.image`, dan setiap unitnya menyimpan salinan URL yang sama di
 * `assets.main_image`. Menghapus satu unit — atau mengganti foto lalu
 * membuang yang lama — tidak boleh ikut menghapus berkas yang masih tampil di
 * unit lain. Panggil ini SETELAH baris yang bersangkutan dihapus/diubah.
 *
 * Bila pemeriksaan gagal, dianggap MASIH dipakai: berkas yatim di bucket
 * jauh lebih murah daripada foto yang hilang dari aset yang hidup.
 */
export async function gambarMasihDipakai(
  supa: SupabaseClient,
  url: string
): Promise<boolean> {
  const [unit, model] = await Promise.all([
    supa
      .from("assets")
      .select("id", { count: "exact", head: true })
      .eq("main_image", url),
    supa
      .from("asset_models")
      .select("id", { count: "exact", head: true })
      .eq("image", url),
  ]);
  if (unit.error || model.error) return true;
  return (unit.count ?? 0) + (model.count ?? 0) > 0;
}
