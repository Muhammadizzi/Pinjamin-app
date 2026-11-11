-- ============================================================
-- SIGAP — 21 BERSIHKAN KOLOM SISA FITUR LAMA
-- Jalankan di Supabase SQL Editor → asset-management → main
--
-- Supaya struktur database sama persis dengan ERD laporan KP (12 Nov 2026).
-- Yang dibuang hanya sisa fitur yang sudah dihapus dari aplikasi, dan
-- SEMUANYA kosong saat skrip ini dijalankan:
--   assets.custodian_id          modul custodian lama (tabelnya di arsip_lama)
--   locations.parent_id/is_parent  fitur area/sub-lokasi, dihapus 24 Okt 2026
--   tickets.sla_paused_at/_ms    jeda SLA, berhenti dipakai sejak Sep 2026
--   asset_notes (tabel)          tidak pernah ditulis; DIPINDAH ke arsip_lama,
--                                bukan dihapus
--
-- Urutan wajib: kode yang berhenti memakai kolom-kolom ini (commit defe4ee)
-- harus sudah ter-deploy LEBIH DULU. Kalau tidak, /api/data gagal dan panel
-- aset jatuh ke data contoh (lihat insiden asset_notes, 5 Nov 2026).
--
-- Pengaman: bila satu saja kolom/tabel di atas ternyata berisi data, blok DO
-- melempar error dan SELURUH transaksi dibatalkan — tidak ada yang terbuang.
--
-- Sudah dijalankan di production lewat migration `bersihkan_kolom_lama`.
-- ============================================================

BEGIN;

DO $$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n FROM public.assets WHERE custodian_id IS NOT NULL;
  IF n > 0 THEN RAISE EXCEPTION 'assets.custodian_id masih berisi % baris', n; END IF;
  SELECT count(*) INTO n FROM public.locations WHERE parent_id IS NOT NULL OR is_parent;
  IF n > 0 THEN RAISE EXCEPTION 'locations.parent_id/is_parent masih berisi % baris', n; END IF;
  SELECT count(*) INTO n FROM public.tickets WHERE sla_paused_at IS NOT NULL OR sla_paused_ms <> 0;
  IF n > 0 THEN RAISE EXCEPTION 'tickets.sla_paused_* masih berisi % baris', n; END IF;
  SELECT count(*) INTO n FROM public.asset_notes;
  IF n > 0 THEN RAISE EXCEPTION 'asset_notes masih berisi % baris', n; END IF;
END $$;

-- Tanpa CASCADE: bila ada objek lain yang ternyata bergantung, perintah gagal.
ALTER TABLE public.assets    DROP COLUMN custodian_id;
ALTER TABLE public.locations DROP COLUMN parent_id;
ALTER TABLE public.locations DROP COLUMN is_parent;
ALTER TABLE public.tickets   DROP COLUMN sla_paused_at;
ALTER TABLE public.tickets   DROP COLUMN sla_paused_ms;
ALTER TABLE public.asset_notes SET SCHEMA arsip_lama;

COMMIT;

NOTIFY pgrst, 'reload schema';
