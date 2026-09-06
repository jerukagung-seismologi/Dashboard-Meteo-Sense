# Implementasi Mesin Resampling 1-Menit & Imputasi Fisis (Clean DB) di Dashboard Meteo Sense

Membawa kemampuan pembersihan data tingkat meteorologis (*QC & 1-Minute Resampling*) dari aplikasi desktop *Firebase Database Administrator* langsung ke dalam ekosistem web **Dashboard Meteo Sense** secara *native* menggunakan TypeScript dan Node.js `node:sqlite`.

---

## 1. Latar Belakang & Analisis Masalah

1. **Kondisi Saat Ini**:
   - Di aplikasi desktop *Firebase Database Administrator*, terdapat modul `interpolation.py` dan `pipeline.py` yang memproses data mentah dari `meteo_local_cache.db` menjadi data bersih dengan kisi reguler 60 detik di `meteo_clean_data.db`.
   - Di website (*Dashboard Meteo Sense*), halaman `/dashboard/backup-sqlite` saat ini baru bersifat **viewer / read-only** terhadap `meteo_clean_data.db`.
   - Ketika pengguna melakukan *"Sinkronisasi Firebase RTDB"* di web, hanya data mentah di `meteo_local_cache.db` yang bertambah, sedangkan `meteo_clean_data.db` tidak ikut diperbarui kecuali pengguna membuka aplikasi desktop Python.
2. **Kebutuhan Teknis**:
   - Algoritma kalibrasi sensor (Robust Linear Regression, Huber, Quantile Mapping) dan validasi ERA5 jam-jaman memerlukan runtun waktu dengan **interval teratur 1 menit (strictly periodic 60-second grid: 1.440 titik per hari)**.
   - Sinyal sensor di lapangan mengalami *jitter* waktu (misal kirim di detik 04, 15, atau 48), lonjakan transmisi *burst* saat koneksi pulih, dan *gap* data sementara akibat sinyal drop.

---

## 2. Keputusan Desain (Hasil Wawancara Grill-Me)

Sesuai dengan kesepakatan pada sesi tanya jawab:
1. **Engine Native TypeScript**: Mesin pembersihan diimplementasikan langsung di backend Next.js API (`app/api/backup-sqlite/route.ts`) tanpa dependensi ke Python.
2. **Pemicu (Triggers)**:
   - Tombol manual *"Jalankan Pembersihan & Resampling 1-Menit"* di Tab 1 (Kelengkapan Basis Data) dan Top Header.
   - Opsi centang (*checkbox*) di modal *"Sinkronisasi Firebase RTDB"*: *"Otomatis jalankan Pembersihan & Resampling setelah sinkronisasi selesai"*.
3. **Cakupan Data**:
   - Mode *default*: **Inkremental** (memproses data baru dengan *overlap buffer* jahitan 1 jam dari timestamp bersih terakhir).
   - Mode alternatif: **Proses Ulang Penuh (Full Rebuild)** untuk membangun ulang seluruh sejarah data stasiun terpilih.
4. **Proteksi Cadangan**:
   - Sistem secara otomatis membuat **snapshot cadangan** (*pre-resampling snapshot*) dari `meteo_clean_data.db` sebelum pembersihan dijalankan, sehingga aman dari kegagalan proses.

---

## 3. Rencana Perubahan (*Proposed Changes*)

### A. Backend API Engine (`app/api/backup-sqlite/route.ts`)

#### [MODIFY] [route.ts](file:///d:/Github/Dashboard-Meteo-Sense/app/api/backup-sqlite/route.ts)
Menambahkan handler `POST /api/backup-sqlite?action=clean-resample` dengan alur logika:
1. **Pemeriksaan & Pembuatan Snapshot Otomatis**:
   - Memanggil `createBackupSnapshot("Pre-Resampling Auto Backup")` jika opsi proteksi aktif.
2. **Pembacaan Data Mentah**:
   - Membaca `aws_measurements` dari `meteo_local_cache.db` untuk stasiun terpilih (`id-01` s/d `id-11`, atau `all`).
   - Pada mode inkremental, batas awal adalah `max(unix_ts) - 3600` dari `aws_clean_measurements` agar batas sambungan tersambung mulus.
