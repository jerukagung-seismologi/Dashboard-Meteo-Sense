# Walkthrough: Perapihan UI Halaman Kalibrasi & Validasi Bias (`/dashboard/kalibrasi`)

Telah dilakukan audit menyeluruh dan perapihan layout pada seluruh komponen di halaman **Kalibrasi & Validasi Bias** untuk menyelesaikan inkonsistensi visual, text-wrapping yang berantakan, serta beban visual (*visual clutter*) yang sebelumnya membuat tampilan terasa anomali.

---

## Ringkasan Perbaikan UI

### 1. Navigasi Tab Utama (`TabsList`)
- **Masalah Sebelumnya**: Lebar kontainer dibatasi `max-w-2xl` (672px) untuk 3 tab dengan teks panjang dan badge status. Hal ini menyebabkan teks tab 3 (`3. Parameter Sensor Aktif (Firestore)`) terpotong atau turun ke baris baru secara canggung di layar monitor standar.
- **Solusi**:
  - Kontainer diperluas ke `max-w-4xl` dengan padding `p-1.5` dan rounded corners yang proporsional.
  - Teks disederhanakan dan diperkaya ikon:
    - **1. Validasi & Komparasi Bias** (`Layers` biru)
    - **2. Model Kalibrasi & Leaderboard** (`Trophy` indigo)
    - **3. Parameter Sensor Aktif** (`Settings2` emerald)
  - Badge draf staging (`{count} Draf`) diposisikan sebagai pill beranimasi pulse yang rapi tanpa memicu wrap baris.

---

### 2. Bar Kontrol Global (Filter Bar)
- **Masalah Sebelumnya**: Pada grid 4-kolom kontrol kalibrasi, kontrol ke-4 (*Split Rasio Kalibrasi*) hanya berupa slider `<input type="range">` setinggi `h-1.5` tanpa bingkai atau kontainer. Hal ini menyebabkan kolom ke-4 tampak mengambang dan tidak sejajar dengan ketiga `SelectTrigger` setinggi `h-9`.
- **Solusi**:
  - Slider rasio kalibrasi dibungkus dalam kontainer berukuran `h-9` dengan border `border-slate-200 dark:border-slate-800` dan background halus yang serasi dengan dropdown input.
  - Label rasio dilengkapi pill persentase kontras: `70% Train / 30% Test`.
  - Semua 4 kontrol memiliki tinggi vertikal, margin, dan keselarasan garis dasar (*baseline alignment*) yang 100% konsisten.

---

### 3. Sub-Tab Visualisasi Analitis (Tab 1)
- **Masalah Sebelumnya**: Sub-tab 5 grafik visualisasi menggunakan `grid-cols-2 sm:grid-cols-5`. Pada layar ponsel/tablet kecil, item ke-5 berada sendirian di baris ke-3.
- **Solusi**:
  - Dikonfigurasi ulang menjadi `flex flex-wrap sm:grid sm:grid-cols-5 gap-1 p-1` dengan background pill yang dinamis.
  - Setiap sub-tab dilengkapi ikon representatif:
    - **Deret Waktu** (`BarChart3`)
    - **Siklus Diurnal** (`Layers`)
    - **Scatter 1:1** (`ScatterChart`)
    - **Distribusi ECDF** (`BarChart3`)
    - **Residual Error** (`SlidersHorizontal`)

---

