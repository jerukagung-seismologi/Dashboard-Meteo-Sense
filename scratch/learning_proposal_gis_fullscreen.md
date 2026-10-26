# Proposal Pembelajaran (/learn): Standar Layar Penuh (Fullscreen) & Viewport Ergonomics pada GIS Peta

## 1. Klasifikasi & Cakupan
- **Tipe**: Workspace Rule & Architecture Pattern (GIS Viewport & Fullscreen Ergonomics)
- **Target Berkas**: [AGENTS.md](file:///d:/Github/Dashboard-Meteo-Sense/AGENTS.md)
- **Komponen Terdampak**:
  - [Map.tsx](file:///d:/Github/Dashboard-Meteo-Sense/components/peta/Map.tsx)
  - [page.tsx](file:///d:/Github/Dashboard-Meteo-Sense/app/dashboard/peta/page.tsx)
  - Komponen GIS masa depan (radar precipitation map, wind stream overlay, satellite GIS)

---

## 2. Latar Belakang & Masalah
Pada pemantauan cuaca dan kebencanaan meteorologis, pengamatan spasial memerlukan kanvas visual seluas mungkin tanpa distraksi elemen sidebar, header, dan banner dashboard:
1. **Keterbatasan Viewport Embedded**: Kanvas peta default berukuran terbatas (`h-[52vh] sm:h-[calc(100dvh-220px)]`), menyulitkan pengamatan analisis spasial sebaran multi-stasiun otomatis (AWS) sekaligus.
2. **Isu Leaflet Tile Rendering (Gray Out)**: Mengubah dimensi kontainer peta secara dinamis sering mengakibatkan tile peta Leaflet terdistorsi atau abu-abu jika `map.invalidateSize()` tidak dipanggil setelah transisi selesai.
3. **Kerapuhan Native Fullscreen API**: Mengandalkan `requestFullscreen()` semata dapat gagal pada lingkungan iframe, mobile WebView, atau browser dengan kebijakan fullscreen ketat.

---

## 3. Rekomendasi Pola Standar (Best Practice)

### Pilar 1: Dual-Layer Fullscreen Architecture
- Gunakan kombinasi kelas CSS `fixed inset-0 z-[9999] w-screen h-screen` bersamaan dengan `document.documentElement.requestFullscreen()` (dengan pengecekan `fullscreenEnabled` dan fallback graceful).
- Dengan pendekatan ini, peta dijamin mengambil seluruh viewport 100% baik saat browser mengizinkan native fullscreen maupun saat fallback ke viewport-fill CSS.

### Pilar 2: Staggered `map.invalidateSize()` Controller
- Karena transisi CSS dan fullscreen browser memerlukan waktu reflow rendering (100–300ms), pasang listener di komponen controller peta Leaflet yang memanggil `map.invalidateSize({ pan: false })` secara bertahap (immediate, 100ms, 300ms, 500ms).

### Pilar 3: Immersive Telemetry HUD & Contextual Controls
- Seluruh kontrol esensial (Layer Switcher, Fokus Kebumen, Bidikan Semua Titik Stasiun, Quick Search, dan Mini-telemetry summary suhu/kelembapan) harus tetap mengambang di atas kanvas peta dengan z-index `z-[1000]`.
- Sediakan akses keluar yang intuitif: Tombol "Keluar" (Minimize icon) dan event listener keyboard `Escape`.

---

## 4. Teks Aturan untuk Ditambahkan ke AGENTS.md

```markdown
### 4. GIS & Map Visualization Conventions: Fullscreen & Viewport Ergonomics
- **Dual-Layer Fullscreen Strategy**:
  - Peta GIS harus mendukung mode layar penuh menggunakan arsitektur dual-layer: CSS fixed layout (`fixed inset-0 z-[9999] w-screen h-screen`) dikombinasikan dengan Native Browser Fullscreen API (`requestFullscreen` / `exitFullscreen`).
- **Leaflet Invalidation Handling**:
  - Setiap perubahan mode viewport atau resize kontainer peta WAJIB memicu `map.invalidateSize({ pan: false })` dengan staggered debouncing (0ms, 150ms, 350ms) guna mencegah distorsi atau *tile gray-out*.
- **HUD & Interactivity Invariants**:
  - Saat berada dalam mode layar penuh, kontrol utama (Layer Selector, Geo-focus, Stasiun Search, dan Telemetry Badges) harus tetap dapat diakses melalui floating HUD berlatar `backdrop-blur` tanpa menutupi area observasi utama.
  - Sediakan selalu tombol keluar cepat dan shortcut tombol `Escape`.
```
