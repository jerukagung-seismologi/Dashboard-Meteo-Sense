"use client"

import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Header from "@/components/header"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"

export default function KatalogPage() {
  const products = [
    {
      id: "1",
      title: "Sensor Seismik Digital",
      description: "Sensor canggih untuk mendeteksi getaran seismik dengan presisi tinggi. Cocok untuk stasiun pemantauan gempa.",
      image: "/img/produk/sensor-seismik.jpg",
      link: "/katalog/sensor-seismik",
    },
    {
      id: "2",
      title: "Data Logger Kebumian",
      description: "Perangkat pencatat data yang andal untuk mengumpulkan dan menyimpan data dari berbagai sensor geofisika.",
      image: "/img/produk/data-logger.jpg",
      link: "/katalog/data-logger",
    },
    {
      id: "3",
      title: "Software Analisis Seismogram",
      description: "Perangkat lunak intuitif untuk menganalisis data seismogram, membantu dalam penelitian dan pemantauan.",
      image: "/img/produk/software-analisis.jpg",
      link: "/katalog/software-analisis",
    },
  ]

  return (
    <>
      <Header />
      <Navbar />
      <div className="bg-gray-100 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <h2 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-gray-100">
            Katalog Produk
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((project) => (
              <Card key={project.id} className="flex flex-col overflow-hidden">
                <div className="relative h-48 w-full">
                  <Image
                    src={project.image || "/placeholder.svg"}
                    alt={project.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <CardHeader>
                  <CardTitle>{project.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-gray-600 dark:text-gray-300">{project.description}</p>
                </CardContent>
                <CardFooter>
                  <Link href={project.link} passHref>
                    <Button>Baca Selengkapnya</Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