### 4. Inspeksi Parameter Model Matematika (Tab 2)
- **Masalah Sebelumnya**: Parameter hasil regresi/fitting kalibrasi ditampilkan sebagai teks mentah `<pre>{JSON.stringify(...)}</pre>` yang terlihat seperti debug output belum jadi.
- **Solusi**:
  - Dibuat komponen baru: [ModelParameterInspector.tsx](file:///d:/Github/Dashboard-Meteo-Sense/components/calibration/ModelParameterInspector.tsx).
  - **Banner Persamaan Matematis**: Menampilkan formula matematis sesuai metode (misal: $y = a\cdot x^2 + b\cdot x + c$, $y = m\cdot x + c$, dll.) beserta penjelasan fisika/statistika.
  - **Grid Kartu Metrik**: Parameter individual (Koefisien Kuadratik $a$, Linier $b$, Intercept $c$, Slope $m$, Offset, dll.) disajikan dalam kartu metrik terformat 4 desimal dengan unit yang tepat.
  - **Metadata Audit**: Menampilkan jumlah sampel training ($N_{train}$), sampel validasi ($N_{val}$), dan rasio split dataset.
  - **Collapsible Raw JSON**: Menu dropdown terlipat rapi untuk kebutuhan pengembang atau audit teknis, lengkap dengan tombol *Salin JSON*.

---

### 5. Pengorganisasian 11 Parameter Sensor Aktif (Tab 3)
- **Masalah Sebelumnya**: 11 kartu parameter sensor dirender sekaligus dalam 3-kolom grid tanpa pengelompokan. Sensor yang tidak dikalibrasi (bypass) tetap menampilkan dropdown dan form input abu-abu yang membuat layar penuh dan membingungkan (*information overload*).
- **Solusi pada [ActiveSensorManager.tsx](file:///d:/Github/Dashboard-Meteo-Sense/components/calibration/ActiveSensorManager.tsx)**:
  - **Penggantian 11 Kartu Menjadi Tabel Matriks Sensor Ringkas**:
    - Menggantikan grid 11 kartu besar yang membingungkan dengan **1 Tabel Matriks Parameter** yang elegan, ringkas, dan langsung terlihat dalam satu layar.
    - Kolom tabel mencakup:
      1. **Parameter Sensor**: Nama lengkap, key sensor, dan satuan.
      2. **Status**: Badge status (`Draft Staging`, `Aktif di Firestore`, atau `Bypass Mentah`).
      3. **Metode Koreksi**: Nama algoritma kalibrasi yang aktif (e.g. `Robust Linear (Huber)`, `Scale + Offset (OLS)`).
      4. **Formula / Transformasi**: Persamaan matematis singkat yang terformat rapi (misal: `y = 1.024·x - 2.137`).
      5. **Pratinjau & Aksi**:
         - Switch on/off langsung untuk toggle kalibrasi vs bypass mentah.
         - Tombol `[👁️ Kurva]` untuk langsung memfokuskan grafik kurva respons live.
         - Tombol `[⚙️ Edit]` yang membuka modal dialog bersih untuk teknisi yang ingin melakukan kalibrasi manual (misal sensor voltase baterai).
         - Tombol `[Batal]` untuk membatalkan draft variabel tunggal.
  - **Pencarian & Filter Cepat**: Dilengkapi switch filter *"Hanya Aktif & Draf"* dan search input instan.
  - **Dukungan Dark Mode**: Grafik [CalibrationPreviewChart.tsx](file:///d:/Github/Dashboard-Meteo-Sense/components/calibration/CalibrationPreviewChart.tsx) mendeteksi mode gelap untuk warna grid, sumbu, dan latar belakang tooltip.

---

## Verifikasi Teknis

1. **Validasi Kompilasi & HTTP Response**:
   - `GET /dashboard/kalibrasi` $\to$ **HTTP 200**
   - `GET /dashboard/kalibrasi?tab=validation` $\to$ **HTTP 200**
   - `GET /dashboard/kalibrasi?tab=model-calibration` $\to$ **HTTP 200**
   - `GET /dashboard/kalibrasi?tab=sensor-settings` $\to$ **HTTP 200**
2. **Type Check**:
   - Seluruh modul kalibrasi (`page.tsx`, `ActiveSensorManager.tsx`, `CalibrationPreviewChart.tsx`, `ModelParameterInspector.tsx`, `CalibrationParameterSaveCard.tsx`, `calibrationTypes.ts`) lulus pemeriksaan TypeScript tanpa error.
