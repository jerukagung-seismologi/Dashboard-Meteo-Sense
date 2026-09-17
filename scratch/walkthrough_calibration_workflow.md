# Walkthrough: Two-Phase Calibration Workflow (1-Click Staging & Centralized Firestore Commit)

## 1. Ringkasan Perubahan
Telah berhasil diimplementasikan pola **Staging-to-Commit (Two-Phase Calibration Workflow)** pada modul Kalibrasi & Validasi Dashboard Meteo-Sense:
1. **Menu Kalibrasi & Validasi (Tab 1 & Tab 2)**:
   - Tombol **"1-Click Apply"** pada Leaderboard Benchmark multi-metode dan tombol **"Terapkan Parameter ke Sensor Stasiun Ini"** pada kartu inspeksi model kini bekerja secara **instan dan non-disruptif**.
   - **Tidak ada lagi perpindahan tab paksa (auto-redirect ke Tab 3)**. Pengguna tetap berada di layar kalibrasi untuk memilih dan mengalibrasi variabel lain (Suhu Udara, Kelembaban RH, Tekanan, Kecepatan Angin, dsb.) secara berurutan.
   - Parameter hasil fitting kalibrasi langsung tersimpan ke dalam **Staging Draft** stasiun aktif, dengan auto-backup ke `localStorage` (`meteo_staged_calibrations`).
   - Tombol pada baris Leaderboard segera menampilkan status visual interaktif:
     - Efek checklist: `✓ Tersimpan!` selama 2.5 detik.
     - Badge persistens: `Diterapkan di Draft`.
   - Header Tab 3 secara dinamis menampilkan counter badge jumlah variabel yang siap disimpan:
     `<Badge>X Siap Simpan</Badge>`.

2. **Menu Parameter Sensor Aktif (Tab 3)**:
   - Bertindak sebagai pusat konsolidasi (*Review & Batch Commit Hub*).
   - Menampilkan **Staged Calibration Review Banner** di bagian atas jika terdapat parameter draft yang belum disimpan ke database:
     - Daftar chip variabel yang telah dikalibrasi (misal: *Suhu Udara: Polynomial (Derajat 2)*, *Kelembaban: Quantile Mapping*, dsb.).
     - Tombol **"Batalkan Draft"** untuk mengembalikan form ke data resmi Firestore.
     - Tombol aksi utama **"Simpan Semua ke Firestore"** yang memvalidasi seluruh 11 variabel konfigurasi sensor untuk stasiun tersebut dan melakukan commit ke Cloud Firestore koleksi `sensor_calibration`.
   - Setelah sukses tersimpan, draft stasiun tersebut otomatis dibersihkan dari memori dan `localStorage`.

---

## 2. File yang Dimodifikasi
1. **`app/dashboard/kalibrasi/page.tsx`**:
   - Menambahkan tipe `StagedVariableCalibration`.
   - Menambahkan state `stagedCalibrations` dengan persistensi `localStorage`.
   - Memperbarui `handle1ClickApply` agar menyimpan ke draft dan meniadakan redirect paksa.
   - Menambahkan badge indikator `X Siap Simpan` pada trigger Tab 3.
   - Meneruskan `stagedCalibrations` ke `ActiveSensorManager` dan `MethodBenchmarkLeaderboard`.
2. **`components/calibration/MethodBenchmarkLeaderboard.tsx`**:
   - Menambahkan prop `currentStagedMethod`.
   - Menambahkan interaksi tombol 1-Click Apply: feedback `✓ Tersimpan!` dan status `Diterapkan di Draft`.
3. **`components/calibration/ActiveSensorManager.tsx`**:
   - Menambahkan prop `stagedCalibrations`, `onClearStationStaged`, dan `onClearVariableStaged`.
   - Sinkronisasi otomatis nilai draft kalibrasi ke dalam form react-hook-form.
   - Menambahkan komponen visual **Staged Calibration Review Banner**.
   - Integrasi tombol "Simpan Semua ke Firestore" dan "Batalkan Draft".

---

## 3. Hasil Pengujian & Verifikasi
- **TypeScript Check**: `app/dashboard/kalibrasi/page.tsx`, `components/calibration/ActiveSensorManager.tsx`, dan `components/calibration/MethodBenchmarkLeaderboard.tsx` terverifikasi bebas dari error tipe (`0 errors`).
- **Next.js Dev Server**: Halaman `/dashboard/kalibrasi` berhasil di-build dan di-serve pada port 3000 tanpa crash atau runtime exception.