3. **Penyelarasan Kisi 1-Menit (Grid Snapping & Burst Aggregation)**:
   - Snapping waktu ke kelipatan 60 detik: `snapped_ts = Math.round(raw_ts / 60) * 60`.
   - Menggabungkan beberapa paket data dalam interval $\pm 30$ detik:
     - **Arah Angin (*wind_direction*)**: Rata-rata vektor sirkular ($\arctan2(\overline{\sin}, \overline{\cos})$).
     - **Curah Hujan (*rainfall, rainrate*)**: Nilai puncak maksimum (*max peak*).
     - **Suhu, RH, Tekanan, Radiasi, Angin, Baterai**: Rata-rata aritmatika (*arithmetic mean*).
4. **Filter Batas Fisis Sensor (WMO / BMKG QC Limits)**:
   - Suhu: $-10^\circ\text{C} \le T \le 55^\circ\text{C}$
   - Kelembaban: $5\% \le RH \le 100\%$
   - Tekanan: $850\text{ hPa} \le P \le 1100\text{ hPa}$
   - Radiasi Surya: $0 \le GHI \le 1500\text{ W/m}^2$
   - Kecepatan Angin: $0 \le V \le 75\text{ m/s}$
   - Hujan: $0 \le R \le 300\text{ mm}$
5. **Interpolasi Runtun Waktu Fisis (*Physical Time-Series Imputation*)**:
   - Untuk gap waktu $\le 3600\text{ detik}$ (1 jam), lakukan interpolasi linear fisis di antara dua titik valid terdekat.
   - Tandai baris terinterpolasi dengan `status = 'IMPUTED'`.
   - Baris asli valid ditandai `status = 'OK'` (atau `'EDITED'` jika melewati koreksi batas fisis).
   - Menolak prediksi masa depan (`unix_ts <= now`).
6. **Penyimpanan Atomic ke `meteo_clean_data.db`**:
   - Menggunakan `INSERT OR REPLACE INTO aws_clean_measurements (...)` dalam transaksi database SQLite.
   - Mengembalikan ringkasan statistik (jumlah baris bersih, baris terimputasi, durasi eksekusi).

---

### B. Antarmuka Pengguna (*Frontend UI*)

#### [MODIFY] [page.tsx](file:///d:/Github/Dashboard-Meteo-Sense/app/dashboard/backup-sqlite/page.tsx)
1. **Tab 1: Kelengkapan Basis Data**:
   - Pada kolom kanan (*Basis Data Bersih / Clean DB*), tambahkan tombol utama hijau/emerald: **"Jalankan Pembersihan & Resampling 1-Menit"** dengan ikon `Sparkles` / `CheckCircle2`.
   - Menambahkan Dialog Konfigurasi Pembersihan:
     - Pilihan Stasiun: Semua Stasiun atau Node Spesifik.
     - Pilihan Mode: Inkremental (Data Baru) vs Full Rebuild.
     - Checkbox: "Buat snapshot cadangan otomatis sebelum proses" (Default: True).
2. **Top Header Action Bar**:
   - Tambahkan tombol aksi cepat: **"Pembersihan (Clean DB)"** berdampingan dengan tombol RTDB dan ERA5.
   - Di dalam Dialog *"Sinkronisasi Firebase RTDB"*, tambahkan *switch/checkbox*: *"Otomatis bersihkan dan resample ke Clean DB setelah unduh selesai"*.
3. **Statistik Hasil Pembersihan**:
   - Tampilkan toast dan banner detail hasil pembersihan (total baris tersimpan, persentase imputasi, dan pembaruan metrik kelengkapan secara langsung).

---

## 4. Rencana Verifikasi (*Verification Plan*)

### A. Pengujian Otomatis (*Automated Tests*)
1. Menjalankan skrip uji pembersihan pada satu stasiun (misal `id-04`) via `node -e`:
   - Verifikasi bahwa timestamp yang dihasilkan semuanya tepat kelipatan 60 (`ts % 60 === 0`).
   - Verifikasi bahwa data `OK` dan `IMPUTED` tersimpan dengan benar di `aws_clean_measurements`.
   - Verifikasi tidak ada nilai anomali di luar batas fisis.
2. Menguji endpoint API:
   - `POST /api/backup-sqlite?action=clean-resample` dengan parameter `{ station: 'id-04', mode: 'incremental' }`.
   - Verifikasi response HTTP 200 dengan status JSON `success: true`.

### B. Pengujian Tampilan Antarmuka (*Manual / UI Tests*)
1. Membuka halaman `/dashboard/backup-sqlite`.
2. Menguji pemicuan pembersihan dari dialog Tab 1.
3. Memastikan ringkasan baris bersih di Card 2 dan Tab 1 bertambah secara real-time.
4. Memeriksa baris data bersih di Tab 2 (*Penjelajah Data*) dengan filter `status = 'IMPUTED'` dan `status = 'OK'`.
