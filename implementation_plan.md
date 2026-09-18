# Rencana Implementasi: Transformasi Halaman Analisis Klimatologi Berstandar WMO & BMKG

Dokumen ini merinci rencana peningkatan menyeluruh halaman **Analisis Klimatologi** (`app/dashboard/klimatologi/page.tsx`) agar berpijak kokoh pada **sudut pandang sains klimatologi modern**, mengadopsi standar **WMO (World Meteorological Organization No. 1203 & WMO No. 100)** serta pedoman operasional **BMKG**.

---

## 1. Latar Belakang & Identifikasi Kesenjangan

Meskipun halaman Analisis Klimatologi saat ini sudah memiliki integrasi stasiun sensor dan reanalisis ERA5, terdapat beberapa keterbatasan mendasar dari perspektif sains iklim:
1. **Normalitas Iklim**: Acuan "normal" dihitung dari data 1 tahun sebelumnya (bukan periode standar WMO 30-tahun: 1991–2020).
2. **Ketiadaan Tipe Iklim Wilayah**: Belum ada klasifikasi baku seperti Oldeman (pola tanam pangan) atau Schmidt-Ferguson (kehutanan & tata air).
3. **Ketiadaan Diagram Walter-Lieth**: Diagram iklim universal yang menampilkan masa arid (kering) vs humid (basah) belum tersedia.
4. **Indeks Ekstrem WMO (ETCCDI)**: Belum mencakup indeks inti seperti RX1day, RX5day, SDII, R10/20/50mm, dan R95p.
5. **Indeks Kekeringan Standar (SPI)**: Belum ada perhitungan Standardized Precipitation Index untuk skala 1, 3, dan 6 bulan.
6. **Zona Musim (ZOM BMKG)**: Belum ada tracking kalender 36 dasarian untuk penentuan Awal Musim Hujan (AMH) dan Kemarau (AMK).

---

## 2. Arsitektur Teknis yang Diusulkan

### A. Core Computation Engines (`lib/climatology/`)
1. `climateClassification.ts`:
   - **Klasifikasi Oldeman (1975)**: Menghitung Bulan Basah (BB > 200 mm), Bulan Lembap (BL 100-200 mm), Bulan Kering (BK < 100 mm). Menghasilkan Zona (A s/d E) dan Sub-tipe (1 s/d 4) serta rekomendasi pola tanam.
   - **Klasifikasi Schmidt-Ferguson (1951)**: Menghitung nilai $Q = \frac{\sum BK}{\sum BB} \times 100\%$ berdasarkan kriteria Mohr. Menghasilkan tipe A (Sangat Basah) s/d H (Luar Biasa Kering).
   - **Klasifikasi Köppen-Geiger**: Menentukan zona tropis (Af, Am, Aw).
2. `wmoNormals.ts`:
   - Mengambil dan mengompilasi **Normal Klimatologis 30-Tahun (1991–2020)** untuk koordinat stasiun.
   - Menyediakan baseline bulanan (12 bulan) dan dasarian (36 dasarian) untuk suhu, curah hujan, dan hari hujan.
3. `spiCalculator.ts`:
   - Menghitung **Standardized Precipitation Index (SPI-1, SPI-3, SPI-6)** dengan fitting distribusi gamma/empiris standar WMO.
4. `climateExtremes.ts`:
   - Diperluas dengan indeks **ETCCDI**: RX1day, RX5day, SDII, R10mm, R20mm, R50mm, R95p, R99p, SU35, DTR.

### B. Backend API Route
* `app/api/climatology/normals/route.ts`:
  - Menerima parameter `lat` dan `lng`.
  - Mengembalikan objek profil iklim 30-tahun lengkap: Normal WMO 1991–2020, Klasifikasi Iklim, Data Walter-Lieth, dan Statistik Historis.

### C. Komponen Visualisasi Baru (`components/climatology/`)
1. `ClimateClassificationCard.tsx`: Kartu interaktif klasifikasi Oldeman, Schmidt-Ferguson, dan Köppen beserta narasi agroekologis.
2. `WalterLiethClimograph.tsx`: Diagram Walter-Lieth ECharts dengan rasio 1°C = 2 mm/bulan, arsiran periode arid/humid, dan ringkasan $T_{ann}$ & $P_{ann}$.
3. `EtccdiExtremesSection.tsx`: Dashboard ringkas 10 indeks ekstrem iklim inti WMO/ETCCDI.
4. `SpiDroughtSection.tsx`: Grafik batang interaktif pemantauan kekeringan SPI (SPI-1, SPI-3, SPI-6).
5. `ZomDynamicsSection.tsx`: Kalender 36 dasarian, Awal Musim Hujan (AMH), Awal Musim Kemarau (AMK), dan panjang musim.

### D. Penataan Ulang Tab Halaman (`app/dashboard/klimatologi/page.tsx`)
Mengorganisasi halaman menjadi alur analisis iklim yang logis:
- **Tab 1: Profil & Klasifikasi Iklim** (Klasifikasi Oldeman, Schmidt-Ferguson, Köppen, Diagram Walter-Lieth).
- **Tab 2: Statistik Stasiun & Normal 30-Tahun** (Observasi sensor vs Normal WMO 1991–2020 & Sifat Hujan BMKG).
- **Tab 3: Indeks Ekstrem WMO & Kekeringan SPI** (10 Indeks ETCCDI & Indeks SPI-1/3/6).
- **Tab 4: Zona Musim (ZOM) & Dasarian** (Dinamika 36 dasarian, AMH, AMK).
- **Tab 5: Agroklimatologi & Neraca Air** (Neraca air lahan, profil tanah, dan ensemble ECMWF & WeatherNext 2 AI).
- **Tab 6: Reanalisis Atmosfer Global (ERA5)** (Diurnal, Hovmöller, Wind Rose).

---

## 3. Rencana Pengujian (Verification Plan)
- Menjalankan endpoint `/api/climatology/normals` dengan koordinat stasiun lokal dan memvalidasi JSON output.
- Melakukan verifikasi kompilasi TypeScript (`npx tsc --noEmit`).
- Membuka halaman `/dashboard/klimatologi` di browser untuk memvalidasi interaktivitas grafik Walter-Lieth, SPI, dan tampilan klasifikasi iklim.
