# Walkthrough: Migrasi Tailwind CSS v4

Berhasil memutakhirkan seluruh stack styling proyek **Dashboard Meteo Sense** dari Tailwind CSS v3.4 ke **Tailwind CSS v4.3.3 (CSS-First Engine)**.

---

## 🚀 Perubahan yang Dilakukan

### 1. Dependensi (`package.json`)
- **Dihapus**:
  - `autoprefixer`: Tidak lagi diperlukan karena Tailwind v4 menggunakan engine Lightning CSS bawaan untuk vendor prefixing.
  - `tailwindcss-animate`: Plugin legacy v3.
- **Ditambahkan & Diperbarui**:
  - `tailwindcss`: Diperbarui dari `^3.4.17` ke `^4.3.3`.
  - `@tailwindcss/postcss`: Ditambahkan ke `devDependencies` (`^4.3.3`).
  - `tw-animate-css`: Ditambahkan (`^1.4.0`) untuk kompatibilitas animasi shadcn/ui (dialog, sheet, popover, tooltip, dropdown).
  - `tailwind-merge`: Diperbarui dari `^2.5.5` ke `^3.7.0` untuk parsing class utility v4.

---

### 2. PostCSS (`postcss.config.mjs`)
- Mengganti plugin dari `tailwindcss` ke `@tailwindcss/postcss`:
```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
```

---

### 3. Konfigurasi CSS-First (`app/globals.css`)
- Menggantikan direktif `@tailwind base; @tailwind components; @tailwind utilities;` dengan:
  ```css
  @import "tailwindcss";
  @import "tw-animate-css";

  @custom-variant dark (&:where(.dark, .dark *));
  ```
- Mendefinisikan seluruh variabel tema di dalam blok `@theme`:
  - Variabel warna semantik shadcn/ui (`--color-background`, `--color-foreground`, `--color-primary`, dll.)
  - Skala warna resmi **WMO Blue** (`--color-primary-50` hingga `--color-primary-900`)
  - Variabel sidebar & charts BMKG
  - Border radius kustom (`--radius-lg`, `--radius-md`, `--radius-sm`)
  - Keyframe animasi accordion (`accordion-down`, `accordion-up`)
- Mengonversi utilitas kustom scrollbar (`.scrollbar-none`, `.no-scrollbar`, `.touch-pan`) dan container (`@utility container`) ke direktif `@utility` modern.

---

### 4. Konfigurasi Shadcn/UI (`components.json`)
- Mengosongkan `"config": ""` di `components.json` agar CLI shadcn membaca langsung dari `app/globals.css`.
- Menghapus file usang `tailwind.config.ts`.

---

## 🧪 Verifikasi & Validasi

1. **Production Build (`npm run build`)**:
   - Berhasil mengompilasi seluruh **58 rute & halaman** (termasuk halaman `/dashboard/indeks-monsun`, `/dashboard/meteorologi`, `/dashboard/data`, dll.) dengan kode exit `0`.
2. **Kompilasi Runtime**:
   - Rute utama dan API server merespons dengan status `200 OK`.
3. **Dark Mode & Styling**:
   - Mekanisme dark mode manual via `next-themes` (`.dark`) tetap bekerja dengan varian `@custom-variant dark (&:where(.dark, .dark *))`.
