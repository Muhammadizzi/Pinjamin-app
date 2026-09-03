-- ============================================================
-- PINJAMIN - 03 SEED (DATA AWAL LENGKAP - 1 KLIK RUN)
-- Jalankan SETELAH 01 & 02
-- Isi: admin, categories, tags, locations, assets, tag aset, riwayat pemakai, catatan
-- ============================================================

-- ADMIN (password demo: admin123) — bcrypt cost 10
-- GANTI password ini setelah deploy production lewat Pengaturan Akun.
INSERT INTO admins (id, username, password_hash, name) VALUES
('00000000-0000-0000-0000-000000000001', 'adminsystem', '$2b$10$5.IJMK0xao/c3qsPEeW5EulR37iU7EEr0CZyJ3a9OVtN/M/wrbzxG', 'Administrator')
ON CONFLICT (username) DO NOTHING;

-- CATEGORIES
INSERT INTO categories (id, name, description, color) VALUES
('10000000-0000-0000-0000-000000000001', 'Elektronik', 'Perangkat elektronik kantor', '#123367'),
('10000000-0000-0000-0000-000000000002', 'Kendaraan', 'Kendaraan operasional', '#3b82f6'),
('10000000-0000-0000-0000-000000000003', 'Peralatan Kantor', 'Meja, kursi, peralatan', '#10b981'),
('10000000-0000-0000-0000-000000000004', 'Alat Produksi', 'Mesin & alat produksi', '#CBA12C')
ON CONFLICT (id) DO NOTHING;

-- TAGS
INSERT INTO tags (id, name) VALUES
('20000000-0000-0000-0000-000000000001', 'Prioritas'),
('20000000-0000-0000-0000-000000000002', 'Baru'),
('20000000-0000-0000-0000-000000000003', 'Rusak Ringan'),
('20000000-0000-0000-0000-000000000004', 'Butuh Kalibrasi')
ON CONFLICT (id) DO NOTHING;

-- LOCATIONS (hierarki)
INSERT INTO locations (id, name, description, address, parent_id) VALUES
('30000000-0000-0000-0000-000000000001', 'Gedung Utama', 'Kantor Pusat Garudafood', 'Jl. Bintaro No.1', NULL),
('30000000-0000-0000-0000-000000000002', 'Lantai 2 - IT', 'Ruang IT', 'Gedung Utama Lt.2', '30000000-0000-0000-0000-000000000001'),
('30000000-0000-0000-0000-000000000003', 'Gudang A', 'Gudang penyimpanan', 'Area Gudang', NULL),
('30000000-0000-0000-0000-000000000004', 'Ruang Meeting Garuda', 'Ruang meeting besar', 'Lt.1', '30000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- ASSETS
INSERT INTO assets (id, name, description, status, category_id, location_id, qr_code, value, serial_number, owner, spec) VALUES
('70000000-0000-0000-0000-000000000001', 'MacBook Pro 16" - IT 001', 'Laptop untuk tim development', 'GOOD', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'PIN-MBP001A', 25000000, 'SN-MBP-001', 'Rizky Ardiansyah', 'Apple M3 Pro, RAM 18GB, SSD 512GB'),
('70000000-0000-0000-0000-000000000002', 'Proyektor Epson EB-X51', 'Proyektor ruang meeting', 'DAMAGED', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 'PIN-PRJ002B', 8000000, 'SN-PRJ-002', 'Nur Khodhori', '3LCD, 3800 lumen, WXGA'),
('70000000-0000-0000-0000-000000000003', 'Toyota Avanza Operasional', 'Mobil operasional pooling', 'GOOD', '10000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003', 'PIN-CAR003C', 250000000, 'B1234XYZ', NULL, 'Bensin, 1.500 cc, 7 penumpang'),
('70000000-0000-0000-0000-000000000004', 'Meja Kerja Ergonomis', 'Meja standing desk', 'MAINTENANCE', '10000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', 'PIN-MEJ004D', 3500000, 'SN-MEJ-004', 'Siti Rahayu', 'Rangka baja, tinggi 72-118 cm'),
('70000000-0000-0000-0000-000000000005', 'Lenovo ThinkPad X1 - Dev 02', 'Laptop backup developer', 'GOOD', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'PIN-TP005E', 22000000, 'SN-TP-005', 'Budi Santoso', 'Core i7-1165G7, RAM 16GB, SSD 512GB'),
('70000000-0000-0000-0000-000000000006', 'Sound System Portable', 'Untuk event luar ruangan', 'GOOD', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'PIN-SND006F', 12000000, 'SN-SND-006', NULL, '2x300W, bluetooth, baterai 6 jam'),
('70000000-0000-0000-0000-000000000007', 'Kamera DSLR Canon', 'Untuk dokumentasi marketing', 'GOOD', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 'PIN-CAM007G', 18000000, 'SN-CAM-007', 'Dewi Lestari', 'EOS 90D, lensa 18-135mm'),
('70000000-0000-0000-0000-000000000008', 'Forklift Elektrik', 'Alat angkut gudang', 'DAMAGED', '10000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000003', 'PIN-FRK008H', 150000000, 'SN-FRK-008', NULL, 'Kapasitas 1,5 ton, baterai 48V')
ON CONFLICT (id) DO NOTHING;

-- ASSET_TAGS
INSERT INTO asset_tags (asset_id, tag_id) VALUES
('70000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
('70000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002'),
('70000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001'),
('70000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000003'),
('70000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;

-- ASSET_HOLDERS (riwayat pemakai — baris terbuka = pemilik sekarang)
INSERT INTO asset_holders (asset_id, name, department, from_date, to_date) VALUES
('70000000-0000-0000-0000-000000000001', 'Rizky Ardiansyah', 'IT', now() - interval '90 days', NULL),
('70000000-0000-0000-0000-000000000005', 'Andi Wijaya', 'QA', now() - interval '300 days', now() - interval '60 days'),
('70000000-0000-0000-0000-000000000005', 'Budi Santoso', 'IT', now() - interval '60 days', NULL),
('70000000-0000-0000-0000-000000000002', 'Nur Khodhori', 'GA', now() - interval '45 days', NULL),
('70000000-0000-0000-0000-000000000004', 'Siti Rahayu', 'Produksi', now() - interval '120 days', NULL),
('70000000-0000-0000-0000-000000000007', 'Dewi Lestari', 'Marketing', now() - interval '30 days', NULL)
ON CONFLICT DO NOTHING;

-- ASSET NOTES
INSERT INTO asset_notes (asset_id, content, type) VALUES
('70000000-0000-0000-0000-000000000001', 'Aset baru, kondisi prima', 'update'),
('70000000-0000-0000-0000-000000000004', 'Kaki meja goyang, perlu servis', 'maintenance'),
('70000000-0000-0000-0000-000000000008', 'Sudah tidak layak pakai', 'retired')
ON CONFLICT DO NOTHING;

-- Verifikasi
SELECT 'categories' AS tbl, count(*) FROM categories UNION ALL
SELECT 'assets', count(*) FROM assets UNION ALL
SELECT 'asset_holders', count(*) FROM asset_holders UNION ALL
SELECT 'asset_notes', count(*) FROM asset_notes;
