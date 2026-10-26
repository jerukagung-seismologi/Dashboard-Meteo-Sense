# Learning Proposal: Standarisasi Format Pelaporan Resmi & Kop Dokumen MeteoSense

## 1. Analisis & Konteks
Berdasarkan masukan pengguna:
> *"untuk bagian dinamika tropis bisakah agar laporannya mirip sepeti dalam menu laporan cuaca, ada logonya juga? paham?"*

Di sistem **MeteoSense Dashboard**, pelaporan dinas dan siap cetak (pada modul Laporan Cuaca Harian, Laporan Bulanan, Curah Hujan, serta Dinamika Tropis) harus memiliki identitas visual dan struktur dokumen resmi yang seragam dan konsisten.

---

## 2. Klasifikasi Aturan (Classification)
- **Tipe**: **Workspace Rule** (Aturan Tetap Repositori).
- **Berkas Target**: [AGENTS.md](file:///d:/Github/Dashboard-Meteo-Sense/AGENTS.md).
- **Bagian yang Diusulkan**: Menambahkan **Bagian 5** pada `AGENTS.md`.

---

## 3. Usulan Penambahan Aturan pada `AGENTS.md`

```markdown
### 5. Standard Kop & Format Pelaporan Resmi (Weather & Climate Report Standardization)
- **Logo Resmi & Atribut Cross-Origin**:
  - Setiap modal ekspor, cetak, atau halaman dokumen laporan (Laporan Harian, Laporan Bulanan, Laporan Curah Hujan, Buletin/Laporan Dinamika Tropis) WAJIB menyertakan logo resmi instansi `/img/logo.webp` dengan properti `crossOrigin="anonymous"`.
  - Hindari penggunaan placeholder SVG generik untuk identitas instansi pada dokumen laporan resmi.
- **Struktur Kop Surat Resmi**:
  - Sub-judul instansi: `Jerukagung Meteorologi • Automatic Weather Station` atau `Jerukagung Seismologi & Meteorologi • MeteoSense`.
  - Judul Dokumen Utama: Huruf kapital tebal (misal: `LAPORAN DINAMIKA GELOMBANG ATMOSFER TROPIS`, `LAPORAN CUACA HARIAN`).
  - Garis batas tegas `border-b-4 border-slate-800` dipadukan dengan aksen batang warna gradien (`bg-gradient-to-r from-orange-400 via-sky-400 to-blue-500 rounded-full`).
  - Panel metadata sisi kanan: Mencantumkan Tanggal Data/Analisis, Status Observasi/Prediksi, dan Waktu Kompilasi/Cetak.
- **Standar Footer Dokumen**:
  - Menyertakan sumber data resmi (BoM, NOAA, NCICS, ECMWF, atau AWS lokal), atribusi otomatis oleh sistem *MeteoSense Dashboard*, serta penegasan bahwa dokumen dihasilkan otomatis dan sah tanpa tanda tangan basah.
- **Konsistensi Multi-Halaman & Ekspor (PNG / PDF A4 / Print)**:
  - Tata letak kop, logo, dan penomoran halaman harus konsisten baik pada pratinjau kontinu (PNG), pemecahan multi-halaman A4 (PDF), maupun dialog cetak bawaan browser (`@media print`).
```

---

## 4. Status Implementasi
- Komponen [TropicalWavesExportModal.tsx](file:///d:/Github/Dashboard-Meteo-Sense/components/climate-drivers/TropicalWavesExportModal.tsx) dan [page.tsx](file:///d:/Github/Dashboard-Meteo-Sense/app/dashboard/tropical-dynamics/page.tsx) telah disesuaikan dan diuji lulus TypeScript (`npx tsc --noEmit`), serta di-push ke GitHub.
- Aturan di atas siap ditambahkan ke [AGENTS.md](file:///d:/Github/Dashboard-Meteo-Sense/AGENTS.md) setelah mendapatkan konfirmasi persetujuan pengguna.
