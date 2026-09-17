# Walkthrough: Penggabungan Double Banner & Penerapan Single Compact Banner Konsisten

## 1. Ringkasan Perubahan
Sesuai dengan permintaan pengguna:
1. **Penggabungan Double Banner**: Pada halaman yang sebelumnya memiliki dua banner bertumpuk (seperti pada screenshot pengguna di `climate-drivers` dan `indeks-monsun`), banner kedua telah dihapus dan seluruh informasinya (termasuk status "Terakhir Diperbarui", edukasi 3 pilar iklim, dan sirkulasi regional) disatukan ke dalam banner utama.
2. **Konsistensi di Setiap Halaman**: Seluruh sub-halaman dashboard (`climate-drivers`, `indeks-monsun`, `klimatologi`, `air-quality`, `meteorologi`, `peta`, `data`, `laporan`, `kalibrasi`, `perangkat`, `perangkat-benchmark`, `prakirawan`, `agromet`, `reanalisis-era5`, `backup-sqlite`, `profil`, `manager`) kini secara seragam memiliki **tepat 1 banner** header.
3. **Pengecualian Halaman Utama Dashboard**: Halaman utama (`/dashboard` atau `app/dashboard/page.tsx`) **TIDAK** ditambahkan banner dan dipertahankan dalam format ringkas aslinya sesuai permintaan eksplisit pengguna ("kecuali bagian dashboard").
4. **Desain Kompak ("Tidak Perlu Lebar-Lebar")**:
   - Padding banner dirampingkan menjadi `p-4 sm:p-5` (menggantikan `p-8` atau `p-6 sm:p-7` yang boros ruang).
   - Ukuran judul dinormalisasi menjadi `text-xl sm:text-2xl font-extrabold`.
   - Tata letak efisien: sisi kiri untuk judul + deskripsi 1-2 baris, sisi kanan untuk status pembaruan dan tombol aksi cepat.
5. **Persistensi Aturan (/learn)**: Dibuat rule guardrail di `.agents/rules/single-compact-page-banner.md` untuk menjamin arsitektur antarmuka ini tetap terjaga pada pengembangan berikutnya.

---

## 2. Komponen & File yang Diubah

