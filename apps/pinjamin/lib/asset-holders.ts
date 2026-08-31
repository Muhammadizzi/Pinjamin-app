import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Catat perpindahan pemakai aset.
 *
 * Dipanggil setiap kali kolom `owner` sebuah aset berubah. Baris pemakai yang
 * sedang berjalan ditutup (`to_date` diisi) dan baris baru dibuka, sehingga
 * kolom `owner` di tabel assets dan baris teratas di `asset_holders` selalu
 * bercerita hal yang sama.
 *
 * Kenapa di server, bukan di client: halaman hasil pindai QR membaca riwayat
 * ini tanpa sesi, jadi kebenarannya tidak boleh bergantung pada peramban admin
 * yang mungkin menutup tab di tengah proses. Database juga menegakkan "satu
 * pemakai aktif per aset" lewat indeks unik parsial — kalau logika di sini
 * kelak keliru, yang terjadi adalah error, bukan riwayat bercabang diam-diam.
 *
 * Kegagalan pencatatan sengaja tidak menggagalkan penyimpanan aset: kehilangan
 * satu baris riwayat lebih ringan daripada admin gagal memperbarui asetnya.
 */
export async function recordOwnerChange(
  supa: SupabaseClient,
  assetId: string,
  ownerBaru: string | null | undefined
): Promise<void> {
  const nama = (ownerBaru ?? "").trim();
  const now = new Date().toISOString();

  const { data: aktif, error: bacaErr } = await supa
    .from("asset_holders")
    .select("id, name")
    .eq("asset_id", assetId)
    .is("to_date", null)
    .maybeSingle();
  if (bacaErr) {
    console.warn("[asset_holders] baca pemakai aktif gagal:", bacaErr.message);
    return;
  }

  // Nama sama = bukan perpindahan. Tanpa penjagaan ini, setiap penyimpanan
  // form (walau pemiliknya tidak disentuh) akan memotong riwayat jadi
  // potongan-potongan sehari.
  if ((aktif?.name ?? "") === nama) return;

  if (aktif) {
    const { error } = await supa
      .from("asset_holders")
      .update({ to_date: now })
      .eq("id", aktif.id);
    if (error)
      console.warn("[asset_holders] tutup baris lama gagal:", error.message);
  }

  if (!nama) return; // pemilik dikosongkan: cukup tutup yang lama

  const { error } = await supa
    .from("asset_holders")
    .insert({ asset_id: assetId, name: nama, from_date: now });
  if (error)
    console.warn("[asset_holders] buka baris baru gagal:", error.message);
}

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
