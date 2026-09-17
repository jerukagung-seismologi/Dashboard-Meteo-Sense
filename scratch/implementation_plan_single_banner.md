# Rencana Penggabungan & Standarisasi Single Compact Banner di Sub-Halaman Dashboard

Menghilangkan duplikasi banner bertumpuk (seperti pada `climate-drivers` dan `indeks-monsun`), menyatukan informasi edukatif serta status pembaruan ke dalam satu banner yang rapi, ringkas ("tidak perlu lebar-lebar juga"), dan menerapkan standar banner tunggal ini secara konsisten di seluruh sub-halaman dashboard, **dengan pengecualian halaman utama `/dashboard`** sebagaimana diminta pengguna.

---

## User Review Required
> [!NOTE]
> - **Double Banner Teridentifikasi**:
>   1. `app/dashboard/climate-drivers/page.tsx`: Memiliki `SubpageHeader` + `Hero Educational Intro Card` ("Memahami 3 Pilar Dinamika Iklim Global di Balik Cuaca Indonesia" + "Terakhir Diperbarui NOAA CPC").
>   2. `app/dashboard/indeks-monsun/page.tsx`: Memiliki `MonsoonIndicesHeader` + `Educational Intro Hero Card` ("Memantau Dinamika Monsun Australia...").
>   3. `app/dashboard/klimatologi/page.tsx`: Memiliki banner utama di atas + banner gradien besar di dalam Tab 3 (ERA5).
>   4. `app/dashboard/prakirawan/page.tsx`: Memiliki header teks luar + header box form di dalam kartu.
> - **Pengecualian Eksplisit**:
>   Halaman root `/dashboard` (`app/dashboard/page.tsx`) **TIDAK** diberi banner tambahan dan dipertahankan dalam format ringkas aslinya.
> - **Desain Compact**:
>   Tinggi/padding vertikal banner disesuaikan agar hemat tempat (`p-4 sm:p-5`, bukan `p-8`), teks padat dan informatif, tata letak seimbang (kiri untuk identitas/deskripsi, kanan untuk tombol aksi atau status terakhir diperbarui).

---

## Proposed Changes

### 1. Komponen Standar Banner Ringkas (Reusable Compact Banner)
#### [NEW] [PageHeaderBanner.tsx](file:///d:/Github/Dashboard-Meteo-Sense/components/ui/PageHeaderBanner.tsx)
- Membuat komponen seragam dengan prop:
  - `badge`: text label + icon badge (opsional)
  - `title`: judul halaman
  - `icon`: Lucide icon komponen
  - `description`: deskripsi ringkas 1-2 baris
  - `gradient`: variasi warna gradien elegan (indigo, teal, sky, purple, emerald, blue, slate)
  - `actions`: elemen aksi di sisi kanan (tombol refresh, link eksternal, atau badge last updated)
  - `children`: opsional untuk tabs bar / sub-navigasi di bagian bawah banner
  - Padding dirancang compact (`p-4 sm:p-5`), rounded-2xl, border halus dan ambient glow minimalis.

---

### 2. Penggabungan Double Banner Menjadi 1 Banner Tunggal

#### [MODIFY] [SubpageHeader.tsx](file:///d:/Github/Dashboard-Meteo-Sense/components/climate-drivers/SubpageHeader.tsx)
- Tambahkan prop `lastUpdated?: string` dan integrasikan badge edukasi 3 pilar.
- Letakkan status "Terakhir Diperbarui: {lastUpdated}" di sisi kanan banner bersama tombol aksi secara compact.
- Padding dirampingkan menjadi `p-4 sm:p-5`.

#### [MODIFY] [page.tsx (climate-drivers)](file:///d:/Github/Dashboard-Meteo-Sense/app/dashboard/climate-drivers/page.tsx)
- Berikan `lastUpdated={summary.lastUpdated}` ke `SubpageHeader`.
- Hapus `Hero Educational Intro Card` (lines 95-119) yang menyebabkan double banner bertumpuk.

#### [MODIFY] [MonsoonIndicesHeader.tsx](file:///d:/Github/Dashboard-Meteo-Sense/components/indeks-monsun/MonsoonIndicesHeader.tsx)
- Tambahkan prop `lastUpdated?: string`.
- Rampingkan padding menjadi `p-4 sm:p-5`.
- Sertakan badge status "Terakhir Diperbarui: {lastUpdated}" langsung di dalam header banner.

#### [MODIFY] [page.tsx (indeks-monsun)](file:///d:/Github/Dashboard-Meteo-Sense/app/dashboard/indeks-monsun/page.tsx)
- Berikan `lastUpdated={data?.lastUpdated}` ke `MonsoonIndicesHeader`.
- Hapus `Educational Intro Hero Card` (lines 61-85) yang bertumpuk di bawah header.

