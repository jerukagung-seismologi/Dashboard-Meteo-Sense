# Rencana Implementasi: Integrasi Chart Klimatologis Berbasis ERA5 pada Dashboard Klimatologi

Dokumen ini memaparkan rencana teknis untuk menambahkan visualisasi dan analisis **Normal Klimatologis (ERA5 Reanalysis)** pada halaman **[Meteo Sense - Analisis Klimatologi](http://localhost:3000/dashboard/klimatologi)**.

---

## 1. Latar Belakang & Analisis Kebutuhan

Saat ini, halaman `/dashboard/klimatologi`:
- Menampilkan data observasi stasiun AWS (sensor di lapangan) berdasarkan preset rentang waktu: *Mingguan, Dasarian, Bulanan, dan Tahunan*.
- Parameter yang dianalisis: *Suhu Udara, Titik Embun, Kelembaban Relatif, Curah Hujan, dan Tekanan Udara*.
- **Keterbatasan Saat Ini**: Belum memiliki acuan data **Normal Klimatologis** (climatological baseline). Tanpa acuan normal iklim (misal rata-rata historis jangka panjang / multi-year reanalysis ERA5), analis cuaca/iklim tidak dapat membandingkan apakah nilai yang tercatat di stasiun saat ini berada di atas normal (*above normal*), normal, atau di bawah normal (*below normal*).

### Solusi yang Diusulkan:
1. Memanfaatkan dataset **ERA5 Reanalysis (ECMWF ERA5-Land 9 km)** yang telah terintegrasi di API `/api/reanalysis/data` dan SQLite lokal `era5_data.db`.
2. Mengambil koordinat stasiun (latitude & longitude) dari perangkat terpilih (`fetchAllDevices`) secara otomatis.
3. Menambahkan chart klimatologis interaktif berbasis **Apache ECharts** yang menyediakan:
   - **Profil Normal Klimatologis 12-Bulan (Januari – Desember)**: Menampilkan kurva Min, Rerata, dan Maksimum untuk Suhu, Kelembaban, Tekanan, serta Akumulasi Hujan Normal per bulan.
   - **Siklus Diurnal Klimatologis 24-Jam (00:00 – 23:00 WIB)**: Menampilkan osilasi diurnal tipikal harian untuk Suhu vs Kelembaban dan Tekanan.
   - **Perbandingan Observasi Stasiun vs Normal ERA5**: Visualisasi komparatif deviasi/anomali data observasi sensor terhadap normal iklim wilayah tersebut.

---

## 2. Perubahan Teknis yang Direncanakan

### A. Komponen Baru: `components/climatology/Era5ClimatologyCharts.tsx`
Komponen visualisasi berbasis Apache ECharts (`echarts-for-react`) yang responsif, mendukung tema terang/gelap, dan memiliki kontrol interaktif:
1. **Sub-Navigasi Parameter**:
   - Suhu Udara (°C)
   - Kelembaban Relatif (%)
   - Tekanan Udara (hPa)
   - Curah Hujan Bulanan (mm)
2. **Dua Mode Tampilan**:
   - **Profil 12-Bulan (Siklus Tahunan)**: Kurva variasi bulanan (Jan–Des) dengan batas ekstrem min, rata-rata, dan maks, serta perbandingan dengan observasi sensor aktual stasiun (jika tersedia).
   - **Siklus Diurnal 24-Jam**: Pola rata-rata per jam sepanjang hari (00:00 – 23:00 WIB) yang memperlihatkan dinamika puncak panas siang hari dan inversi kelembaban dini hari.
3. **Statistik Indikator Iklim ERA5**:
   - Kartu metrik: Rata-rata Normal Tahunan, Rentang Suhu Ekstrem, Estimasi Total Hujan Tahunan, Koordinat Grid & Elevasi Model.
4. **Standar Chart**:
   - Sumbu Y dinamis dengan nilai minimal dan maksimal berbasis data serta pembulatan 2 desimal (mengikuti preferensi pengguna sebelumnya).
   - Tooltip informatif dengan penanda warna dan unit satuan BMKG/WMO.

### B. Pembaruan Halaman: `app/dashboard/klimatologi/page.tsx`
1. **Penyimpanan Koordinat Stasiun**:
   - Perbarui tipe data `DeviceOption` agar menyimpan `coordinates: { lat: number; lng: number }` dan `location?: string`.
   - Ketika pengguna memilih stasiun, koordinat otomatis terdeteksi. Fallback aman ke koordinat AWS Jerukagung (`lat: -7.5361, lng: 110.2312`) bila koordinat perangkat belum tersetting.
2. **Integrasi Query SWR ke `/api/reanalysis/data`**:
   - Mengambil data reanalisis ERA5 untuk koordinat stasiun yang dipilih.
3. **Pembaruan Tabs Navigasi**:
   - Tambahkan Tab ke-6: `<TabsTrigger value="era5_climatology">Normal Klimatologis (ERA5)</TabsTrigger>`.
   - Pasang komponen `Era5ClimatologyCharts` di dalam `TabsContent value="era5_climatology"`.
   - Sediakan badge koordinat dan indikator model reanalisis (ECMWF ERA5-Land 9 km).

---

## 3. Rencana Verifikasi & Pengujian

### A. Pengujian Fungsional
1. **Pengecekan Fetch ERA5**:
   - Memastikan endpoint `/api/reanalysis/data` merespons dengan sukses untuk koordinat stasiun yang dipilih.
   - Memastikan penanganan loading state dan fallback bila koneksi lambat.
2. **Interaktivitas Chart**:
   - Memastikan tab parameter (Suhu, Kelembaban, Tekanan, Curah Hujan) berganti dengan lancar tanpa lag.
   - Memastikan peralihan antara "Profil 12-Bulan" dan "Siklus Diurnal 24-Jam" merender chart ECharts yang akurat.
3. **Dukungan Dark Mode**:
   - Memastikan warna teks, grid, tooltip, dan kurva chart kontras dan nyaman dilihat di tema terang maupun gelap.
4. **Responsivitas**:
   - Menguji tampilan pada resolusi desktop, tablet, dan mobile.

### B. Pengujian Build & Linting
- Jalankan pemeriksaan tipe TypeScript / Next.js build (`npm run build`) untuk memastikan tidak ada type error.
