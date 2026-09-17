# Learning Proposal: Calibration Curve State Isolation & Ground Truth Invariants

## 1. Context & Identified Problem
Saat pengguna menguji metode **Mean Bias Error (Offset)** dengan formula $y = x + 1.71$ pada node stasiun cuaca `id-03`, nilai formula pada inspektur matematika dan leaderboard model sudah tepat ($+1.71^\circ\text{C}$). Namun, kurva kalibrasi visual tampak tidak menunjukkan perubahan (garis terkalibrasi menumpuk persis di atas garis mentah).

### Akar Masalah:
1. **Gating Kondisi Enabled pada Engine Pratinjau**: Fungsi `applyCalibrationToSeries` mengecek `varConfig.enabled`. Jika saklar sensor di form berstatus nonaktif/bypass (atau belum tersimpan aktif di Firestore), engine mengembalikan nilai mentah ($y = x$), sehingga kurva respons transfer function tidak menampilkan efek pergeseran offset $+1.71$.
2. **Race Condition Async Form Reset**: Fungsi `loadConfig` di form `ActiveSensorManager` memanggil Firestore secara asinkron (`await getDoc`). Ketika hasil tiba, `form.reset(baseConfig)` menimpa parameter *draft staging* ($1.71$) kembali ke nilai database ($0$) karena *staged calibrations* tidak digabungkan (*deep merge*) saat reset.
3. **Ambiguitas Arah Koreksi (Validation vs Calibration)**: Pada Tab 1 (Validasi Ilmiah Bias ERA5), kurva AWS adalah *Ground Truth Acuan* yang sengaja dibuat statis, sedangkan model ERA5 yang bergeser. Sebaliknya, pada Tab 3 (Kalibrasi Sensor IoT), kurva sensor AWS yang bergeser. Perbedaan arah ini membingungkan jika tidak memiliki penanda peran yang jelas.

---

## 2. Proposed Rules & Guardrails

### Rule 1: Visual Calibration Preview Isolation
> "Komponen pratinjau kurva / transfer function kalibrasi TIDAK BOLEH dibatasi oleh status saklar operasional (`enabled: false`). Mode pratinjau harus menggunakan `effectiveConfig` terisolasi dengan `enabled: true` pada variabel target agar kurva selalu memvisualisasikan respons matematis formula secara riil (termasuk offset, slope, kuadratik, atau power-law)."

### Rule 2: In-Memory Staging Merge Invariant on Async Hydration
> "Pada arsitektur formulir multi-tab yang mendukung staging in-memory (seperti 1-Click Apply dari Tab Model ke Tab Manajemen Sensor), setiap operasi asinkron remote fetch (misal: Firestore `getDoc`) yang memicu `form.reset()` WAJIB melakukan deep-merge dengan `stagedCalibrations` yang ada di memori agar parameter draft tidak terhapus."

### Rule 3: Visual Role Distinction for Model Validation vs Sensor Calibration
> "Pada antarmuka meteorologi, selalu berikan identitas peran eksplisit:
> - Di Tab Validasi Bias Reanalisis: Beri label tegas `AWS Observasi (Ground Truth Statis)` dan `ERA5 (Model Terkoreksi)`.
> - Di Tab Kalibrasi Sensor: Beri label tegas `Ground Input Mentah` vs `Output Terkalibrasi (Offset: +X.XX)` dan sertakan badge formula serta rata-rata delta."

---

## 3. Files to Update
- [components/calibration/CalibrationPreviewChart.tsx](file:///d:/Github/Dashboard-Meteo-Sense/components/calibration/CalibrationPreviewChart.tsx)
- [components/calibration/ActiveSensorManager.tsx](file:///d:/Github/Dashboard-Meteo-Sense/components/calibration/ActiveSensorManager.tsx)
- [components/calibration/ModelParameterInspector.tsx](file:///d:/Github/Dashboard-Meteo-Sense/components/calibration/ModelParameterInspector.tsx)
