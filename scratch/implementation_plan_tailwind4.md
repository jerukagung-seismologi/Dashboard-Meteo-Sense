# Upgrade Tailwind CSS v3 to Tailwind CSS v4

Rencana komprehensif untuk memutakhirkan proyek **Dashboard Meteo Sense** dari Tailwind CSS v3.4 ke Tailwind CSS v4.0 (CSS-first engine) dengan dukungan penuh untuk Next.js (App Router), `shadcn/ui`, dan dark mode class-based (`next-themes`).

## User Review Required

> [!IMPORTANT]
> **Tailwind CSS v4 merupakan pembaruan arsitektural besar (*major release*)**:
> 1. **CSS-First Configuration**: Konfigurasi tema berpindah dari JavaScript/TypeScript (`tailwind.config.ts`) ke file CSS utama (`app/globals.css`) menggunakan direktif `@import "tailwindcss";` dan `@theme`.
> 2. **PostCSS Plugin**: Paket PostCSS berubah dari `tailwindcss` menjadi `@tailwindcss/postcss`. `autoprefixer` tidak lagi diperlukan karena mesin Lightning CSS bawaan Tailwind v4 sudah otomatis menangani prefix vendor.
> 3. **Dark Mode Strategy**: Tailwind v4 secara bawaan memakai media query sistem OS (`prefers-color-scheme`). Untuk mempertahankan mekanisme tombol switch Dark/Light mode berbasis class `.dark` (`next-themes`), ditambahkan `@custom-variant dark (&:where(.dark, .dark *));`.
> 4. **Shadcn Animation**: Plugin legacy `tailwindcss-animate` digantikan oleh paket `tw-animate-css` agar animasi dialog, popover, dropdown, dan accordion `shadcn/ui` tetap berjalan mulus.
> 5. **`tailwind-merge` Upgrade**: Diperbarui ke `tailwind-merge` v3 agar helper `cn()` dapat mengenali sintaks utility kelas Tailwind v4 secara akurat.

---

## Proposed Changes

### 1. Dependencies & Package Management

#### [MODIFY] [package.json](file:///d:/Github/Dashboard-Meteo-Sense/package.json)
- Hapus paket yang sudah usang di v4: `autoprefixer`, `tailwindcss-animate`
- Tambahkan / perbarui paket v4:
  - `tailwindcss`: `^4.0.0`
  - `@tailwindcss/postcss`: `^4.0.0`
  - `tw-animate-css`: `^1.0.0` (kompatibilitas animasi shadcn)
  - `tailwind-merge`: `^3.0.0` (kompatibilitas class merging v4)

---

### 2. Build Tooling & PostCSS

#### [MODIFY] [postcss.config.mjs](file:///d:/Github/Dashboard-Meteo-Sense/postcss.config.mjs)
- Ganti plugin `tailwindcss` menjadi `@tailwindcss/postcss`.
- Hapus referensi `autoprefixer`.

---

### 3. Styling & Design Tokens

#### [MODIFY] [app/globals.css](file:///d:/Github/Dashboard-Meteo-Sense/app/globals.css)
- Ganti `@tailwind base; @tailwind components; @tailwind utilities;` dengan `@import "tailwindcss";` dan `@import "tw-animate-css";`.
- Tambahkan override variant dark mode manual:
  ```css
  @custom-variant dark (&:where(.dark, .dark *));
  ```
- Deklarasikan blok `@theme` untuk memetakan variabel warna semantik shadcn (`--color-background`, `--color-foreground`, `--color-primary`, `--color-border`, `--color-muted`, dll.), skala warna khusus WMO Blue (`--color-primary-50` s/d `--color-primary-900`), radius, serta keyframe accordion.
- Pindahkan utilitas scrollbar (`.no-scrollbar`, `.scrollbar-none`) ke format `@utility` Tailwind v4.

---

### 4. Konfigurasi Shadcn

#### [MODIFY] [components.json](file:///d:/Github/Dashboard-Meteo-Sense/components.json)
- Sesuaikan konfigurasi Tailwind v4 pada `components.json` (menghapus `"config": "tailwind.config.ts"` agar CLI shadcn membaca langsung dari `app/globals.css`).

#### [DELETE] [tailwind.config.ts](file:///d:/Github/Dashboard-Meteo-Sense/tailwind.config.ts)
- Dihapus setelah semua token tema, warna WMO Blue, dan animasi berhasil dimigrasikan ke `@theme` di `globals.css`.

---

## Verification Plan

### Automated Tests
1. **Pemeriksaan Instalasi & Build**:
   ```powershell
   npm install
   npm run build
   ```
2. **Type Check**:
   ```powershell
   npx tsc --noEmit
   ```

### Manual Verification
1. **Verifikasi Dark Mode**:
   - Buka `http://localhost:3000/dashboard/indeks-monsun` dan `http://localhost:3000/dashboard/meteorologi`.
   - Ganti tema terang (light) dan gelap (dark) untuk memastikan variabel HSL dan kelas `dark:*` berpindah secara sempurna.
2. **Verifikasi Komponen Shadcn**:
   - Uji Accordion, Tabs, Tooltip, Dialog/Modal, dan Dropdown menu untuk memastikan styling dan animasinya tidak rusak.
3. **Verifikasi Grafik & Tata Letak**:
   - Pastikan layout grid, card, badges, dan responsive breakpoints (`sm:`, `md:`, `lg:`) tetap presisi seperti sebelumnya.
