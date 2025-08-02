import React from 'react';
import Header from '@/components/header';
import Footer from '@/components/footer';

const DokumentasiPage = () => {
  return (
    <>
      <Header />
      <div className="bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto p-8 font-sans">
          <header className="mb-12">
            <h1 className="text-5xl font-bold mb-4 text-gray-900 dark:text-white">
              Dokumentasi Aplikasi Dashboard Meteo Sense
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Panduan lengkap untuk memulai dengan Dashboard Meteo Sense.
            </p>
          </header>

          <article className="prose prose-lg max-w-none dark:prose-invert prose-a:text-blue-600 hover:prose-a:text-blue-500">
            <section id="pendahuluan" className="mb-12">
              <h2 className="text-3xl font-semibold mb-4 text-gray-800 dark:text-gray-200 border-b pb-2">Pendahuluan</h2>
              <p>
                Selamat datang di dokumentasi resmi untuk aplikasi Dashboard Meteo Sense. Dokumen ini bertujuan untuk memberikan panduan lengkap tentang cara menggunakan berbagai fitur yang tersedia di dalam aplikasi. Meteo Sense adalah platform untuk memonitoring data sensor cuaca secara real-time dan historis.
              </p>
            </section>

            <section id="dashboard-utama" className="mb-12">
              <h2 className="text-3xl font-semibold mb-4 text-gray-800 dark:text-gray-200 border-b pb-2">Dashboard Utama</h2>
              <p>
                Dashboard utama adalah halaman pertama yang Anda lihat setelah login. Halaman ini menampilkan ringkasan data terkini dari semua sensor yang terhubung.
              </p>
              <ul>
                <li><code>Kartu Sensor:</code> Setiap sensor (misalnya suhu, kelembaban, tekanan udara) ditampilkan dalam kartu terpisah yang menunjukkan nilai saat ini.</li>
                <li><code>Status Perangkat:</code> Indikator status untuk menunjukkan apakah perangkat sensor online atau offline.</li>
                <li><code>Pembaruan Real-time:</code> Data pada dashboard diperbarui secara otomatis tanpa perlu me-refresh halaman.</li>
              </ul>
            </section>

            <section id="halaman-grafik" className="mb-12">
              <h2 className="text-3xl font-semibold mb-4 text-gray-800 dark:text-gray-200 border-b pb-2">Halaman Grafik</h2>
              <p>
                Halaman ini menyediakan visualisasi data historis dalam bentuk grafik. Anda dapat menganalisis tren dan pola data dari waktu ke waktu.
              </p>
              <ul>
                <li><code>Pemilihan Rentang Waktu:</code> Anda dapat memilih rentang waktu tertentu (misalnya 24 jam terakhir, 7 hari terakhir, atau rentang kustom) untuk melihat data historis.</li>
                <li><code>Interaktivitas Grafik:</code> Arahkan kursor ke grafik untuk melihat nilai data pada titik waktu tertentu.</li>
                <li><code>Ekspor Data:</code> Fitur untuk mengunduh data grafik dalam format CSV atau gambar.</li>
              </ul>
            </section>

            <section id="kontrol-perangkat" className="mb-12">
              <h2 className="text-3xl font-semibold mb-4 text-gray-800 dark:text-gray-200 border-b pb-2">Kontrol Perangkat</h2>
              <p>
                Jika sistem Anda mendukung aktuator atau perangkat yang dapat dikontrol, halaman ini memungkinkan Anda untuk mengelolanya dari jarak jauh.
              </p>
              <ul>
                <li><code>Tombol Kontrol:</code> Menyalakan atau mematikan perangkat seperti kipas, pemanas, atau penyiram tanaman.</li>
                <li><code>Mode Otomatis:</code> Mengatur aturan agar perangkat dapat beroperasi secara otomatis berdasarkan data sensor (misalnya, nyalakan kipas jika suhu melebihi 30°C).</li>
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
