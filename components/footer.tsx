import Link from "next/link"
import Image from "next/image"
import { MapPin, Phone, Mail, Instagram, Facebook, Twitter, Youtube } from "lucide-react"

function NavigationLinks() {
  return (
    <ul className="space-y-2">
      <li>
        <Link href="/" className="text-primary-100 hover:text-white text-sm">
          Beranda
        </Link>
      </li>
      <li>
        <Link href="/riset" className="text-primary-100 hover:text-white text-sm">
          Riset
        </Link>
      </li>
      <li>
        <Link href="/timkami" className="text-primary-100 hover:text-white text-sm">
          Tim Kami
        </Link>
      </li>
      <li>
        <Link href="/data" className="text-primary-100 hover:text-white text-sm">
          Data
        </Link>
      </li>
      <li>
        <Link href="/grafik" className="text-primary-100 hover:text-white text-sm">
          Grafik
        </Link>
      </li>
    </ul>
  )
}

export default function Footer() {
  return (
    <footer>
      <div className="bg-emerald-700 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="relative w-10 h-10 mr-2">
                  <Image src="/img/logo.png" alt="Jerukagung Meteorologi Logo" fill className="object-contain" />
                </div>
                <span className="text-lg font-medium">Jerukagung Seismologi</span>
              </div>
              <p className="text-sm text-primary-100 mb-4">
                Pusat Riset dan Pengembangan Ilmu Kebumian.
              </p>
              <div className="flex space-x-3">
                <a href="#" className="bg-white/10 hover:bg-white/20 p-2 rounded-full">
                  <Facebook className="h-5 w-5" />
                  <span className="sr-only">Facebook</span>
                </a>
                <a href="#" className="bg-white/10 hover:bg-white/20 p-2 rounded-full">
                  <Twitter className="h-5 w-5" />
                  <span className="sr-only">Twitter</span>
                </a>
                <a href="https://www.instagram.com/jeris_seismologi/" className="bg-white/10 hover:bg-white/20 p-2 rounded-full">
                  <Instagram className="h-5 w-5" />
                  <span className="sr-only">Instagram</span>
                </a>
                <a href="#" className="bg-white/10 hover:bg-white/20 p-2 rounded-full">
                  <Youtube className="h-5 w-5" />
                  <span className="sr-only">YouTube</span>
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Navigasi</h3>
              <NavigationLinks />
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Kontak</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary-300" />
                  <span className="text-sm">Jerukagung, Klirong, Kebumen, Indonesia</span>
                </li>
                <li className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-primary-300" />
                  <span className="text-sm">+62 882 2541 8750</span>
                </li>
                <li className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary-300" />
                  <a href="mailto:jerisresearch@gmail.com" className="text-sm text-primary-100 hover:text-white">
                    jerisresearch@gmail.com
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white mt-8 pt-8 text-center">
            <p className="text-sm text-primary-100">&copy; 2025 Jerukagung Meteorologi. All Rights Reserved.</p>
          </div>
        </div>
      </div>
      <a href="https://showyourstripes.info/" target="_blank" rel="noopener noreferrer" className="block w-full">
        <Image
          src="https://showyourstripes.info/stripes/ASIA-Indonesia-Yogyakarta-1866-2024-BK.png"
          alt="Global warming stripes by Professor Ed Hawkins (University of Reading)"
          width={1000}
          height={30}
          className="warming-stripes"
        />
      </a>
    </footer>
  )
}