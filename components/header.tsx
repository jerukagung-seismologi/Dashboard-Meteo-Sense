"use client"

import Link from "next/link"
import Image from "next/image"
import { ThemeToggle } from "@/components/theme-toggle"

export default function Header() {
  return (
    <header className="bg-emerald-700 text-white py-3">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <div className="relative w-12 h-12 mr-3">
              <Image src="/img/logo.png" alt="Jerukagung Meteorologi Logo" fill className="object-contain" priority />
            </div>
            <div>
              <h1 className="text-lg font-medium leading-tight text-white">Jerukagung Seismologi</h1>
              <p className="text-xs text-white">Riset dan Pengembangan Ilmu Kebumian</p>
            </div>
          </Link>
          <div className="hidden md:flex items-center space-x-4">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  )
}
