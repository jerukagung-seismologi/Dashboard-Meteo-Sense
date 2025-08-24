import { CloudSun, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import Header from "@/components/header"
import Footer from "@/components/footer"
import ParticleBackground from "@/components/ParticleBackground"

export default function LandingPage() {
  return (
    <>
      <Header />
      {/* Hero Section */}
      <ParticleBackground />
      <section className="relative h-[100vh] flex items-center justify-center overflow-hidden">
        {/* Background Image & Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white-50/60 to-white-100/80 dark:from-gray-900/80 dark:via-gray-800/60 dark:to-gray-900/80"></div>
        <div className="relative container mx-auto px-4 flex flex-col items-center text-center">
          <div className="mb-6 animate-fade-in">
            <CloudSun className="h-16 w-16 text-primary-500 drop-shadow-xl mx-auto" />
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 text-primary-700 dark:text-primary-50 drop-shadow-lg animate-slide-up">
            Meteo Sense
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-200 mb-8 max-w-2xl drop-shadow-lg animate-fade-in">
            Platform pemantauan dan analisis cuaca serta iklim. Mendukung penelitian, pengembangan, dan akses data atmosfer secara real-time
          </p>
          <Button size="lg" asChild className="bg-primary-700 text-white hover:bg-primary-800 mb-4 animate-pop">
            <Link href="/login" className="flex items-center gap-2">
              Akses Platform<ArrowRight className="w-5 h-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Tentang Section */}
      <section className="py-12 bg-gradient-to-b from-white/80 via-white-50/60 to-white-100/80 dark:from-gray-900/80 dark:via-gray-800/60 dark:to-gray-900/80">
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
      <Footer />
    </>
  )
}