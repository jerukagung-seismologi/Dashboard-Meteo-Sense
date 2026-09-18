# Learning Proposal: Standar Sains Klimatologi (WMO & BMKG)

## 1. Identifikasi & Klasifikasi
* **Kategori**: Rule Proyek (`.agents/rules/climatology-standards.md` atau `AGENTS.md`)
* **Pemicu**: Koreksi/arahan eksplisit dari pengguna (`/goal /learn kita harus lebih condong ke sudut pandang klimatologi`).
* **Akar Masalah**: Sebelumnya modul analisis klimatologi lebih banyak menampilkan visualisasi cuaca historis jangka pendek dan data 1 tahun, bukan metodologi klimatologis baku (Normal 30-tahun WMO, Oldeman, Schmidt-Ferguson, Walter-Lieth, ETCCDI, SPI).

## 2. Usulan Aturan (Proposed Rule)
Tambahkan aturan berikut ke panduan pengembangan sistem:

```markdown
# Standar Sains Klimatologi (WMO & BMKG)

Setiap kali mengembangkan atau memperbarui fitur yang berkaitan dengan **Klimatologi** di repositori ini:
1. **Acuan Normal Klimatologis Wajib 30-Tahun**: Jangan pernah menggunakan data 1 tahun sebelumnya sebagai "Normal Klimatologis". Acuan normal wajib merujuk pada standar resmi WMO 30-Year Climatological Standard Normal (1991–2020).
2. **Sistem Klasifikasi Iklim Resmi Indonesia**: Sertakan klasifikasi iklim baku:
   - **Oldeman (1975)**: Kriteria Bulan Basah (>200 mm), Bulan Lembap (100–200 mm), Bulan Kering (<100 mm) untuk zonasi agroekologi dan rekomendasi pola tanam pangan.
   - **Schmidt-Ferguson (1951)**: Rasio nilai Q (%) untuk kehutanan dan tata air.
   - **Köppen-Geiger**: Klasifikasi zona tropis (Af, Am, Aw).
3. **Diagram Iklim Walter-Lieth (Climograph)**: Sajikan diagram Walter-Lieth dengan rasio baku 1°C = 2 mm/bulan (P = 2T) untuk memvisualisasikan periode kering (arid) vs periode basah (humid).
4. **Indeks Ekstrem Iklim ETCCDI**: Gunakan indeks inti WMO/ETCCDI (RX1day, RX5day, SDII, R10mm, R20mm, R50mm, R95p, R99p, SU35, DTR).
5. **Indeks Kekeringan Terstandar (SPI)**: Gunakan Standardized Precipitation Index (SPI-1, SPI-3, SPI-6) sesuai skala kategori resmi WMO.
6. **Zona Musim (ZOM) BMKG**: Terapkan kriteria baku Awal Musim Hujan (AMH) dan Kemarau (AMK) berbasis kalender 36 dasarian.
```

## 3. Rencana Aksi Setelah Persetujuan
Setelah disetujui, aturan ini akan ditambahkan ke file konfigurasi agen proyek agar tetap konsisten untuk tugas-tugas berikutnya.
