# Dashboard Meteo-Sense

Dashboard Meteo-Sense adalah aplikasi web dasbor yang dirancang untuk memantau dan melaporkan data dari sensor cuaca secara real-time. Aplikasi ini dibangun menggunakan Next.js dan terintegrasi dengan Firebase Realtime Database untuk pengambilan data yang efisien.

## Fitur Utama

-   **Visualisasi Data Sensor**: Menampilkan data cuaca seperti suhu, kelembapan, tekanan udara, titik embun, dan curah hujan.
-   **Pemilihan Rentang Tanggal**: Pengguna dapat memilih rentang tanggal khusus untuk menganalisis data historis. Terdapat juga opsi cepat untuk memilih 7, 14, atau 30 hari terakhir.
-   **Agregasi Data**: Data mentah dari sensor diagregasi secara otomatis ke dalam ringkasan per jam dan per hari untuk mempermudah analisis.
-   **Laporan Dinamis**: Menghasilkan laporan cuaca yang terstruktur berdasarkan rentang tanggal yang dipilih.
-   **Fungsi Cetak**: Laporan dapat dicetak langsung dari browser dengan format A4 yang sudah dioptimalkan.
-   **Notifikasi Real-time**: Menggunakan notifikasi (toast) untuk memberikan umpan balik kepada pengguna saat memuat data, menerapkan filter, atau saat proses cetak.
-   **Dukungan Multi-Sensor**: Arsitektur dirancang untuk dapat beralih antara beberapa sensor (saat ini diimplementasikan untuk satu sensor).

## Tumpukan Teknologi

-   **Framework**: [Next.js](https://nextjs.org/) (React)
-   **Bahasa**: [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
-   **Database**: [Firebase Realtime Database](https://firebase.google.com/docs/database)
-   **Manajemen State**: React Hooks (`useState`, `useEffect`, `useRef`)
-   **Pencetakan**: `react-to-print`

## Memulai

Untuk menjalankan proyek ini secara lokal, ikuti langkah-langkah berikut:

### Prasyarat

-   Node.js (v18.x atau lebih baru)
-   npm, yarn, atau pnpm

### Instalasi

1.  **Clone repository ini:**
    ```bash
    git clone https://github.com/Dashboard-Meteo-Sense.git
    cd Dashboard-Meteo-Sense
    ```

2.  **Install dependensi:**
    ```bash
    npm install
    # atau
    yarn install
    # atau
    pnpm install
    ```

3.  **Konfigurasi Firebase:**
    -   Buat proyek baru di [Firebase Console](https://console.firebase.google.com/).
    -   Aktifkan Realtime Database.
    -   Dapatkan kredensial konfigurasi Firebase Anda (apiKey, authDomain, databaseURL, dll.).
    -   Buat file `.env.local` di root proyek dan tambahkan kredensial Anda di sana. Contohnya ada di `lib/ConfigFirebase.ts`.

    ```env
    # .env.local
    NEXT_PUBLIC_FIREBASE_API_KEY="your_api_key"
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your_auth_domain"
    NEXT_PUBLIC_FIREBASE_DATABASE_URL="your_database_url"
    NEXT_PUBLIC_FIREBASE_PROJECT_ID="your_project_id"
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your_storage_bucket"
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your_messaging_sender_id"
    NEXT_PUBLIC_FIREBASE_APP_ID="your_app_id"
    ```

4.  **Jalankan server pengembangan:**
    ```bash
    npm run dev
    ```

    Buka [http://localhost:3000](http://localhost:3000) di browser Anda untuk melihat hasilnya.

## Struktur Proyek

-   `app/dashboard/laporan/page.tsx`: Komponen utama halaman pelaporan yang menangani logika state, pengambilan data, dan rendering UI.
-   `lib/FetchingSensorData.ts`: Kumpulan fungsi untuk berinteraksi dengan Firebase Realtime Database, seperti mengambil, mengedit, dan menghapus data sensor.
-   `lib/ConfigFirebase.ts`: File konfigurasi untuk inisialisasi koneksi Firebase.
-   `components/ui/`: Komponen UI yang dapat digunakan kembali dari shadcn/ui.
-   `hooks/`: Berisi custom hooks, seperti `use-toast` untuk notifikasi.