### Komponen Reusable
- **[NEW] [PageHeaderBanner.tsx](file:///d:/Github/Dashboard-Meteo-Sense/components/ui/PageHeaderBanner.tsx)**: Komponen banner terpadu berdesain modern, compact, fleksibel, dengan tema gradien (`indigo`, `teal`, `sky`, `purple`, `emerald`, `blue`, `slate`), badge kategori, deskripsi ringkas, dan slot aksi di kanan.

### Halaman Kasus Utama Penggabungan Banner Bertumpuk
- **[MODIFY] [SubpageHeader.tsx](file:///d:/Github/Dashboard-Meteo-Sense/components/climate-drivers/SubpageHeader.tsx)**:
  - Ditambahkan dukungan prop `lastUpdated?: string`.
  - Desain disesuaikan menjadi compact (`p-4 sm:p-5`).
  - Badge "Terakhir Diperbarui" disatukan di sisi kanan banner.
- **[MODIFY] [climate-drivers/page.tsx](file:///d:/Github/Dashboard-Meteo-Sense/app/dashboard/climate-drivers/page.tsx)**:
  - Diberikan `lastUpdated={summary.lastUpdated}` ke `SubpageHeader`.
  - Menghapus kartu hero kedua bertumpuk ("Memahami 3 Pilar Dinamika Iklim Global di Balik Cuaca Indonesia").
- **[MODIFY] [MonsoonIndicesHeader.tsx](file:///d:/Github/Dashboard-Meteo-Sense/components/indeks-monsun/MonsoonIndicesHeader.tsx)**:
  - Ditambahkan prop `lastUpdated?: string`.
  - Padding dirampingkan menjadi `p-4 sm:p-5`.
  - Menyatukan badge waktu pembaruan langsung di sisi kanan banner.
- **[MODIFY] [indeks-monsun/page.tsx](file:///d:/Github/Dashboard-Meteo-Sense/app/dashboard/indeks-monsun/page.tsx)**:
  - Menghapus hero card kedua ("Memantau Dinamika Monsun Australia...").
- **[MODIFY] [klimatologi/page.tsx](file:///d:/Github/Dashboard-Meteo-Sense/app/dashboard/klimatologi/page.tsx)**:
  - Header utama di atas dirampingkan (`p-4 sm:p-5`).
  - Banner gradien besar di dalam Tab 3 (ERA5) diubah menjadi sub-header tab kompak dengan border subtle, sehingga halaman klimatologi memiliki tepat 1 banner utama di atas.

### Standardisasi Sub-Halaman Lainnya
- **[MODIFY] [air-quality/page.tsx](file:///d:/Github/Dashboard-Meteo-Sense/app/dashboard/air-quality/page.tsx)**: Menggunakan `PageHeaderBanner` compact bertema `sky`.
- **[MODIFY] [meteorologi/page.tsx](file:///d:/Github/Dashboard-Meteo-Sense/app/dashboard/meteorologi/page.tsx)**: Menggantikan header teks polos dengan `PageHeaderBanner` bertema `blue`.
- **[MODIFY] [peta/page.tsx](file:///d:/Github/Dashboard-Meteo-Sense/app/dashboard/peta/page.tsx)**: Menggunakan `PageHeaderBanner` bertema `indigo` dengan quick search dan refresh.
- **[MODIFY] [data/page.tsx](file:///d:/Github/Dashboard-Meteo-Sense/app/dashboard/data/page.tsx)**: Menggunakan `PageHeaderBanner` bertema `slate`.
- **[MODIFY] [laporan/page.tsx](file:///d:/Github/Dashboard-Meteo-Sense/app/dashboard/laporan/page.tsx)**: Menggunakan `PageHeaderBanner` bertema `blue` dengan selector stasiun terintegrasi.
- **[MODIFY] [kalibrasi/page.tsx](file:///d:/Github/Dashboard-Meteo-Sense/app/dashboard/kalibrasi/page.tsx)**: Menggunakan `PageHeaderBanner` bertema `blue` dengan tombol aksi ilmiah.
- **[MODIFY] [perangkat/page.tsx](file:///d:/Github/Dashboard-Meteo-Sense/app/dashboard/perangkat/page.tsx)**: Menggunakan `PageHeaderBanner` bertema `blue` dengan tombol Tambah Perangkat.
- **[MODIFY] [perangkat-benchmark/page.tsx](file:///d:/Github/Dashboard-Meteo-Sense/app/dashboard/perangkat-benchmark/page.tsx)**: Menggunakan `PageHeaderBanner` bertema `indigo`.
- **[MODIFY] [prakirawan/page.tsx](file:///d:/Github/Dashboard-Meteo-Sense/app/dashboard/prakirawan/page.tsx)**: Menyatukan header teks luar dan header kartu form menjadi 1 `PageHeaderBanner` bertema `sky`.
- **[MODIFY] [agromet/page.tsx](file:///d:/Github/Dashboard-Meteo-Sense/app/dashboard/agromet/page.tsx)**: Merampingkan banner dari `p-8 rounded-3xl` menjadi `p-4 sm:p-5 rounded-2xl`.
- **[MODIFY] [reanalisis-era5/page.tsx](file:///d:/Github/Dashboard-Meteo-Sense/app/dashboard/reanalisis-era5/page.tsx)**: Menggunakan `PageHeaderBanner` bertema `purple`.
- **[MODIFY] [backup-sqlite/page.tsx](file:///d:/Github/Dashboard-Meteo-Sense/app/dashboard/backup-sqlite/page.tsx)**: Menggunakan `PageHeaderBanner` bertema `blue`.
- **[MODIFY] [profil/page.tsx](file:///d:/Github/Dashboard-Meteo-Sense/app/dashboard/profil/page.tsx)**: Menggunakan `PageHeaderBanner` bertema `indigo` dengan tombol keluar akun.
- **[MODIFY] [manager/page.tsx](file:///d:/Github/Dashboard-Meteo-Sense/app/dashboard/manager/page.tsx)**: Menggunakan `PageHeaderBanner` bertema `indigo` dengan dialog Tambah Pengguna.
- **[UNTOUCHED] [app/dashboard/page.tsx](file:///d:/Github/Dashboard-Meteo-Sense/app/dashboard/page.tsx)**: Dipertahankan tanpa banner (sesuai instruksi pengecualian).

---

## 3. Hasil Pengujian & Verifikasi
- Perintah `npm run build` dijalankan dan **berhasil dengan exit code 0** (58/58 rute statis & dinamis ter-compile sempurna tanpa error).
- Tidak ada double banner bertumpuk yang membuang ruang vertikal.
- Seluruh sub-halaman dashboard memiliki konsistensi visual yang rapi dan elegan.
