# Analisis & Perbaikan Kurva Kalibrasi Mean Bias Error (Offset) pada Node ID-03

Dokumen ini menjelaskan akar masalah (*root cause analysis*) mengapa metode **Mean Bias Error (Offset)** dengan formula $y = x + 1.71$ pada node `id-03` tampak tidak memberikan perubahan pada kurva kalibrasi, serta langkah konkret perbaikan sistem di kode dan panduan interpretasi ilmiahnya.

---

## Ringkasan Akar Masalah (Root Cause Analysis)

Setelah melakukan inspeksi mendalam pada basis data (SQLite `aws_measurements`, `era5_data.db`, Firestore `sensor_calibration/id-03`), serta komponen visualisasi ([CalibrationPreviewChart.tsx](file:///d:/Github/Dashboard-Meteo-Sense/components/calibration/CalibrationPreviewChart.tsx), [ActiveSensorManager.tsx](file:///d:/Github/Dashboard-Meteo-Sense/components/calibration/ActiveSensorManager.tsx), [ModelParameterInspector.tsx](file:///d:/Github/Dashboard-Meteo-Sense/components/calibration/ModelParameterInspector.tsx)), ditemukan **4 faktor utama** yang menyebabkan kurva tidak berubah:

### 1. Perbedaan Arah Koreksi Ilmiah (Tab 1 vs Tab 3)
- **Di Tab 1 (Validasi Ilmiah Bias ERA5)**: Sensor AWS diposisikan sebagai **Ground Truth Reference (Standar Acuan)**. Oleh karena itu, garis observasi AWS **sengaja dibuat statis (tidak bergerak)**. Yang dikoreksi dan bergeser $+1.71$ mendekati AWS adalah kurva model reanalisis **ERA5 Corrected** ($\text{ERA5}_{\text{corr}} = \text{ERA5} + \text{Bias}$). Jika penguji mengira kurva AWS yang bergeser di Tab 1, secara metodologi ilmiah WMO kurva AWS adalah patokan acuan.
- **Di Tab 3 (Kalibrasi Sensor IoT / Transfer Function)**: Di sinilah kurva kalibrasi sensor sesungguhnya berada, yaitu memetakan **Raw Reading (Input)** ke **Calibrated Value (Output)**.

### 2. Gating Status `enabled: false` pada Engine Pratinjau
- Di [calibrationEngine.ts](file:///d:/Github/Dashboard-Meteo-Sense/lib/calibration/calibrationEngine.ts) dan [calibrationRules.ts](file:///d:/Github/Dashboard-Meteo-Sense/lib/calibration/calibrationRules.ts):
  ```ts
  if (!config.enabled) return record;
  if (!varConfig?.enabled) return val;
  ```
- Di [CalibrationPreviewChart.tsx](file:///d:/Github/Dashboard-Meteo-Sense/components/calibration/CalibrationPreviewChart.tsx), data disimulasikan melalui `applyCalibrationToSeries(series, config)`.
- Jika switch sensor suhu di formulir berstatus **Nonaktif/Bypass** (belum dicentang aktif), fungsi akan mem-bypass kalibrasi dan mengembalikan nilai mentah secara identik ($y = x$). Akibatnya, garis biru (*Hasil Terkalibrasi*) menumpuk tepat di atas garis abu-abu (*Nilai Mentah*), sehingga terlihat seolah-olah tidak ada perubahan sama sekali.

### 3. *Race Condition* pada Reset Asinkron Firestore di `ActiveSensorManager.tsx`
- Saat pengguna memilih stasiun `id-03` atau menerapkan parameter dari Tab 2 (*1-Click Apply*), parameter $1.71$ masuk ke dalam *staged draft*.
- Namun fungsi `loadConfig()` di `ActiveSensorManager.tsx` memanggil `await getCalibrationDocument("id-03")` secara asinkron dari Firestore.
- Ketika respons Firestore tiba, kode mengeksekusi `form.reset(baseConfig)` yang menggunakan data lama Firestore tanpa menggabungkan (*merge*) *staged draft*. Karena dokumen Firestore `sensor_calibration/id-03` saat ini menyimpan `temperature.offset = 0`, *staged draft* $1.71$ tertimpa kembali menjadi `0`!

### 4. Status Dokumen Firestore Node `id-03`
- Hasil audit langsung kami ke Firestore menunjukkan dokumen `sensor_calibration/id-03` saat ini berisi:
  ```json
  "temperature": {
    "enabled": true,
    "method": "offset",
    "offset": 0,
    "scale": 1
  }
  ```
  Nilai `offset: 0` inilah yang menyebabkan live telemetri `api/sensors?calibration=true` menghasilkan delta $0.00^\circ\text{C}$ hingga tombol *Simpan Semua Parameter ke Firestore* ditekan.

---

## Rencana Perbaikan (Proposed Changes)

### 1. Komponen Pratinjau Kurva: [CalibrationPreviewChart.tsx](file:///d:/Github/Dashboard-Meteo-Sense/components/calibration/CalibrationPreviewChart.tsx)
- **Isolasi Mode Pratinjau (*Force Active in Preview*)**: Buat `effectiveConfig` yang secara eksplisit mengaktifkan variabel yang sedang dipratinjau (`enabled: true`), sehingga grafik transfer function SELALU memvisualisasikan dampak matematis formula ($y = x + 1.71$) terlepas dari apakah saklar operasionalnya sedang dibypass atau belum.
- **Formula & Delta Banner**: Tampilkan kartu formula dinamis di atas grafik, misal:
  `Formula Aktif: y = x + 1.71 °C` | `Rerata Pergeseran: +1.71 °C` | `Status: Aktif / Mode Pratinjau`.
- **Tooltip Cerdas**: Menampilkan `Nilai Mentah`, `Hasil Terkalibrasi`, dan `Selisih (Δ = +1.71 °C)`.

### 2. Manajemen Sensor: [ActiveSensorManager.tsx](file:///d:/Github/Dashboard-Meteo-Sense/components/calibration/ActiveSensorManager.tsx)
- **Perbaiki Race Condition Asinkron**: Di dalam `loadConfig()`, lakukan *deep merge* antara data Firestore dengan `stagedCalibrations` sebelum memanggil `form.reset(baseConfig)`.
- Pastikan variabel yang menerima *1-Click Apply* otomatis diset `enabled: true`.

### 3. Inspektur Parameter Model: [ModelParameterInspector.tsx](file:///d:/Github/Dashboard-Meteo-Sense/components/calibration/ModelParameterInspector.tsx)
- Dukung fallback parameter `parameters?.offset ?? parameters?.bias`.
- Render formula dinamis dengan angka konkret (misal: `y = x + 1.71`) pada kartu persamaan matematis.

---

## Verification Plan

### Automated / Terminal Tests
1. Jalankan script simulasi pipeline kalibrasi node `id-03` untuk memastikan pergeseran offset $+1.71$ terhitung secara valid.
2. Verifikasi dev server Next.js tidak mengalami error kompilasi TypeScript atau runtime.

### Manual Verification
1. Buka Tab 2 (*Model Kalibrasi*), pilih node `id-03`, variabel `Suhu Udara (2m)`, dan metode `Mean Bias Error (Offset)`.
2. Klik tombol *Terapkan Parameter ke Sensor Stasiun Ini*.
3. Pindah ke Tab 3 (*Parameter Sensor Aktif*):
   - Verifikasi grafik pratinjau kurva langsung memisahkan garis biru (Terkalibrasi) di atas garis abu-abu (Mentah) setinggi $+1.71^\circ\text{C}$.
   - Verifikasi badge dan tooltip menampilkan pergeseran $+1.71^\circ\text{C}$.
4. Simpan ke Firestore dan verifikasi dokumen `id-03` terupdate.