#### [MODIFY] [page.tsx (klimatologi)](file:///d:/Github/Dashboard-Meteo-Sense/app/dashboard/klimatologi/page.tsx)
- Rampingkan Page Header utama di atas (`p-4 sm:p-5`).
- Ubah banner gradien di dalam Tab 3 (ERA5 lines 1301-1322) menjadi sub-header tab sederhana (border tipis, bukan banner gradien penuh) sehingga halaman klimatologi memiliki **1 banner utama tunggal**.

#### [MODIFY] [page.tsx (prakirawan)](file:///d:/Github/Dashboard-Meteo-Sense/app/dashboard/prakirawan/page.tsx)
- Gunakan 1 banner terpadu di bagian atas halaman dan sederhanakan header form kartu.

---

### 3. Penerapan Banner Kompak Konsisten pada Sub-Halaman Lainnya
Terapkan `PageHeaderBanner` atau styling banner kompak seragam pada:
- [MODIFY] [app/dashboard/meteorologi/page.tsx](file:///d:/Github/Dashboard-Meteo-Sense/app/dashboard/meteorologi/page.tsx): Ganti teks polos dengan compact banner Meteorologi.
- [MODIFY] [app/dashboard/peta/page.tsx](file:///d:/Github/Dashboard-Meteo-Sense/app/dashboard/peta/page.tsx): Berikan compact banner SIG & Telemetri Stasiun Cuaca.
- [MODIFY] [app/dashboard/data/page.tsx](file:///d:/Github/Dashboard-Meteo-Sense/app/dashboard/data/page.tsx): Berikan compact banner Data Editor & Manajemen Sensor.
- [MODIFY] [app/dashboard/laporan/page.tsx](file:///d:/Github/Dashboard-Meteo-Sense/app/dashboard/laporan/page.tsx): Berikan compact banner Pelaporan & Ekspor WOW Met Office.
- [MODIFY] [app/dashboard/kalibrasi/page.tsx](file:///d:/Github/Dashboard-Meteo-Sense/app/dashboard/kalibrasi/page.tsx): Rampingkan header menjadi compact banner Kalibrasi & Validasi Bias Ilmiah.
- [MODIFY] [app/dashboard/perangkat/page.tsx](file:///d:/Github/Dashboard-Meteo-Sense/app/dashboard/perangkat/page.tsx): Berikan compact banner Manajemen Perangkat IoT.
- [MODIFY] [app/dashboard/perangkat-benchmark/page.tsx](file:///d:/Github/Dashboard-Meteo-Sense/app/dashboard/perangkat-benchmark/page.tsx): Rampingkan header menjadi compact banner Stasiun Benchmark.
- [MODIFY] [app/dashboard/agromet/page.tsx](file:///d:/Github/Dashboard-Meteo-Sense/app/dashboard/agromet/page.tsx): Rampingkan padding banner dari `p-8` menjadi `p-4 sm:p-5`.
- [MODIFY] [app/dashboard/air-quality/page.tsx](file:///d:/Github/Dashboard-Meteo-Sense/app/dashboard/air-quality/page.tsx): Rampingkan padding header banner menjadi `p-4 sm:p-5`.
- [MODIFY] [app/dashboard/reanalisis-era5/page.tsx](file:///d:/Github/Dashboard-Meteo-Sense/app/dashboard/reanalisis-era5/page.tsx): Rampingkan padding header banner menjadi `p-4 sm:p-5`.

---

### 4. Rule & Pembelajaran (/learn)
#### [NEW] [.agents/rules/single-compact-page-banner.md](file:///d:/Github/Dashboard-Meteo-Sense/.agents/rules/single-compact-page-banner.md)
- Dokumentasi aturan standar antarmuka:
  - Tepat 1 banner per sub-halaman dashboard (tidak boleh ada 2 hero banner bertumpuk).
  - Banner harus compact (`p-4 sm:p-5`, tinggi efisien, tidak memakan ruang berlebih).
  - Pengecualian mutlak: Halaman utama `/dashboard` tidak boleh menggunakan banner ini.

---

## Verification Plan

### Automated Verification
1. Jalankan `npm run build` untuk memvalidasi tidak ada syntax error, type error, atau import error di Next.js:
   ```bash
   npm run build
   ```
2. Verifikasi dev server merespons tanpa runtime crash di sub-halaman yang diperbarui:
   - `/dashboard/climate-drivers`
   - `/dashboard/indeks-monsun`
   - `/dashboard/klimatologi`
   - `/dashboard/meteorologi`
   - `/dashboard/peta`
   - `/dashboard/air-quality`
   - `/dashboard/prakirawan`
   - `/dashboard` (memastikan halaman utama tetap tanpa banner)

### Manual / Visual Verification
- Periksa bahwa halaman `climate-drivers` kini hanya memiliki 1 banner ringkas (tidak ada banner kedua di bawahnya).
- Periksa bahwa halaman `indeks-monsun` kini hanya memiliki 1 banner ringkas.
- Periksa tinggi banner tidak boros ruang vertikal ("tidak perlu lebar-lebar juga").
