# Learning Proposal: Separation of Tropical Dynamics & Modular Dashboard Layouts

## 1. Context & Motivation
Dari masukan pengguna:
> *"aku merasa untuk semua bagian tropis sebaiknya dibuat menu di bagian kiri tersendiri, jangan digabung dengan Indeks iklim global, benar kan? kalau bisa disempurnakan kembali agar dalam satu halaman nantinya tidak terlalu panjang"*

Secara meteorologis dan UX:
1. **Pemisahan Domain Ilmiah**:
   - **Indeks Iklim Global (Macro Climate Drivers)**: Meliputi telekoneksi laut-atmosfer antarsamudra skala antar-tahunan / multi-musiman (*interannual/seasonal*), yaitu ENSO (Niño 3.4, ONI, SOI) di Samudra Pasifik, IOD (DMI) di Samudra Hindia, dan sirkulasi Monsun Asia-Australia.
   - **Dinamika Atmosfer Tropis (Tropical Dynamics & Waves)**: Meliputi fenomena intraseasonal dan gelombang atmosfer ekuatorial konvektif (*Convectively Coupled Equatorial Waves*), yaitu MJO (30–60 hari), Gelombang Kelvin, Gelombang Rossby Ekuatorial (ER), Gelombang Mixed Rossby-Gravity (MRG), diagram fase Wheeler-Hendon RMM, dan peta diagnostik Hovmöller NCICS/NOAA.
2. **Pola Desain UI/UX Dashboard (Anti-Long-Scroll)**:
   - Hindari menumpuk semua grafik, peta, model prediksi, dan tabel historis ke dalam satu halaman vertikal yang sangat panjang (*endless scroll overload*).
   - Gunakan arsitektur berbasis tab tematik (*tabbed modular views*) atau kartu tersegmentasi yang proporsional sehingga setiap tampilan fokus, rapi, dan mudah dibaca pada satu layar tanpa scroll berlebihan.

---

## 2. Classification & Target
- **Classification**: Workspace Rule (Prinsip Desain & Arsitektur Menu Dashboard Meteo-Sense).
- **Target File**: `AGENTS.md` (atau aturan arsitektur dashboard di workspace).

```markdown
### Tropical Dynamics vs. Global Climate Drivers Navigation Convention
1. **Domain Boundary**:
   - Keep `/dashboard/climate-drivers` dedicated to macro-scale climate drivers (ENSO, IOD, Monsoon).
   - Provide a dedicated sidebar navigation item for Tropical Dynamics (`/dashboard/tropical-dynamics`) covering MJO, Kelvin Waves, Equatorial Rossby Waves, MRG Waves, Wheeler-Hendon RMM Phase Diagrams, and Equatorial Hovmöller Diagnostics.
2. **Dashboard Layout Ergonomics**:
   - Never stack multiple heavy visualizers (e.g. 4-wave stacked maps + ECMWF 46-day ensemble + NCICS satellite maps + 5-year historical tables) in one long vertical page.
   - Organize related sub-modules using high-contrast tabs, segmented view-modes, or collapsible panels so that each view stays compact, performant, and legible without excessive vertical scrolling.
```

---

## 3. Implementation Steps
1. Tambahkan menu navigasi `"Dinamika Atmosfer Tropis"` di `lib/navigation.ts` dengan ikon `Waves`, badge `"Tropis"`, dan rute `/dashboard/tropical-dynamics`.
2. Buat halaman baru `app/dashboard/tropical-dynamics/page.tsx` dengan tata letak tab modular (5 Tab: *Peta Gelombang Tropis*, *Diagram Fase RMM & ECMWF*, *Diagnostik NCICS & Hovmöller*, *Struktur Teori Gelombang*, *Riwayat Historis*).
3. Rapikan `app/dashboard/climate-drivers/page.tsx` agar fokus murni pada ENSO, IOD, dan Monsun dengan banner penghubung yang elegan ke Dinamika Tropis.
4. Buat redirect / integrasi bersih pada `/dashboard/climate-drivers/mjo` ke Dinamika Tropis.
