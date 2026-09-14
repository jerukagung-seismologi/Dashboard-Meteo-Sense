# Learning Proposal: Konsep Iklim & Analisis Nilai Ekstrem Klimatologis (ERA5 & Stasiun)

## 1. Identifikasi Hal yang Dipelajari (What to Learn)

### A. Apa Itu Iklim vs Cuaca (Definisi Ilmiah WMO & BMKG)
- **Cuaca (*Weather*)**: Keadaan atmosfer sesaat atau jangka pendek (skala jam hingga harian) pada wilayah tertentu yang ditandai oleh fluktuasi cepat parameter seperti suhu, angin, dan hujan.
- **Iklim (*Climate*)**: Sintesis, nilai rata-rata, variabilitas, dan **perilaku ekstremitas** dari unsur-unsur cuaca dalam periode waktu yang panjang (umumnya minimal 10–30 tahun, atau reanalisis multi-tahun seperti ERA5).
- **Skala Waktu Klimatologi**: Dalam sains klimatologi operasional (BMKG & WMO), analisis iklim **tidak menggunakan pilihan data harian sesaat**, melainkan skala waktu agregasi klimatologis:
  1. **Dasarian (10-Harian)**: Satuan dasar analisis iklim di Indonesia (3 dasarian per bulan, 36 dasarian per tahun).
  2. **Bulanan Kalender**: Menilai karakteristik iklim bulanan dan variasi musiman (Monsoon/ITCZ).
  3. **Tahunan Kalender / Multi-Tahun**: Menilai tren tahunan, anomali iklim, dan siklus multi-dekade.

### B. Fokus Utama Analisis Klimatologi: Pencarian Nilai Ekstrem (*Climate Extremes*)
Klimatologi modern tidak hanya mengkaji rata-rata (*mean/normals*), melainkan berfokus utama pada **Nilai-Nilai Ekstrem** karena kejadian ekstrem inilah yang berdampak kritis terhadap bencana hidrometeorologi, keselamatan publik, dan ketahanan pangan:
1. **Ekstrem Suhu Udara**:
   - Suhu Maksimum Absolut ($T_{max}$ Rekor Tertinggi) & tanggal kejadian.
   - Suhu Minimum Absolut ($T_{min}$ Rekor Terendah) & tanggal kejadian.
   - Hari-hari Panas Ekstrem (ambang batas BMKG $>35^\circ$C).
   - Rentang Suhu Diurnal Ekstrem ($DTR = T_{max} - T_{min}$).
2. **Ekstrem Curah Hujan**:
   - Curah Hujan Harian Maksimum ($Rx1day$) & rekor tanggal kejadian.
   - Klasifikasi BMKG: Hujan Lebat (50–100 mm/hari), Sangat Lebat (100–150 mm/hari), Hujan Ekstrem ($>150$ mm/hari).
   - Indeks Hari Kering Berturut-turut (*Consecutive Dry Days* - CDD) & Hari Basah (*Consecutive Wet Days* - CWD).
3. **Ekstrem Tekanan Udara & Angin**:
   - Tekanan Permukaan Terendah ($P_{min}$) penanda sistem depresi / bibit siklon tropis.
   - Kecepatan Angin Puncak & Hembusan Ekstrem (*Wind Gust Max*).
4. **Ekstrem Kelembaban Udara**:
   - Kelembaban Minimum Ekstrem ($RH_{min}$) penanda kekeringan udara ekstrem.

### C. Konsep Desain: Modul Klimatologi Sebagai Gabungan Reanalisis ERA5 untuk Nilai Ekstrem
- Membatasi filter waktu pada **Dasarian, Bulanan, dan Tahunan** (meniadakan pilihan harian).
- Mengintegrasikan komputasi nilai ekstrem dari dataset ERA5 reanalysis resolusi tinggi (ECMWF ERA5-Land 9 km) dengan data observasi stasiun AWS.
- Menyajikan KPI Card Rekor Ekstrem, garis batas ambang bahaya ekstrem (*extreme warning thresholds*), dan tabel kejadian ekstrem pada setiap parameter.

## 2. Klasifikasi (Rule vs Skill)
- **Klasifikasi**: *Domain Knowledge & Design Rule* untuk Modul Klimatologi di Meteo Sense.
- **Batasan**:
  - Filter waktu halaman `/dashboard/klimatologi` hanya menyediakan: `dasarian`, `monthly`, dan `yearly`.
  - Tiap sub-menu wajib menyajikan statistik nilai ekstrem (Min, Maks, Rekor Kejadian, Ambang Batas Ekstrem).

## 3. Rencana Aksi Implementasi
1. Perbarui `PresetSelector.tsx` untuk menghapus opsi `daily` dan `weekly`.
2. Perbarui `app/dashboard/klimatologi/page.tsx` default preset ke `monthly`.
3. Bangun modul komputasi nilai ekstrem stasiun & ERA5.
4. Tampilkan Kartu Rekor Nilai Ekstrem (Suhu Tx/Tn, Hujan Rx, Tekanan Pmin, Angin Gust) dan garis ambang batas ekstrem pada grafik.
