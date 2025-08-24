import React from 'react';
import Header from '@/components/header';
import Footer from '@/components/footer';

// CodeLabel component for consistent styling
const CodeLabel = ({ children }: { children: React.ReactNode }) => (
  <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-gray-800 dark:text-gray-200">
    {children}
  </code>
);

const DokumentasiPage = () => {
  return (
    <>
      <Header />
      <div className="bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto p-8 font-sans">
          <header className="mb-12">
            <h1 className="text-3xl font-bold mb-4 text-gray-800 dark:text-gray-200">
              Dokumentasi Aplikasi Dashboard Meteo Sense
            </h1>
            <p className="text-xl text-gray-700 dark:text-gray-300">
              Panduan lengkap untuk memulai dengan Dashboard Meteo Sense.
            </p>
          </header>

          <article className="prose prose-lg max-w-none dark:prose-invert prose-a:text-blue-600 hover:prose-a:text-blue-500">

            <section id="dashboard-utama" className="mb-12">
              <h2 className="text-3xl font-semibold mb-4 text-gray-800 dark:text-gray-200 border-b pb-2">Dashboard Utama</h2>
              <p className="mb-4 text-gray-700 dark:text-gray-300">
                Dashboard utama adalah halaman pertama yang Anda lihat setelah login. Halaman ini menampilkan ringkasan data terkini dari semua sensor yang terhubung.
              </p>
              <ul className="text-gray-700 dark:text-gray-300">
                <li><CodeLabel>Kartu Sensor:</CodeLabel> Setiap sensor (misalnya suhu, kelembaban, tekanan udara) ditampilkan dalam kartu terpisah yang menunjukkan nilai saat ini.</li>
                <li><CodeLabel>Status Perangkat:</CodeLabel> Indikator status untuk menunjukkan apakah perangkat sensor online atau offline.</li>
                <li><CodeLabel>Pembaruan Real-time:</CodeLabel> Data pada dashboard diperbarui secara otomatis tanpa perlu me-refresh halaman.</li>
              </ul>
            </section>

            <section id="halaman-grafik" className="mb-12">
              <h2 className="text-3xl font-semibold mb-4 text-gray-800 dark:text-gray-200 border-b pb-2">Halaman Grafik</h2>
              <p className="mb-4 text-gray-700 dark:text-gray-300">
                Halaman ini menyediakan visualisasi data historis dalam bentuk grafik. Anda dapat menganalisis tren dan pola data dari waktu ke waktu.
              </p>
              <ul className="text-gray-700 dark:text-gray-300">
                <li><CodeLabel>Pemilihan Rentang Waktu:</CodeLabel> Anda dapat memilih rentang waktu tertentu (misalnya 24 jam terakhir, 7 hari terakhir, atau rentang kustom) untuk melihat data historis.</li>
                <li><CodeLabel>Interaktivitas Grafik:</CodeLabel> Arahkan kursor ke grafik untuk melihat nilai data pada titik waktu tertentu.</li>
                <li><CodeLabel>Ekspor Data:</CodeLabel> Fitur untuk mengunduh data grafik dalam format CSV atau gambar.</li>
              </ul>
            </section>

            <section id="kontrol-perangkat" className="mb-12">
              <h2 className="text-3xl font-semibold mb-4 text-gray-800 dark:text-gray-200 border-b pb-2">Kontrol Perangkat</h2>
              <p className="mb-4 text-gray-700 dark:text-gray-300" >
                Jika sistem Anda mendukung aktuator atau perangkat yang dapat dikontrol, halaman ini memungkinkan Anda untuk mengelolanya dari jarak jauh.
              </p>
              <ul className="text-gray-700 dark:text-gray-300">
                <li><CodeLabel>Tombol Kontrol:</CodeLabel> Menyalakan atau mematikan perangkat seperti kipas, pemanas, atau penyiram tanaman.</li>
                <li><CodeLabel>Mode Otomatis:</CodeLabel> Mengatur aturan agar perangkat dapat beroperasi secara otomatis berdasarkan data sensor (misalnya, nyalakan kipas jika suhu melebihi 30°C).</li>
              </ul>
            </section>
          </article>

          <footer className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-700 text-center text-gray-500 dark:text-gray-400">
            <p>&copy; {new Date().getFullYear()} Meteo Sense. All Rights Reserved.</p>
          </footer>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default DokumentasiPage;
