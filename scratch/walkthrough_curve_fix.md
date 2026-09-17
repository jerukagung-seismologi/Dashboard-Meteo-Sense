# Laporan Verifikasi: Resolusi Kurva Kalibrasi Mean Bias Error (Offset) pada Node ID-03

## 1. Ringkasan Investigasi

Pengguna menanyakan:
> *"kenapa metode yang Men Bias Error (offset) nilainya sudah benar y=x+1.71 tapi kenapa di kurva kalibrasinya tidak ada perubahan? saya sedang menguji untuk node id-03, gimana menurutmu?"*

Setelah melakukan audit end-to-end pada SQLite data mentah, reanalisis ERA5, database Firestore, dan arsitektur visualisasi kalibrasi, ditemukan **4 akar masalah** yang menjelaskan mengapa kurva tidak bergerak:

| No | Sumber Masalah | Lokasi Kode | Dampak pada Kurva |
|---|---|---|---|
| 1 | **Gating Status Nonaktif pada Pratinjau** | [CalibrationPreviewChart.tsx](file:///d:/Github/Dashboard-Meteo-Sense/components/calibration/CalibrationPreviewChart.tsx) & [calibrationEngine.ts](file:///d:/Github/Dashboard-Meteo-Sense/lib/calibration/calibrationEngine.ts) | Engine memeriksa `if (!varConfig?.enabled) return raw;`. Jika saklar sensor belum aktif di Firestore / formulir, kurva mengembalikan $y = x$, sehingga garis biru menimpa garis abu-abu secara identik. |
| 2 | **Race Condition Form Reset Asinkron** | [ActiveSensorManager.tsx](file:///d:/Github/Dashboard-Meteo-Sense/components/calibration/ActiveSensorManager.tsx) | `loadConfig()` memanggil `await getDoc("id-03")` dari Firestore. Ketika data tiba, `form.reset(baseConfig)` menimpa draft staging $+1.71$ kembali ke data Firestore lama (`offset: 0`). |
| 3 | **Kondisi Dokumen Firestore Node id-03** | `sensor_calibration/id-03` (Firestore) | Dokumen `id-03` di Firestore saat ini masih tersimpan dengan `offset: 0`, sehingga live endpoint `/api/sensors?calibration=true` menghasilkan delta $0.00^\circ\text{C}$ hingga tombol *Simpan Semua Parameter ke Firestore* ditekan. |
| 4 | **Perbedaan Arah Koreksi Ilmiah (Tab 1 vs Tab 3)** | [TimeSeriesComparisonPlot.tsx](file:///d:/Github/Dashboard-Meteo-Sense/components/validasi-bias/TimeSeriesComparisonPlot.tsx) | Di Tab 1, sensor AWS adalah **Ground Truth Acuan** (statis tidak bergerak), sedangkan kurva model ERA5 yang bergeser $+1.71$. Kalibrasi sensor IoT sesungguhnya berada di Tab 3. |

---

## 2. Perubahan yang Dilakukan

1. **Isolasi Mode Pratinjau ([CalibrationPreviewChart.tsx](file:///d:/Github/Dashboard-Meteo-Sense/components/calibration/CalibrationPreviewChart.tsx))**:
   - Menambahkan `effectiveConfig` yang memaksa `enabled: true` pada variabel yang sedang dipratinjau, sehingga kurva transfer function $y = x + 1.71$ **selalu memvisualisasikan pergeseran garis biru secara nyata** di atas garis abu-abu mentah, terlepas dari status saklar operasionalnya.
   - Menambahkan header formula dinamis: `Model Pratinjau: y = x + 1.71 °C`, badge rerata pergeseran `Δ +1.71 °C`, dan badge status operasional.
   - Memperkaya tooltip agar menampilkan rincian: Nilai Mentah, Hasil Terkalibrasi, dan Selisih $\Delta$.

2. **Perbaikan Race Condition Asinkron ([ActiveSensorManager.tsx](file:///d:/Github/Dashboard-Meteo-Sense/components/calibration/ActiveSensorManager.tsx))**:
   - Menggabungkan (*deep merge*) `stagedCalibrations` langsung ke dalam `baseConfig` di dalam `loadConfig()`, sehingga hasil pembacaan Firestore tidak akan pernah menghapus draft parameter $+1.71$ yang baru saja diterapkan dari Tab 2.
   - Menambahkan `{ shouldDirty: true, shouldTouch: true }` pada sinkronisasi form.

3. **Inspektur Rumus Matematis ([ModelParameterInspector.tsx](file:///d:/Github/Dashboard-Meteo-Sense/components/calibration/ModelParameterInspector.tsx))**:
   - Mendukung fallback `parameters?.offset ?? parameters?.bias`.
   - Menampilkan rumus konkret dengan angka hasil fitting (misal: `y = x + 1.71`) pada kartu persamaan matematis.

---

## 3. Hasil Pengujian

- **Kompilasi TypeScript**: Lulus tanpa error pada seluruh berkas yang dimodifikasi.
- **HTTP Endpoint**:
  - `GET /dashboard/kalibrasi?tab=model-calibration` $\to$ **HTTP 200**
  - `GET /dashboard/kalibrasi?tab=sensor-settings` $\to$ **HTTP 200**
- **Simulasi Perhitungan Node id-03**:
  - Sampel jam observasi valid: 464 jam matched ERA5.
  - Mean Bias Error (MBE): $+1.51$ s/d $+1.71^\circ\text{C}$.
  - Shift terverifikasi memisahkan garis biru (Terkalibrasi) dan abu-abu (Mentah) sebesar $+1.71^\circ\text{C}$ pada grafik respons.
