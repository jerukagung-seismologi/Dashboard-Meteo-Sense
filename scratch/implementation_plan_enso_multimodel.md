# Implementation Plan: Multi-Model Global Climate Plume & Chart Responsiveness Fix

Investigasi dan pembenahan komprehensif pada halaman [ENSO (El Niño - Southern Oscillation)](https://meteo.jeris.web.id/dashboard/climate-drivers/enso) untuk mengatasi chart error, masalah responsivitas, dan memperluas Ensemble Plume agar mendukung multi-model global (ECMWF SEAS5, NOAA NCEP CFSv2, UKMO GloSea6, BOM ACCESS-S2, JMA CPS3, Météo-France System 8, serta Multi-Model Ensemble MME Consensus).

---

## 1. Analisis Akar Masalah (Root Cause Analysis)

### A. Chart Error & Unresponsiveness saat Berganti Tampilan
1. **Penyebab Utama (ECharts Option Collision)**:
   - Pada [ENSOForecastSection.tsx](file:///d:/Github/Dashboard-Meteo-Sense/components/climate-drivers/ENSOForecastSection.tsx), peralihan antara `viewMode === "plume"` (grafik garis dengan 54+ series: 51 garis ensemble member, pita confidence interval P25-P75, dan garis mean) dan `viewMode === "prob"` (grafik batang bertumpuk dengan 3 series) menggunakan komponen `<ReactECharts />` yang sama tanpa prop `notMerge={true}` dan tanpa `key`.
   - Secara default, library `echarts-for-react` menyetel `notMerge: false`. Akibatnya, ECharts mencoba menggabungkan (*deep merge*) opsi grafik batang baru ke instance grafik garis yang lama. Ini memicu tabrakan internal (`TypeError: Cannot read properties of undefined` saat rendering series) dan menyebabkan canvas macet/tidak responsif.
2. **Tidak Ada Listener Resize**:
   - Baik di [ENSOForecastSection.tsx](file:///d:/Github/Dashboard-Meteo-Sense/components/climate-drivers/ENSOForecastSection.tsx) maupun [ENSOCharts.tsx](file:///d:/Github/Dashboard-Meteo-Sense/components/climate-drivers/ENSOCharts.tsx), tidak ada pemanggilan `chart.resize()` saat ukuran layar berubah, navigasi tab, atau perubahan tema dark/light mode. Hal ini menyebabkan grafik tampak mengecil, terpotong, atau tidak mengisi kontainer.

### B. Keterbatasan Ensemble Plume Sebelumnya
1. **Hanya Bersumber dari 1 Model (ECMWF SEAS5)**:
   - Endpoint `/api/climate-drivers/enso/forecast` sebelumnya hanya memanggil Open-Meteo Seasonal API yang hanya menyediakan data dari **ECMWF SEAS5**.
   - Pengguna sering mengasumsikan data tersebut adalah ERA5 (reanalisis), padahal prediksi musiman ENSO membutuhkan **prediksi dinamis multi-model berjangka 6-7 bulan ke depan**.
   - Standar operasional WMO, NOAA Climate Prediction Center (CPC), dan Columbia IRI mewajibkan konsensus dari berbagai pusat iklim dunia (Multi-Model Ensemble / MME) untuk mereduksi ketidakpastian iklim.

---

## 2. Rencana Arsitektur & Perubahan

### A. Backend API: Multi-Model Global Climate Forecast Engine
**Berkas**: [app/api/climate-drivers/enso/forecast/route.ts](file:///d:/Github/Dashboard-Meteo-Sense/app/api/climate-drivers/enso/forecast/route.ts)
- Tambahkan parameter query `model` (`mme` | `ecmwf` | `cfs` | `ukmo` | `bom` | `jma` | `meteo_france` | `compare`).
- Bangun dataset multi-model global berstandar WMO:
  1. **ECMWF SEAS5** (Eropa - 51 ensemble members)
  2. **NOAA NCEP CFSv2** (Amerika Serikat - 24 ensemble members)
  3. **UKMO GloSea6** (Inggris - 42 ensemble members)
  4. **BOM ACCESS-S2** (Australia - 33 ensemble members)
  5. **JMA CPS3** (Jepang - 30 ensemble members)
  6. **Météo-France System 8** (Prancis - 51 ensemble members)
  7. **Multi-Model Ensemble (MME) Consensus** (Rata-rata tertimbang gabungan seluruh model global)
- Tambahkan data `allModelsComparison` dalam response JSON yang berisi trajektori rerata anomali per bulan dari setiap model global, sehingga pengguna dapat membandingkan seluruh model dalam 1 kurva.

### B. Tipe Data TypeScript
**Berkas**: [lib/climate-drivers/types.ts](file:///d:/Github/Dashboard-Meteo-Sense/lib/climate-drivers/types.ts)
- Perbarui antarmuka `EnsoForecastData` untuk menyertakan `selectedModel`, `availableModels`, dan `allModelsComparison`.

### C. Frontend UI: [ENSOForecastSection.tsx](file:///d:/Github/Dashboard-Meteo-Sense/components/climate-drivers/ENSOForecastSection.tsx)
- Tambahkan selektor model interaktif:
  - Tombol pill / dropdown pilihan model (MME Konsensus, ECMWF, NOAA CFSv2, UKMO, BOM, JMA, Météo-France).
- Tambahkan 3 Mode Tampilan (*View Modes*):
  1. **Ensemble Plume (Anggota Ensemble)**: Plume 51+ anggota dengan pita keyakinan P25-P75 dan P10-P90.
  2. **Bandingkan Model Global (Multi-Model Comparison)**: Seluruh garis rerata model dunia digambar bersamaan dalam 1 grafik dengan warna khas tiap lembaga iklim, batas ambang El Niño (+0.5°C), dan La Niña (-0.5°C).
  3. **Probabilitas Fase (Stacked Bar Chart)**: Persentase kemungkinan El Niño, Netral, dan La Niña per musim.
- **Perbaiki Bug ECharts**:
  - Gunakan `key={`${selectedModel}-${viewMode}-${selectedRegion}-${isDarkMode}`}` agar React selalu melakukan *clean remount* tanpa tabrakan opsi.
  - Tambahkan `notMerge={true}` dan `lazyUpdate={true}`.
  - Pasang `ResizeObserver` dan listener `window.addEventListener("resize")` yang memicu `chartInstance.resize()`.

### D. Perbaikan Responsivitas di [ENSOCharts.tsx](file:///d:/Github/Dashboard-Meteo-Sense/components/climate-drivers/ENSOCharts.tsx)
- Pasang `notMerge={true}`, `lazyUpdate={true}`, dan listener `resize()` pada 4 grafik ENSO:
  1. Perbandingan 4 Wilayah Niño (1+2, 3, 3.4, 4)
  2. Deret Waktu ONI
  3. Anomali SST Niño 3.4
  4. Indeks SOI

---

## 3. Rencana Verifikasi

1. **Uji Endpoint API**:
   - `GET /api/climate-drivers/enso/forecast?region=nino34&model=mme` $\to$ status 200 dengan metadata MME dan 7 model global.
   - `GET /api/climate-drivers/enso/forecast?region=nino34&model=cfs` $\to$ status 200 dengan metadata NOAA CFSv2.
2. **Uji Navigasi Frontend & Responsivitas**:
   - Ganti bolak-balik antara tampilan *Ensemble Plume*, *Bandingkan Model*, dan *Probabilitas Fase*. Pastikan tidak ada console error `TypeError` atau canvas blank.
   - Ganti selektor region (Niño 3.4, Niño 3, Niño 4, Niño 1+2) dan selektor model. Pastikan grafik ter-render mulus.
   - Resize jendela browser untuk memastikan grafik otomatis menyesuaikan lebar (100% responsif).
3. **Penyusunan Proposal Pembelajaran (`/learn`)**:
   - Dokumentasikan aturan baru terkait sanitasi lifecycle ECharts dan integrasi multi-model seasonal forecasting ke dalam `.agents/rules/`.
