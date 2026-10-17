# Learning Proposal: Integrasi CHC Early Estimates (UC Santa Barbara) — Southeast Asia

## 1. Analisis Kebutuhan & Kelayakan (Feasibility Analysis)

### Apakah bisa membuat tab baru di `/dashboard/klimatologi` untuk CHC Early Estimates Southeast Asia?
**BISA DAN SANGAT MEMUNGKINKAN (100% FEASIBLE).**

### Temuan Investigasi Sumber Data CHC Early Estimates:
1. **Penyedia Resmi**: Climate Hazards Center (CHC), University of California Santa Barbara (UCSB).
2. **Karakteristik Produk**:
   - Mengombinasikan observasi satelit presipitasi inframerah terkoreksi stasiun **CHIRPS v3** dengan model prakiraan ansambel 15-hari **CHIRPS-GEFS**.
   - Menyediakan produk monitoring multiskala: **Recent Rainfall** (jendela bergerak 1–18 pentad / 5–90 hari) dan **Seasonal Rainfall** (periode musiman regional spesifik).
3. **Ketersediaan Wilayah Southeast Asia (`asia_southeast`)**:
   - Wilayah Asia Tenggara (`asia_southeast`) mencakup seluruh kepulauan Indonesia, Semenanjung Malaya, Indochina, dan Filipina.
   - CHC menerbitkan grafik peta beresolusi tinggi (`.png`) secara berkala dan selalu terbarukan (real-time / near-real-time) langsung di server terbuka CHC:
     - **Recent Rainfall with Forecast (Jendela Bergerak)**:
       - `moving_02pentad` (~10–25 hari): `Total`, `Anomaly`, `POA` (% Rata-rata), `SPI`, `Rank`.
       - `moving_06pentad` (~30–45 hari / 1 bulan).
       - `moving_12pentad` (~60–75 hari / 2 bulan).
       - `moving_18pentad` (~90–105 hari / 1 musim / 3 bulan).
     - **Seasonal Rainfall with Forecast (Musiman Asia Tenggara)**:
       - `oct_to_jan` (Musim Hujan Utama Indonesia: Oktober–Januari)
       - `dec_to_may` (Puncak Hujan hingga Awal Kemarau: Desember–Mei)
       - `apr_to_dec` (Siklus Musim Pangan: April–Desember)
4. **Metode Integrasi yang Direkomendasikan**:
   - Menambahkan tab ke-7 di `/dashboard/klimatologi`: **"Satelit CHC Early Estimates"** (atau **"Prakiraan CHIRPS Asia Tenggara"**).
   - Membangun komponen antarmuka pemantau interaktif (mirip dengan arsitektur `EcmwfAerosolViewer` pada modul Kualitas Udara atau `NcicsMapViewer` pada Climate Drivers).
   - Menyediakan pemilih parameter (*metric selector*):
     - **Total Akumulasi Presipitasi (mm)**
     - **Anomali Curah Hujan (mm)**
     - **Persentase Terhadap Normal (% of Average)**
     - **Indeks Kekeringan SPI (*Standardized Precipitation Index*)**
     - **Persentil / Peringkat Historis (*Historical Rank*)**
   - Menyediakan pemilih jendela waktu (*moving windows & seasonal modes*):
     - 10 Hari (+Prakiraan 15 Hari)
     - 30 Hari (+Prakiraan 15 Hari)
     - 60 Hari (+Prakiraan 15 Hari)
     - 90 Hari (+Prakiraan 15 Hari)
     - Musiman (Okt–Jan, Des–Mei, Apr–Des)
   - Fitur pelengkap: Zoom/Fullscreen modal, download citra resolusi tinggi, dan tautan langsung ke Early Warning Explorer (EWX) & repositori data CHC.

---

## 2. Rencana Arsitektur & Perubahan Kode

### File yang akan dibuat/diubah:
1. **Komponen Baru**: `components/climatology/ChcEarlyEstimatesViewer.tsx`
   - UI Card interaktif dengan preview gambar peta CHC resolusi tinggi.
   - Pilihan jenis metrik (Total, Anomali, % Normal, SPI, Ranking).
   - Pilihan jendela pentad dan periode musiman.
   - Indikator status pembaharuan tanggal dari header CHC.
2. **Update Halaman**: `app/dashboard/klimatologi/page.tsx`
   - Menambahkan opsi `"chc-estimates"` pada daftar `mainTab`.
   - Menambahkan `<TabsTrigger value="chc-estimates">` pada navbar tab klimatologi.
   - Menambahkan `<TabsContent value="chc-estimates">` yang memuat `<ChcEarlyEstimatesViewer />`.
