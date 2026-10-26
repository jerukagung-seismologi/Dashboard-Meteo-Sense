<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Tropical Dynamics vs. Global Climate Drivers & UI Layout Conventions

### 1. Domain Separation
- **Global Climate Drivers (`/dashboard/climate-drivers`)**:
  - Keep this module dedicated to macro-scale global ocean-atmosphere teleconnections: ENSO (El Niño / La Niña in Pacific), IOD (Indian Ocean Dipole in Indian Ocean), and Seasonal Monsoon circulation (Asia-Australia).
- **Tropical Dynamics & Waves (`/dashboard/tropical-dynamics`)**:
  - Maintain a dedicated sidebar navigation menu for synoptic & intraseasonal tropical atmospheric dynamics: Madden-Julian Oscillation (MJO), Convectively Coupled Kelvin Waves (KW), Equatorial Rossby Waves (ER), Mixed Rossby-Gravity Waves (MRG), Wheeler-Hendon RMM Phase Diagrams, and NCICS Equatorial Hovmöller Satellite Diagnostics.

### 2. Dashboard UI Layout Ergonomics (Anti-Long-Scroll)
- Never stack multiple heavy visualizers (e.g. 4-wave stacked maps, ECMWF 46-day ensemble, NCICS maps, and 5-year historical tables) vertically on a single page.
- Organize complex scientific and meteorological modules using high-contrast, theme-aware tabs (`Tabs` / `TabsContent`), modular cards, and lightbox modals so that each view remains compact, performant, and legible without excessive vertical scrolling.

### 3. Meteorological Standards: Relative Humidity (RH) Error Correction
- **Absolute Physical Boundaries (0% - 100%)**:
  - Neither relative humidity values nor their uncertainty intervals $(RH \pm \Delta RH)$ may ever exceed $100\%$ or fall below $0\%$.
  - Upper error bounds must be physically clamped: $\Delta RH \le \min(\Delta RH, 100 - RH, RH)$ with a practical floor of $2\%$.
- **Robust Multi-Model Ensemble Spread**:
  - Use sample standard deviation ($\sigma$) or IQR across ensemble members rather than the raw $(\max - \min)/2$ range to eliminate distortions from single outlier NWP models.
- **Diurnal Saturation Consistency**:
  - Near dew-point saturation ($RH \ge 90\%$, e.g., dawn/night conditions), humidity uncertainty must contract toward the physical saturation ceiling ($\Delta RH \le 5\%$).

### 4. GIS & Map Visualization Conventions: Fullscreen & Viewport Ergonomics
- **Dual-Layer Fullscreen Strategy**:
  - Peta GIS harus mendukung mode layar penuh menggunakan arsitektur dual-layer: CSS viewport expansion (`fixed inset-0 z-[9999] w-screen h-screen`) dikombinasikan dengan Native Browser Fullscreen API (`requestFullscreen` / `exitFullscreen`).
- **Leaflet Invalidation Handling**:
  - Setiap perubahan mode viewport atau resize kontainer peta WAJIB memicu `map.invalidateSize({ pan: false })` dengan staggered debouncing (0ms, 150ms, 350ms) guna mencegah distorsi atau *tile gray-out*.
- **HUD & Interactivity Invariants**:
  - Saat berada dalam mode layar penuh, kontrol utama (Layer Selector, Geo-focus, Stasiun Search, dan Telemetry Badges) harus tetap dapat diakses melalui floating HUD berlatar `backdrop-blur` tanpa menutupi area observasi utama.
  - Sediakan selalu tombol keluar cepat dan shortcut tombol `Escape`.

### 5. Standard Kop & Format Pelaporan Resmi (Weather & Climate Report Standardization)
- **Logo Resmi & Atribut Cross-Origin**:
  - Setiap modal ekspor, cetak, atau halaman dokumen laporan (Laporan Harian, Laporan Bulanan, Laporan Curah Hujan, Buletin/Laporan Dinamika Tropis) WAJIB menyertakan logo resmi instansi `/img/logo.webp` dengan properti `crossOrigin="anonymous"`.
  - Dilarang keras menggunakan placeholder SVG kotak generik untuk identitas instansi pada dokumen laporan resmi.
- **Struktur Kop Surat Resmi**:
  - Sub-judul instansi: `Jerukagung Meteorologi • Automatic Weather Station` atau `Jerukagung Seismologi & Meteorologi • MeteoSense`.
  - Judul Dokumen Utama: Huruf kapital tebal (misal: `LAPORAN DINAMIKA GELOMBANG ATMOSFER TROPIS`, `LAPORAN CUACA HARIAN`).
  - Garis batas tegas `border-b-4 border-slate-800` dipadukan dengan aksen batang warna gradien (`bg-gradient-to-r from-orange-400 via-sky-400 to-blue-500 rounded-full`).
  - Panel metadata sisi kanan: Mencantumkan Tanggal Data/Analisis, Status Observasi/Prediksi, dan Waktu Kompilasi/Cetak.
- **Standar Footer Dokumen**:
  - Menyertakan sumber data resmi (BoM, NOAA, NCICS, ECMWF, atau AWS lokal), atribusi otomatis oleh sistem *MeteoSense Dashboard*, serta penegasan bahwa dokumen dihasilkan otomatis dan sah tanpa tanda tangan basah.
- **Konsistensi Multi-Halaman & Ekspor (PNG / PDF A4 / Print)**:
  - Tata letak kop, logo, dan penomoran halaman harus konsisten baik pada pratinjau kontinu (PNG), pemecahan multi-halaman A4 (PDF), maupun dialog cetak bawaan browser (`@media print`).
