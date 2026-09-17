# Learning Proposal: Two-Phase Calibration Workflow (Staging-to-Commit Pattern)

## 1. Context & Trigger
- **Trigger**: Permintaan pengguna mengenai alur efisien kalibrasi sensor IoT:
  > "bagaimana cara agar bagian menu Kalibrasi dan Validasi cukup sekali 1 click apply langsung tersimpan, lalu bagian Parameter sensor aktif barulah menyimpan semua kalibrasi pada tiap variabel pada tiap node sensor ke firestore, paham tidak?"
- **Problem**:
  Pada UX kalibrasi multi-variabel (Suhu, Kelembaban, Tekanan, Angin, Hujan), mengarahkan pengguna secara otomatis (auto-redirect) ke halaman form penyimpanan setiap kali tombol "Apply" diklik merusak kontinuitas analisis (context interruption) dan menyulitkan kalibrasi multi-variabel berturut-turut.
- **Goal**:
  Menerapkan dan membakukan pola **Staging-to-Commit** untuk sistem kalibrasi sensor dashboard Meteo-Sense.

---

## 2. Classification
- **Type**: Project Rule / Architectural Guideline
- **Target File**: `.agents/rules/calibration_workflow.md` (atau integrasi ke rule panduan dashboard)
- **Scope**: Seluruh modul kalibrasi, validasi bias, dan manajemen konfigurasi sensor IoT di Meteo-Sense.

---

## 3. Rationale & Behavioral Guardrail
1. **Pemisahan Peran Menu**:
   - **Menu Analisis/Validasi/Benchmark (Tab 1 & 2)**: Berfungsi sebagai *Eksplorasi & Algoritma Selection*. Tombol *1-Click Apply* harus bersifat **instan (non-disruptif)**, menyimpan formula hasil fitting ke *Staging State / Local Draft* stasiun aktif tanpa memindahkan tab pengguna.
   - **Menu Parameter Sensor Aktif (Tab 3)**: Berfungsi sebagai *Centralized Review & Commit Manager*. Menampilkan status staging seluruh variabel pada node sensor, menyediakan pratinjau live curve, dan mengeksekusi *Batch Commit* ke Cloud Firestore.
2. **Multi-Variable Batching**:
   - Memungkinkan pengguna mengalibrasi variabel Suhu -> RH -> Tekanan -> Angin secara berturut-turut dalam satu sesi tanpa kehilangan parameter yang telah di-apply sebelumnya.
3. **Persistensi Staging**:
   - Parameter yang telah di-apply disimpan dalam state dan disinkronkan ke `localStorage` agar tidak hilang jika browser tidak sengaja di-reload sebelum tombol simpan ditekan.
4. **Transparansi Visual**:
   - Header tab dan baris tabel wajib menyajikan indikator visual yang jelas mengenai status:
     - `Diterapkan ke Draft` vs `Sudah Aktif di Firestore`
     - Badge jumlah parameter pending di header tab Parameter Sensor Aktif (misal: `3 Siap Simpan`).

---

## 4. Proposed Content for `.agents/rules/calibration_workflow.md`
```markdown
# Rule: Two-Phase Calibration Workflow (Staging-to-Commit)

When designing or modifying calibration, bias correction, and sensor configuration interfaces:

1. **Non-Disruptive 1-Click Apply**:
   - The "1-Click Apply" button on benchmark leaderboards or model evaluation views MUST store the fitted parameters into the active station's staging draft immediately.
   - Do NOT force navigation or redirect away from the analytical screen during 1-Click Apply. Keep the user in the calibration context so they can calibrate subsequent variables smoothly.
   - Provide immediate visual confirmation (e.g., button state change to "Tersimpan", subtle toast notification).

2. **Centralized Commit in Sensor Settings**:
   - The "Parameter Sensor Aktif" panel is the single source of truth for committing configurations to Cloud Firestore.
   - Clearly display a summary of staged/uncommitted changes with their respective formulas.
   - Ensure saving commits the complete, validated station document (`StationCalibrationDocument`) containing all 11 standardized sensor variables.

3. **Multi-Variable & Multi-Node Resilience**:
   - Preserve staged calibration parameters per station in local state/storage across variable and station selections until explicitly committed to Firestore or reset by the user.
```
