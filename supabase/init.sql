-- ===== SCHEMA =====
-- ============================================================
-- SCHEMA DATABASE - Dashboard Monitoring Bencana Aceh
-- Jalankan di Supabase SQL Editor:
-- https://supabase.com/dashboard/project/xntltvftkboiyqsfpqoi/sql/new
-- ============================================================

-- =====================
-- 1. TABEL BENCANA / TITIK LOKASI KERUSAKAN
-- =====================
CREATE TABLE IF NOT EXISTS bencana (
  id SERIAL PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  jenis VARCHAR(100) DEFAULT 'banjir', -- banjir, longsor, gempa, dll
  kabupaten VARCHAR(100),
  kecamatan VARCHAR(100),
  desa VARCHAR(100),
  lat DECIMAL(10, 6),
  lng DECIMAL(10, 6),
  status VARCHAR(50) DEFAULT 'aktif', -- aktif, teratasi
  jumlah_korban INTEGER DEFAULT 0,
  jumlah_pengungsi INTEGER DEFAULT 0,
  luas_sawah DECIMAL(10, 2) DEFAULT 0,
  luas_kebun DECIMAL(10, 2) DEFAULT 0,
  luas_tambak DECIMAL(10, 2) DEFAULT 0,
  rumah_rusak INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 2. TABEL PENDUDUK
-- =====================
CREATE TABLE IF NOT EXISTS penduduk (
  id SERIAL PRIMARY KEY,
  kabupaten VARCHAR(100) NOT NULL,
  kabupaten_id VARCHAR(10),
  total_penduduk INTEGER DEFAULT 0,
  total_kk INTEGER DEFAULT 0,
  jumlah_pengungsi INTEGER DEFAULT 0,
  disabilitas INTEGER DEFAULT 0,
  lat DECIMAL(10, 6),
  lng DECIMAL(10, 6),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 3. TABEL POSKO PENGUNGSIAN
-- =====================
CREATE TABLE IF NOT EXISTS posko (
  id SERIAL PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  kabupaten VARCHAR(100),
  kecamatan VARCHAR(100),
  desa VARCHAR(100),
  lat DECIMAL(10, 6),
  lng DECIMAL(10, 6),
  kapasitas INTEGER DEFAULT 0,
  jumlah_pengungsi INTEGER DEFAULT 0,
  jumlah_kk INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'aktif',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 4. TABEL BANTUAN LOGISTIK
-- =====================
CREATE TABLE IF NOT EXISTS bantuan_logistik (
  id SERIAL PRIMARY KEY,
  desa VARCHAR(255) NOT NULL,
  kecamatan VARCHAR(100),
  kabupaten VARCHAR(100),
  satuan VARCHAR(100),
  jumlah INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'putih', -- kuning, biru, biru_keabuan, putih
  lat DECIMAL(10, 6),
  lng DECIMAL(10, 6),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 5. TABEL PERTANIAN (KERUSAKAN)
-- =====================
CREATE TABLE IF NOT EXISTS pertanian (
  id SERIAL PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  kabupaten VARCHAR(100),
  kecamatan VARCHAR(100),
  desa VARCHAR(100),
  jenis VARCHAR(100) DEFAULT 'sawah', -- sawah, kebun, tambak, kolam
  volume DECIMAL(10, 2) DEFAULT 0, -- luas dalam Ha
  satuan VARCHAR(20) DEFAULT 'Ha',
  kondisi VARCHAR(50) DEFAULT 'ringan', -- berat, sedang, ringan
  estimasi_kerugian BIGINT DEFAULT 0,
  lat DECIMAL(10, 6),
  lng DECIMAL(10, 6),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 6. TABEL ORANG HILANG
-- =====================
CREATE TABLE IF NOT EXISTS orang_hilang (
  id SERIAL PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  usia INTEGER,
  jenis_kelamin VARCHAR(20) DEFAULT 'L',
  kabupaten VARCHAR(100),
  kecamatan VARCHAR(100),
  desa VARCHAR(100),
  status VARCHAR(50) DEFAULT 'dicari', -- dicari, ditemukan, meninggal
  keterangan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 7. TABEL FASILITAS PUBLIK (RUSAK)
-- =====================
CREATE TABLE IF NOT EXISTS fasilitas_publik (
  id SERIAL PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  jenis VARCHAR(100) DEFAULT 'jembatan', -- jembatan, jalan, sekolah, masjid, dll
  kabupaten VARCHAR(100),
  kecamatan VARCHAR(100),
  desa VARCHAR(100),
  kondisi VARCHAR(50) DEFAULT 'rusak_ringan', -- rusak_berat, rusak_sedang, rusak_ringan
  estimasi_kerugian BIGINT DEFAULT 0,
  lat DECIMAL(10, 6),
  lng DECIMAL(10, 6),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 8. TABEL LOKASI TENDA (PENGUNGSIAN)
-- =====================
CREATE TABLE IF NOT EXISTS lokasi_tenda (
  id SERIAL PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  kabupaten VARCHAR(100),
  kecamatan VARCHAR(100),
  desa VARCHAR(100),
  lat DECIMAL(10, 6),
  lng DECIMAL(10, 6),
  jumlah_tenda INTEGER DEFAULT 0,
  kapasitas INTEGER DEFAULT 0,
  jumlah_pengungsi INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'aktif',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 9. TABEL CLUSTER / REHAB & REKON
-- =====================
CREATE TABLE IF NOT EXISTS cluster_data (
  id SERIAL PRIMARY KEY,
  kabupaten VARCHAR(100),
  sektor VARCHAR(100), -- Perumahan, Kesehatan, Pendidikan, dll
  sub_sektor VARCHAR(100),
  total_kerusakan BIGINT DEFAULT 0,
  total_kerugian BIGINT DEFAULT 0,
  lat DECIMAL(10, 6),
  lng DECIMAL(10, 6),
  status VARCHAR(50) DEFAULT 'assessment',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 10. TABEL JARINGAN TELEKOMUNIKASI
-- =====================
CREATE TABLE IF NOT EXISTS jaringan (
  id SERIAL PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  kabupaten VARCHAR(100),
  kecamatan VARCHAR(100),
  jenis VARCHAR(100) DEFAULT 'BTS', -- BTS, Fiber, Satelit
  status VARCHAR(50) DEFAULT 'normal', -- critical, warning, normal
  provider VARCHAR(100),
  lat DECIMAL(10, 6),
  lng DECIMAL(10, 6),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 11. TABEL PUSKESMAS
-- =====================
CREATE TABLE IF NOT EXISTS puskesmas (
  id SERIAL PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  kabupaten VARCHAR(100),
  kecamatan VARCHAR(100),
  lat DECIMAL(10, 6),
  lng DECIMAL(10, 6),
  status VARCHAR(50) DEFAULT 'normal', -- normal, terdampak, darurat
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 12. TABEL RSUD
-- =====================
CREATE TABLE IF NOT EXISTS rsud (
  id SERIAL PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  kabupaten VARCHAR(100),
  kecamatan VARCHAR(100),
  lat DECIMAL(10, 6),
  lng DECIMAL(10, 6),
  kelas VARCHAR(10) DEFAULT 'C', -- A, B, C, D
  status VARCHAR(50) DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 13. TABEL FASYANKES V2 (Klinik, Apotek, dll)
-- =====================
CREATE TABLE IF NOT EXISTS fasyankes (
  id SERIAL PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  jenis VARCHAR(100) DEFAULT 'klinik', -- klinik, apotek, bidan, pustu
  kabupaten VARCHAR(100),
  kecamatan VARCHAR(100),
  lat DECIMAL(10, 6),
  lng DECIMAL(10, 6),
  status VARCHAR(50) DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- ENABLE ROW LEVEL SECURITY (RLS) - Agar bisa diakses publik
-- =====================
ALTER TABLE bencana ENABLE ROW LEVEL SECURITY;
ALTER TABLE penduduk ENABLE ROW LEVEL SECURITY;
ALTER TABLE posko ENABLE ROW LEVEL SECURITY;
ALTER TABLE bantuan_logistik ENABLE ROW LEVEL SECURITY;
ALTER TABLE pertanian ENABLE ROW LEVEL SECURITY;
ALTER TABLE orang_hilang ENABLE ROW LEVEL SECURITY;
ALTER TABLE fasilitas_publik ENABLE ROW LEVEL SECURITY;
ALTER TABLE lokasi_tenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE cluster_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE jaringan ENABLE ROW LEVEL SECURITY;
ALTER TABLE puskesmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsud ENABLE ROW LEVEL SECURITY;
ALTER TABLE fasyankes ENABLE ROW LEVEL SECURITY;

-- =====================
-- POLICIES: Allow public read access
-- =====================
CREATE POLICY "Public read bencana" ON bencana FOR SELECT USING (true);
CREATE POLICY "Public read penduduk" ON penduduk FOR SELECT USING (true);
CREATE POLICY "Public read posko" ON posko FOR SELECT USING (true);
CREATE POLICY "Public read bantuan_logistik" ON bantuan_logistik FOR SELECT USING (true);
CREATE POLICY "Public read pertanian" ON pertanian FOR SELECT USING (true);
CREATE POLICY "Public read orang_hilang" ON orang_hilang FOR SELECT USING (true);
CREATE POLICY "Public read fasilitas_publik" ON fasilitas_publik FOR SELECT USING (true);
CREATE POLICY "Public read lokasi_tenda" ON lokasi_tenda FOR SELECT USING (true);
CREATE POLICY "Public read cluster_data" ON cluster_data FOR SELECT USING (true);
CREATE POLICY "Public read jaringan" ON jaringan FOR SELECT USING (true);
CREATE POLICY "Public read puskesmas" ON puskesmas FOR SELECT USING (true);
CREATE POLICY "Public read rsud" ON rsud FOR SELECT USING (true);
CREATE POLICY "Public read fasyankes" ON fasyankes FOR SELECT USING (true);


-- ===== SEED DATA =====
-- SEED DATA - Dashboard Bencana Aceh
-- Jalankan SETELAH schema.sql di Supabase SQL Editor

-- BENCANA (titik kerusakan)
INSERT INTO bencana (nama, jenis, kabupaten, kecamatan, desa, lat, lng, status, jumlah_korban, jumlah_pengungsi, rumah_rusak, luas_sawah) VALUES
('Banjir Krueng Aceh', 'banjir', 'Aceh Besar', 'Kuta Baro', 'Lam Asan', 5.44, 95.63, 'aktif', 12, 450, 87, 120.5),
('Longsor Gayo', 'longsor', 'Aceh Tengah', 'Bebesen', 'Bebesen', 4.63, 96.85, 'aktif', 5, 120, 34, 45.0),
('Banjir Pidie', 'banjir', 'Pidie', 'Geumpang', 'Geumpang', 5.23, 96.13, 'aktif', 8, 320, 65, 89.5),
('Banjir Bireuen', 'banjir', 'Bireuen', 'Peusangan', 'Paya Rabo', 5.21, 96.69, 'aktif', 3, 210, 42, 67.3),
('Banjir Aceh Utara', 'banjir', 'Aceh Utara', 'Lhoksukon', 'Cot Girek', 5.01, 97.12, 'aktif', 7, 380, 78, 110.2),
('Longsor Aceh Tenggara', 'longsor', 'Aceh Tenggara', 'Lawe Sigala-Gala', 'Lawe Pakam', 3.55, 97.83, 'aktif', 2, 85, 18, 30.0),
('Banjir Aceh Timur', 'banjir', 'Aceh Timur', 'Idi Rayeuk', 'Paya Bili', 4.62, 97.81, 'aktif', 4, 175, 36, 55.8),
('Banjir Nagan Raya', 'banjir', 'Nagan Raya', 'Beutong', 'Beutong', 4.00, 96.42, 'aktif', 6, 240, 51, 78.4),
('Banjir Aceh Barat', 'banjir', 'Aceh Barat', 'Johan Pahlawan', 'Suak Ribee', 4.09, 96.22, 'aktif', 9, 290, 60, 95.1),
('Longsor Aceh Selatan', 'longsor', 'Aceh Selatan', 'Tapaktuan', 'Tapaktuan', 3.17, 97.43, 'aktif', 1, 60, 12, 20.0);

-- PENDUDUK
INSERT INTO penduduk (kabupaten, kabupaten_id, total_penduduk, total_kk, jumlah_pengungsi, disabilitas, lat, lng) VALUES
('Aceh Besar', '1108', 410234, 98450, 450, 1240, 5.44, 95.63),
('Pidie', '1109', 389234, 92100, 320, 1100, 5.23, 96.13),
('Bireuen', '1110', 423512, 101200, 210, 1320, 5.21, 96.69),
('Aceh Utara', '1111', 571345, 138900, 380, 1780, 5.01, 97.12),
('Aceh Tengah', '1106', 198123, 48300, 120, 620, 4.63, 96.85),
('Aceh Timur', '1105', 411234, 99500, 175, 1290, 4.62, 97.81),
('Aceh Barat', '1107', 187234, 45800, 290, 580, 4.09, 96.22),
('Nagan Raya', '1115', 158234, 38900, 240, 490, 4.00, 96.42),
('Aceh Selatan', '1103', 224123, 55100, 60, 700, 3.17, 97.43),
('Aceh Tenggara', '1104', 218123, 53400, 85, 680, 3.55, 97.83),
('Kota Banda Aceh', '1171', 254904, 62300, 95, 790, 5.55, 95.32),
('Aceh Singkil', '1102', 120234, 29800, 35, 375, 2.38, 97.79);

-- POSKO PENGUNGSIAN
INSERT INTO posko (nama, kabupaten, kecamatan, desa, lat, lng, kapasitas, jumlah_pengungsi, jumlah_kk, status) VALUES
('Posko Utama Kuta Baro', 'Aceh Besar', 'Kuta Baro', 'Lam Asan', 5.442, 95.631, 600, 450, 120, 'aktif'),
('Gedung Serbaguna Bebesen', 'Aceh Tengah', 'Bebesen', 'Bebesen', 4.631, 96.852, 200, 120, 35, 'aktif'),
('Masjid Agung Pidie', 'Pidie', 'Geumpang', 'Geumpang', 5.232, 96.133, 400, 320, 88, 'aktif'),
('SMA N 1 Peusangan', 'Bireuen', 'Peusangan', 'Paya Rabo', 5.212, 96.692, 300, 210, 58, 'aktif'),
('Gedung BPBD Aceh Utara', 'Aceh Utara', 'Lhoksukon', 'Cot Girek', 5.013, 97.123, 500, 380, 102, 'aktif'),
('Balai Desa Lawe Pakam', 'Aceh Tenggara', 'Lawe Sigala-Gala', 'Lawe Pakam', 3.551, 97.832, 150, 85, 24, 'aktif'),
('Gedung Olahraga Idi', 'Aceh Timur', 'Idi Rayeuk', 'Paya Bili', 4.622, 97.812, 250, 175, 48, 'aktif'),
('SDN 1 Beutong', 'Nagan Raya', 'Beutong', 'Beutong', 4.002, 96.423, 350, 240, 66, 'aktif');

-- BANTUAN LOGISTIK
INSERT INTO bantuan_logistik (desa, kecamatan, kabupaten, satuan, jumlah, status, lat, lng) VALUES
('Lam Asan', 'Kuta Baro', 'Aceh Besar', 'Paket Sembako', 450, 'kuning', 5.442, 95.631),
('Bebesen', 'Bebesen', 'Aceh Tengah', 'Paket Sembako', 120, 'biru', 4.631, 96.852),
('Geumpang', 'Geumpang', 'Pidie', 'Selimut', 320, 'kuning', 5.232, 96.133),
('Paya Rabo', 'Peusangan', 'Bireuen', 'Paket Sembako', 210, 'biru', 5.212, 96.692),
('Cot Girek', 'Lhoksukon', 'Aceh Utara', 'Tenda', 380, 'biru_keabuan', 5.013, 97.123),
('Lawe Pakam', 'Lawe Sigala-Gala', 'Aceh Tenggara', 'Paket Sembako', 85, 'putih', 3.551, 97.832),
('Paya Bili', 'Idi Rayeuk', 'Aceh Timur', 'Air Bersih', 175, 'kuning', 4.622, 97.812),
('Beutong', 'Beutong', 'Nagan Raya', 'Selimut', 240, 'biru', 4.002, 96.423),
('Suak Ribee', 'Johan Pahlawan', 'Aceh Barat', 'Paket Sembako', 290, 'putih', 4.092, 96.222),
('Tapaktuan', 'Tapaktuan', 'Aceh Selatan', 'Obat-obatan', 60, 'kuning', 3.172, 97.432);

-- PERTANIAN
INSERT INTO pertanian (nama, kabupaten, kecamatan, desa, jenis, volume, satuan, kondisi, estimasi_kerugian, lat, lng) VALUES
('Sawah Lam Asan', 'Aceh Besar', 'Kuta Baro', 'Lam Asan', 'sawah', 120.5, 'Ha', 'berat', 1800000000, 5.442, 95.631),
('Tambak Bebesen', 'Aceh Tengah', 'Bebesen', 'Bebesen', 'tambak', 45.0, 'Ha', 'sedang', 675000000, 4.631, 96.852),
('Sawah Geumpang', 'Pidie', 'Geumpang', 'Geumpang', 'sawah', 89.5, 'Ha', 'berat', 1342500000, 5.232, 96.133),
('Kebun Paya Rabo', 'Bireuen', 'Peusangan', 'Paya Rabo', 'kebun', 67.3, 'Ha', 'ringan', 504750000, 5.212, 96.692),
('Sawah Cot Girek', 'Aceh Utara', 'Lhoksukon', 'Cot Girek', 'sawah', 110.2, 'Ha', 'berat', 1653000000, 5.013, 97.123),
('Kebun Lawe Pakam', 'Aceh Tenggara', 'Lawe Sigala-Gala', 'Lawe Pakam', 'kebun', 30.0, 'Ha', 'sedang', 450000000, 3.551, 97.832),
('Sawah Paya Bili', 'Aceh Timur', 'Idi Rayeuk', 'Paya Bili', 'sawah', 55.8, 'Ha', 'berat', 837000000, 4.622, 97.812),
('Sawah Beutong', 'Nagan Raya', 'Beutong', 'Beutong', 'sawah', 78.4, 'Ha', 'sedang', 1176000000, 4.002, 96.423);

-- ORANG HILANG
INSERT INTO orang_hilang (nama, usia, jenis_kelamin, kabupaten, kecamatan, desa, status, keterangan) VALUES
('Mukhtar bin Ahmad', 45, 'L', 'Aceh Besar', 'Kuta Baro', 'Lam Asan', 'dicari', 'Terakhir terlihat saat banjir terjadi'),
('Fatimah binti Yusuf', 32, 'P', 'Aceh Tengah', 'Bebesen', 'Bebesen', 'ditemukan', 'Ditemukan di pengungsian Gedung Serbaguna'),
('Ridwan Maulana', 17, 'L', 'Pidie', 'Geumpang', 'Geumpang', 'dicari', 'Hanyut terbawa arus sungai'),
('Nurhasanah', 28, 'P', 'Aceh Utara', 'Lhoksukon', 'Cot Girek', 'ditemukan', 'Ditemukan selamat di atap rumah'),
('Ibrahim Khalil', 55, 'L', 'Aceh Timur', 'Idi Rayeuk', 'Paya Bili', 'dicari', 'Hilang saat evakuasi');

-- FASILITAS PUBLIK
INSERT INTO fasilitas_publik (nama, jenis, kabupaten, kecamatan, desa, kondisi, estimasi_kerugian, lat, lng) VALUES
('Jembatan Krueng Aceh', 'jembatan', 'Aceh Besar', 'Kuta Baro', 'Lam Asan', 'rusak_berat', 5000000000, 5.441, 95.630),
('SDN 1 Geumpang', 'sekolah', 'Pidie', 'Geumpang', 'Geumpang', 'rusak_sedang', 1200000000, 5.231, 96.132),
('Masjid Baitul Rahman', 'masjid', 'Aceh Utara', 'Lhoksukon', 'Cot Girek', 'rusak_ringan', 800000000, 5.012, 97.122),
('Puskesmas Beutong', 'puskesmas', 'Nagan Raya', 'Beutong', 'Beutong', 'rusak_sedang', 2000000000, 4.001, 96.422),
('Jalan Nasional KM 45', 'jalan', 'Aceh Tengah', 'Bebesen', 'Bebesen', 'rusak_berat', 3500000000, 4.630, 96.851);

-- LOKASI TENDA
INSERT INTO lokasi_tenda (nama, kabupaten, kecamatan, desa, lat, lng, jumlah_tenda, kapasitas, jumlah_pengungsi, status) VALUES
('Lapangan Kuta Baro', 'Aceh Besar', 'Kuta Baro', 'Lam Asan', 5.443, 95.632, 45, 450, 380, 'aktif'),
('Halaman Masjid Bebesen', 'Aceh Tengah', 'Bebesen', 'Bebesen', 4.632, 96.853, 15, 150, 110, 'aktif'),
('Lapangan Bola Peusangan', 'Bireuen', 'Peusangan', 'Paya Rabo', 5.213, 96.693, 28, 280, 205, 'aktif'),
('Lapangan Idi Rayeuk', 'Aceh Timur', 'Idi Rayeuk', 'Paya Bili', 4.623, 97.813, 20, 200, 165, 'aktif');

-- CLUSTER DATA (Rehab & Rekon)
INSERT INTO cluster_data (kabupaten, sektor, sub_sektor, total_kerusakan, total_kerugian, lat, lng, status) VALUES
('Aceh Besar', 'Perumahan', 'Rumah Rusak Berat', 8700000000, 2100000000, 5.44, 95.63, 'assessment'),
('Aceh Besar', 'Infrastruktur', 'Jembatan', 5000000000, 500000000, 5.44, 95.63, 'assessment'),
('Pidie', 'Perumahan', 'Rumah Rusak Sedang', 3250000000, 812500000, 5.23, 96.13, 'assessment'),
('Aceh Utara', 'Pertanian', 'Sawah', 1653000000, 413250000, 5.01, 97.12, 'assessment'),
('Aceh Tengah', 'Infrastruktur', 'Jalan', 3500000000, 875000000, 4.63, 96.85, 'assessment'),
('Bireuen', 'Perumahan', 'Rumah Rusak Ringan', 1050000000, 262500000, 5.21, 96.69, 'assessment'),
('Nagan Raya', 'Kesehatan', 'Puskesmas', 2000000000, 500000000, 4.00, 96.42, 'assessment'),
('Aceh Timur', 'Pendidikan', 'Sekolah', 1800000000, 450000000, 4.62, 97.81, 'assessment');

-- JARINGAN
INSERT INTO jaringan (nama, kabupaten, kecamatan, jenis, status, provider, lat, lng) VALUES
('BTS Kuta Baro', 'Aceh Besar', 'Kuta Baro', 'BTS', 'critical', 'Telkomsel', 5.441, 95.629),
('BTS Geumpang', 'Pidie', 'Geumpang', 'BTS', 'critical', 'XL', 5.231, 96.131),
('BTS Bebesen', 'Aceh Tengah', 'Bebesen', 'BTS', 'warning', 'Indosat', 4.631, 96.851),
('BTS Lhoksukon', 'Aceh Utara', 'Lhoksukon', 'BTS', 'warning', 'Telkomsel', 5.011, 97.121),
('BTS Idi Rayeuk', 'Aceh Timur', 'Idi Rayeuk', 'BTS', 'normal', 'Telkomsel', 4.621, 97.811),
('BTS Beutong', 'Nagan Raya', 'Beutong', 'BTS', 'normal', 'XL', 4.001, 96.421),
('Tower Lawe Pakam', 'Aceh Tenggara', 'Lawe Sigala-Gala', 'BTS', 'critical', 'Telkomsel', 3.551, 97.831);

-- PUSKESMAS
INSERT INTO puskesmas (nama, kabupaten, kecamatan, lat, lng, status) VALUES
('PKM Kuta Baro', 'Aceh Besar', 'Kuta Baro', 5.442, 95.630, 'terdampak'),
('PKM Bebesen', 'Aceh Tengah', 'Bebesen', 4.631, 96.852, 'normal'),
('PKM Geumpang', 'Pidie', 'Geumpang', 5.232, 96.132, 'terdampak'),
('PKM Peusangan', 'Bireuen', 'Peusangan', 5.212, 96.692, 'normal'),
('PKM Lhoksukon', 'Aceh Utara', 'Lhoksukon', 5.012, 97.122, 'normal'),
('PKM Lawe Sigala', 'Aceh Tenggara', 'Lawe Sigala-Gala', 3.552, 97.832, 'normal'),
('PKM Idi Rayeuk', 'Aceh Timur', 'Idi Rayeuk', 4.622, 97.812, 'normal'),
('PKM Beutong', 'Nagan Raya', 'Beutong', 4.002, 96.422, 'darurat');

-- RSUD
INSERT INTO rsud (nama, kabupaten, kecamatan, lat, lng, kelas, status) VALUES
('RSUD Cut Meutia', 'Aceh Utara', 'Lhoksukon', 5.015, 97.125, 'B', 'normal'),
('RSUD dr. Fauziah', 'Bireuen', 'Kota Juang', 5.215, 96.695, 'B', 'normal'),
('RSUD Datu Beru', 'Aceh Tengah', 'Bebesen', 4.635, 96.855, 'C', 'terdampak'),
('RSUD Yuliddin Away', 'Aceh Selatan', 'Tapaktuan', 3.175, 97.435, 'C', 'normal'),
('RSUD Sultan Iskandar Muda', 'Aceh Besar', 'Jantho', 5.445, 95.635, 'C', 'normal');

-- FASYANKES
INSERT INTO fasyankes (nama, jenis, kabupaten, kecamatan, lat, lng, status) VALUES
('Klinik Pratama Kuta Baro', 'klinik', 'Aceh Besar', 'Kuta Baro', 5.443, 95.632, 'normal'),
('Apotek Sejahtera Bebesen', 'apotek', 'Aceh Tengah', 'Bebesen', 4.633, 96.853, 'terdampak'),
('Pustu Geumpang', 'pustu', 'Pidie', 'Geumpang', 5.233, 96.133, 'normal'),
('Bidan Desa Paya Rabo', 'bidan', 'Bireuen', 'Peusangan', 5.213, 96.693, 'normal'),
('Klinik Utama Lhoksukon', 'klinik', 'Aceh Utara', 'Lhoksukon', 5.013, 97.123, 'normal');

