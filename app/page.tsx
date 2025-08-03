import { CloudSun, LineChart, FlaskRoundIcon as Flask, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import Header from "@/components/header"
import Footer from "@/components/footer"

export default function LandingPage() {
  return (
    <>
      <Header />
      {/* Hero Section */}
      <section className="relative h-[70vh] flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-amber-100 dark:from-gray-900 dark:via-gray-800 dark:to-primary-900 overflow-hidden">
        {/* Background Image & Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-primary-50/60 to-orange-100/80 dark:from-gray-900/80 dark:via-gray-800/60 dark:to-primary-900/80"></div>
        <div className="relative z-10 container mx-auto px-4 flex flex-col items-center text-center">
          <div className="mb-6 animate-fade-in">
            <CloudSun className="h-16 w-16 text-primary-500 drop-shadow-xl mx-auto" />
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 text-primary-700 dark:text-primary-50 drop-shadow-lg animate-slide-up">
            Meteo Sense
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-200 mb-8 max-w-2xl drop-shadow-lg animate-fade-in">
            Platform pemantauan dan analisis cuaca serta iklim. Mendukung penelitian, pengembangan, dan akses data atmosfer secara real-time.
          </p>
          <Button size="lg" asChild className="bg-primary-700 text-white hover:bg-primary-800 mb-4 animate-pop">
            <Link href="/login" className="flex items-center gap-2">
              Daftar Sekarang <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>
          <span className="text-gray-500 dark:text-gray-400 text-sm">Mulai akses data dan fitur Meteo Sense</span>
        </div>
      </section>

      {/* Tentang Section */}
      <section className="py-12 bg-white dark:bg-gray-800">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-50 mb-4">Tentang Meteo Sense</h2>
            <p className="text-gray-700 dark:text-gray-50 mb-2">
              Meteo Sense adalah platform digital untuk pemantauan, analisis, dan penelitian cuaca menggunakan jaringan sensor IoT. Menyediakan data atmosfer real-time dari sensor, visualisasi, dan fitur kolaborasi untuk mendukung inovasi di bidang meteorologi.
            </p>
            <p className="text-gray-600 dark:text-gray-50">
              Bergabunglah bersama komunitas kami untuk mengakses data, pengembangan instrumen, dan metode pemantauan terbaru.
            </p>
          </div>
          <div className="flex-1 flex justify-center">
            <img src="/img/produk.jpg" 
            alt="Tentang Meteo Sense" 
            className="w-64 h-64 object-contain rounded-full" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gradient-to-br from-primary-50 via-white to-primary-100 dark:from-gray-900 dark:via-gray-800 dark:to-primary-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold text-primary-700 dark:text-primary-50 mb-4">Fitur Utama</h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Meteo Sense menyediakan layanan pemantauan cuaca, analisis data iklim, serta mendukung penelitian dan pengembangan sains atmosfer.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 border-t-4 border-primary-500 hover:scale-105 transition-transform duration-200">
              <div className="flex justify-center mb-4">
                <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-full shadow">
                  <CloudSun className="h-10 w-10 text-primary-500" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-center mb-3 text-gray-900 dark:text-white">Pemantauan Cuaca</h3>
              <p className="text-gray-600 dark:text-gray-300 text-center">
                Data cuaca terkini dan historis untuk memahami kondisi Atmosfer
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 border-t-4 border-primary-500 hover:scale-105 transition-transform duration-200">
              <div className="flex justify-center mb-4">
                <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-full shadow">
                  <LineChart className="h-10 w-10 text-primary-500" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-center mb-3 text-gray-900 dark:text-white">Analisis Data</h3>
              <p className="text-gray-600 dark:text-gray-300 text-center">
                Visualisasi dan analisis data iklim untuk mendukung pengambilan keputusan.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 border-t-4 border-primary-500 hover:scale-105 transition-transform duration-200">
              <div className="flex justify-center mb-4">
                <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-full shadow">
                  <Flask className="h-10 w-10 text-primary-500" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-center mb-3 text-gray-900 dark:text-white">
                Penelitian & Pengembangan
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-center">
                Kolaborasi lintas bidang untuk inovasi instrumen dan metode pemantauan atmosfer.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-primary-700 via-primary-600 to-primary-500 dark:bg-gradient-to-r dark:from-slate-700 dark:via-slate-600 dark:to-slate-500 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Gabung Komunitas Meteo Sense</h2>
          <p className="max-w-2xl mx-auto mb-8">
            Dapatkan akses ke data, analisis, dan fitur terbaru untuk mendukung penelitian dan pemantauan cuaca di Jerukagung.
          </p>
          <Button size="lg" asChild className="bg-white text-primary-700 hover:bg-gray-100 font-semibold text-lg px-8 py-4 shadow-lg animate-pop">
            <Link href="/login" className="flex items-center gap-2">
              Daftar Sekarang <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>
        </div>
      </section>
      <Footer />
    </>
  )
}