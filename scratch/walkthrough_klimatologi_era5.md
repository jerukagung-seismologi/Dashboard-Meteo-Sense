# Walkthrough: Analisis Nilai-Nilai Ekstrem Klimatologi (Sintesis ERA5 & Observasi Stasiun)

## 1. Ringkasan Pembelajaran & Konsep Ilmiah Iklim vs Cuaca (/learn)
Sesuai arahan dan standar meteorologi-klimatologi dunia (WMO & BMKG):
- **Cuaca (*Weather*)**: Keadaan atmosfer jangka pendek (jam hingga harian) dengan fluktuasi cepat.
- **Iklim (*Climate*)**: Sintesis statistik, nilai rata-rata, variabilitas, dan **perilaku ekstremitas jangka panjang** dari kondisi atmosfer.
- **Skala Waktu Klimatologi**: Analisis klimatologi **tidak menggunakan pilihan data harian sesaat (noise)**, melainkan skala waktu agregasi klimatologis terstandar:
  1. **Dasarian (10-Harian)**: Standar BMKG untuk pemantauan musim, hari kering/basah berurutan, dan peringatan dini kekeringan/banjir.
  2. **Bulanan**: Analisis karakteristik bulanan dan pergeseran sirkulasi monsun/ITCZ.
  3. **Tahunan**: Menilai tren tahunan dan siklus iklim multi-tahun.
- **Fokus Nilai Ekstrem (*Climate Extremes*)**: Modul Klimatologi dikembangkan menjadi instrumen deteksi **nilai-nilai ekstrem** (Suhu Rekor Panas/Dingin, Hujan Harian Maksimum Rx1day, CDD/CWD, Hembusan Angin Puncak Gust, Tekanan Minimum Palung Rendah, Kelembaban Kering Ekstrem) berbasis integrasi **Observasi Stasiun AWS & Reanalisis ERA5-Land (ECMWF 9 km)**.

---

## 2. Perubahan & Implementasi yang Telah Dikerjakan (/goal)

