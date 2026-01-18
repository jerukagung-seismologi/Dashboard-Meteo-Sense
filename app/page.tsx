"use server"

import { ArrowRight, ShieldCheck, CloudSun, Code } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import Header from "@/components/header"
import Footer from "@/components/footer"
import ParticleBackground from "@/components/ParticleBackground"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header/>
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative py-20 flex items-center justify-center overflow-hidden">
          <ParticleBackground />
          <div className="absolute inset-0 pointer-events-none bg-gray-100/80 dark:bg-gray-900/80" />
          <div className="relative z-10 container mx-auto px-4 flex flex-col items-center text-center">
            <div className="mb-4 animate-fade-in">
              <Image 
                src="/img/logo.webp" 
                alt="Logo Jerukagung Seismologi" 
                width={120} 
                height={120} 
                className="object-contain" 
              />
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-[#0B3954] dark:text-primary-50 drop-shadow-lg animate-slide-up">
              Selamat Datang di Platform Meteo Sense
            </h1>
            <p className="text-lg md:text-xl text-gray-700 dark:text-gray-200 mb-10 max-w-3xl drop-shadow-lg animate-fade-in">
              Pilih peran Anda untuk melanjutkan ke platform Meteo Sense.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
              {/* Card Admin */}
              <Card className="bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm border-primary-200 dark:border-primary-800 animate-fade-in">
                <CardHeader className="items-center">
                  <ShieldCheck className="w-12 h-12 text-primary-700 dark:text-primary-50 mb-2" />
                  <CardTitle className="text-2xl text-[#0B3954] dark:text-white">Sistem</CardTitle>
                  <CardDescription className="text-center">Akses penuh untuk manajemen sistem, pengguna, dan konfigurasi sensor.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  <Button size="lg" asChild className="bg-primary-700 text-white hover:bg-primary-800 w-full">
                    <Link href="/login" className="flex items-center gap-2">
                      Login Platform <ArrowRight className="w-5 h-5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Card Observasi */}
              <Card className="bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm border-primary-200 dark:border-primary-800 animate-fade-in" style={{animationDelay: '200ms'}}>
                <CardHeader className="items-center">
                  <CloudSun className="w-12 h-12 text-primary-700 dark:text-primary-50 mb-2" />
                  <CardTitle className="text-2xl text-[#0B3954] dark:text-white">Observasi</CardTitle>
                  <CardDescription className="text-center">Akses untuk memantau data cuaca real-time, visualisasi, dan analisis.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  <Button size="lg" asChild className="bg-primary-700 text-white hover:bg-primary-800 w-full">
                    <Link href="/observasi" className="flex items-center gap-2">
                      Form Pengamatan Visual <ArrowRight className="w-5 h-5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Card Developer */}
              <Card className="bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm border-primary-200 dark:border-primary-800 animate-fade-in" style={{animationDelay: '400ms'}}>
                <CardHeader className="items-center">
                  <Code className="w-12 h-12 text-primary-700 dark:text-primary-50 mb-2" />
                  <CardTitle className="text-2xl text-[#0B3954] dark:text-white">Developer</CardTitle>
                  <CardDescription className="text-center">Akses untuk informasi pengembangan, pemeliharaan, dan integrasi sistem lebih lanjut.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  <Button size="lg" asChild className="bg-primary-700 text-white hover:bg-primary-800 w-full">
                    <Link href="/doc" className="flex items-center gap-2">
                      Dokumentasi Developer <ArrowRight className="w-5 h-5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <Footer/>
    </div>
  )
}