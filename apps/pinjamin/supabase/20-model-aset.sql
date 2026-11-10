-- ============================================================
-- SIGAP — 20 MODEL ASET (induk aset)
-- Jalankan di Supabase SQL Editor → asset-management → main
--
-- Koreksi dosen pembimbing (11 November 2026): satu jenis barang — misalnya
-- "PC Dell OptiPlex 3000 Tower" — bisa punya banyak unit fisik. Nama,
-- kategori, spesifikasi, dan foto disimpan SEKALI di model; tiap unit (baris
-- `assets`) menyimpan serial number, kondisi, lokasi, catatan, dan QR-nya
-- sendiri, lalu menunjuk modelnya lewat `asset_model_id`.
--
-- Kolom name / category_id / spec / main_image di `assets` TETAP ada dan diisi
-- salinan dari modelnya oleh aplikasi (app/api/data/assets/**,
-- app/api/data/asset-models/**). Dengan begitu halaman publik hasil pindai QR,
-- laporan Excel, dan pencarian tetap membaca satu baris tanpa join.
--
-- Kolom `asset_model_id` sudah ada sejak modul lama, tetapi FK-nya menunjuk
-- arsip_lama.asset_models. Skrip ini memindahkannya ke tabel baru.
--
-- Sudah dijalankan di production lewat migration `model_aset_induk`
-- (11 Nov 2026). Indeks serial number unik menyusul lewat
-- `serial_number_unik` setelah kode baru ter-deploy.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.asset_models (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        varchar(255) NOT NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  spec        text,
  image       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Nama model unik tanpa membedakan huruf besar/kecil.
CREATE UNIQUE INDEX IF NOT EXISTS asset_models_name_lower_key
  ON public.asset_models (lower(name));

-- Sama dengan tabel lain: RLS aktif tanpa policy, hanya service role.
ALTER TABLE public.asset_models ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.asset_models FROM anon, authenticated;

-- Lepas FK lama ke arsip, lalu buat satu model per nama aset yang ada.
ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_asset_model_id_fkey;
UPDATE public.assets SET asset_model_id = NULL
  WHERE asset_model_id IS NOT NULL
    AND asset_model_id NOT IN (SELECT id FROM public.asset_models);

INSERT INTO public.asset_models (name, category_id, spec, image, created_at)
SELECT DISTINCT ON (lower(name)) name, category_id, spec, main_image, created_at
FROM public.assets
WHERE NOT EXISTS (
  SELECT 1 FROM public.asset_models m WHERE lower(m.name) = lower(assets.name)
)
ORDER BY lower(name), created_at;

UPDATE public.assets a SET asset_model_id = m.id
FROM public.asset_models m
WHERE lower(m.name) = lower(a.name) AND a.asset_model_id IS NULL;

-- RESTRICT: model yang masih punya unit tidak bisa dihapus.
ALTER TABLE public.assets
  ADD CONSTRAINT assets_asset_model_id_fkey
  FOREIGN KEY (asset_model_id) REFERENCES public.asset_models(id)
  ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_assets_model ON public.assets (asset_model_id);

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Serial number unik (tanpa membedakan huruf besar/kecil), hanya yang terisi.
-- Dijalankan TERPISAH setelah kode baru ter-deploy: kode lama menghitung
-- serial dari jumlah aset dan bisa menerbitkan nomor yang sudah dipakai.
-- CREATE UNIQUE INDEX IF NOT EXISTS assets_serial_number_lower_key
--   ON public.assets (lower(serial_number))
--   WHERE serial_number IS NOT NULL AND serial_number <> '';

-- Verifikasi — jumlah model dan aset tanpa model (seharusnya 0).
SELECT
  (SELECT count(*) FROM public.asset_models) AS model,
  (SELECT count(*) FROM public.assets WHERE asset_model_id IS NULL) AS aset_tanpa_model;