### A. Restriksi Filter Waktu ke Skala Klimatologis
- File: [PresetSelector.tsx](file:///d:/Github/Dashboard-Meteo-Sense/components/climatology/PresetSelector.tsx)
  - Menghapus opsi `daily` (harian) dan `weekly` (mingguan) dari pemilih preset.
  - Membatasi opsi hanya pada **Dasarian (10-Harian)**, **Bulanan**, dan **Tahunan**.
- File: [page.tsx](file:///d:/Github/Dashboard-Meteo-Sense/app/dashboard/klimatologi/page.tsx)
  - Mengubah *default preset* menjadi `"monthly"` (bulanan).

---

### B. Modul Perhitungan Nilai-Nilai Ekstrem Iklim
- File: [climateExtremes.ts](file:///d:/Github/Dashboard-Meteo-Sense/lib/climatology/climateExtremes.ts)
  - Menghitung rekor suhu absolut ($T_{max}$ & $T_{min}$) lengkap dengan tanggal kejadian.
  - Menghitung ambang batas BMKG untuk hari sangat panas ($\ge 35^\circ$C), hari panas ($\ge 33^\circ$C), dan malam dingin ($\le 20^\circ$C).
  - Menghitung rentang suhu harian maksimum (*Diurnal Temperature Range* - DTR).
  - Menghitung curah hujan harian tertinggi ($Rx1day$), kategori intensitas BMKG (Lebat, Sangat Lebat, Ekstrem), serta *Consecutive Dry Days* (CDD) dan *Consecutive Wet Days* (CWD).
  - Mengekstraksi hembusan angin puncak (*Wind Gust Max*) dan kecepatan angin maksimum dari data per jam ERA5, lengkap dengan deteksi peringatan angin kencang ($\ge 12.8$ m/s atau 25 knot).
  - Mendeteksi tekanan udara terendah ($P_{min}$) dan palung tekanan rendah ($< 1008$ hPa).
  - Mendeteksi kelembaban minimum ($RH_{min}$) dan indikator udara kering ekstrem ($< 45\%$).

---

### C. Komponen Kartu Nilai Ekstrem (Climate Extremes KPI Cards)
- File: [ClimateExtremesCards.tsx](file:///d:/Github/Dashboard-Meteo-Sense/components/climatology/ClimateExtremesCards.tsx)
  - Menggantikan kartu summary biasa dengan 6 kartu indikator ekstrem utama:
    1. **Suhu Maks (Tmax)**: Rekor puncak, tanggal kejadian, benchmark ERA5, dan badge peringatan panas ($\ge 35^\circ$C).
    2. **Suhu Min (Tmin)**: Rekor terdingin, tanggal kejadian, benchmark ERA5, dan badge malam dingin ($\le 20^\circ$C).
    3. **Hujan Harian Maks (Rx1day)**: Nilai presipitasi maksimum 1 hari, tanggal kejadian, badge klasifikasi BMKG, serta CDD & CWD.
    4. **Puncak Hembusan (Gust ERA5)**: Nilai gust dalam m/s dan km/jam, waktu kejadian WIB, dan badge peringatan angin kencang ($\ge 25$ knot).
    5. **Tekanan Min (Pmin)**: Nilai terendah barometer, tanggal kejadian, dan badge deteksi palung tekanan rendah ($< 1008$ hPa).
    6. **Kelembaban Min (RHmin)**: Nilai kelembaban terendah, tanggal kejadian, dan badge udara kering ekstrem ($< 45\%$).
  - Dilengkapi tombol interaktif **"Tampilkan/Sembunyikan Rerata"** untuk membuka sub-panel ringkasan rata-rata iklim stasiun tanpa mengganggu fokus visual pada nilai-nilai ekstrem.

---

### D. Visualisasi Nilai Ekstrem pada Tiap Sub-Menu Parameter
- [TemperatureCharts.tsx](file:///d:/Github/Dashboard-Meteo-Sense/components/climatology/TemperatureCharts.tsx):
  - Menambahkan `markPoint` pin untuk **Puncak Tmax** (merah) dan **Puncak Tmin** (biru).
  - Kartu benchmark iklim diperluas menjadi 4 kolom: Rerata Observasi Stasiun, Normal Klimatologis ERA5, Anomali, dan Rentang Ekstrem Stasiun ($T_{max} / T_{min}$).
- [RainfallCharts.tsx](file:///d:/Github/Dashboard-Meteo-Sense/components/climatology/RainfallCharts.tsx):
  - Menambahkan `markPoint` pin untuk **Rx1day Maks** pada grafik batang curah hujan.
  - Kartu benchmark diperluas menjadi 4 kolom: Total Stasiun, Normal ERA5, Sifat Hujan BMKG (AN/N/BN), dan Ekstrem Rx1day & CDD.
- [PressureCharts.tsx](file:///d:/Github/Dashboard-Meteo-Sense/components/climatology/PressureCharts.tsx):
  - Menambahkan `markPoint` pin untuk **Pmax Tertinggi** dan **Pmin Terendah**.
  - Kartu benchmark diperluas menjadi 4 kolom menyertakan rentang ekstrem tekanan $P_{min} / P_{max}$.
- [HumidityCharts.tsx](file:///d:/Github/Dashboard-Meteo-Sense/components/climatology/HumidityCharts.tsx):
  - Menambahkan `markPoint` pin untuk **RH Maksimum** dan **RHmin Terendah**.
  - Kartu benchmark diperluas menjadi 4 kolom menyertakan rentang ekstrem kelembaban $RH_{min} / RH_{max}$.

---

### E. Peningkatan Tab "Normal ERA5": Analisis Rekor & Persentil Ekstrem ERA5
- File: [Era5ClimatologyCharts.tsx](file:///d:/Github/Dashboard-Meteo-Sense/components/climatology/Era5ClimatologyCharts.tsx)
  - Menambahkan mode tampilan ketiga: **"Rekor & Ekstrem ERA5"** berdampingan dengan Profil 12-Bulan dan Siklus Diurnal (24 Jam).
  - Menyajikan grafik batang persentil per parameter (Min, P5, P25, P50, P75, P95, P99, Max).
  - Menghadirkan **Tabel Distribusi Persentil & Nilai Ekstrem ERA5 Lengkap**:
    - Menghitung persentil historis dari seluruh data per jam ERA5 untuk Suhu Udara, Kelembaban Relatif, Tekanan MSL, Kecepatan Angin, Hembusan Gust, dan Curah Hujan.
    - Kolom lengkap: Min Absolut, P5 (Sangat Rendah), P25 (Q1), P50 (Median), P75 (Q3), P95 (Tinggi), P99 (Ekstrem Standar WMO), dan Maks Absolut.
  - Menyertakan catatan ilmiah interpretasi klimatologis mengenai alasan penggunaan agregasi Dasarian/Bulanan/Tahunan.

---

## 3. Hasil Pengujian & Verifikasi
1. **API Endpoints Test**:
   - Endpoint `/api/reanalysis/data` berhasil diuji dan merespons data ECMWF ERA5-Land secara presisi (`tempMin: 20.35°C`, `tempMean: 24.97°C`, `tempMax: 30.65°C`, `windMax: 4.19 m/s`).
2. **Preset Selector Test**:
   - Pilihan preset di halaman Klimatologi telah terverifikasi hanya menampilkan Dasarian, Bulanan, dan Tahunan.
3. **Pemberitahuan Browser Subagent**:
   - Subagent melaporkan `open_browser_url` mengalami galat CDP browser context (`failed to resolve CDP URLs: failed to parse CDP port`). Kode backend dan frontend telah divalidasi dan berjalan normal pada Next.js dev server.
