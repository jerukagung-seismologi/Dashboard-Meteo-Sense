"use server"

import { ArrowRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import Header from "@/components/header"
import Footer from "@/components/footer"
import ParticleBackground from "@/components/ParticleBackground"

export default async function LandingPage() {
  return (
    <>
      <Header />
      {/* Hero Section (particles only here) */}
      <section className="relative h-[80vh] flex items-center justify-center overflow-hidden">
        <ParticleBackground />
        {/* Overlay made more transparent to let particles show through */}
        <div className="absolute inset-0 pointer-events-none bg-white dark:bg-gray-900" />
        <div className="relative z-10 container mx-auto px-4 flex flex-col items-center text-center">
          <div className="mb-6 animate-fade-in">
            <Image 
            src="/img/logo.webp" 
            alt="Logo Jerukagung Seismologi" 
            width={150} 
            height={150} 
            className="object-contain" 
            />
          </div>
          <h1 className="text-5xl md:text-5xl font-extrabold mb-6 text-[#0B3954] dark:text-primary-50 drop-shadow-lg animate-slide-up">
            Meteo Sense
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-200 mb-8 max-w-2xl drop-shadow-lg animate-fade-in">
            Aplikasi Pemantauan dan Analisis Data Jaringan Sensor Cuaca
          </p>
          <Button size="lg" asChild className="bg-primary-700 text-white hover:bg-primary-800 mb-4 animate-pop">
            <Link href="/login" className="flex items-center gap-2">
              Akses Platform<ArrowRight className="w-5 h-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Tentang Section (no particles here) */}
      <section className="py-12 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-50 mb-4">Tentang Meteo Sense</h2>
            <p className="text-gray-700 dark:text-gray-50 mb-2">
              Meteo Sense adalah platform digital untuk pemantauan, analisis, dan penelitian cuaca menggunakan jaringan sensor IoT. Menyediakan data atmosfer real-time dari sensor, visualisasi, dan fitur kolaborasi untuk mendukung inovasi di bidang meteorologi.
            </p>
          </div>
          <div className="relative z-20 flex-1 flex justify-center">
            <img src="/img/produk.webp" 
            alt="Tentang Meteo Sense" 
            className="w-64 h-64 object-contain rounded-full" />
          </div>
        </div>
      </section>
      <div className="relative z-20">
        <Footer />
      </div>
    </>
  )
}