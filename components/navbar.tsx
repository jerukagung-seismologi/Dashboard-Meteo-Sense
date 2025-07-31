"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { usePathname } from "next/navigation"
import { ThemeToggle } from "@/components/theme-toggle"

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const navItems = [
    { name: "Beranda", href: "/" },
    { name: "Katalog", href: "/katalog" },
    { name: "Tim Kami", href: "/timkami" }
  ]

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1 h-full">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "px-4 py-2 h-full flex items-center border-b-2 transition-colors text-sm font-medium",
                  pathname === item.href
                    ? "border-primary-500 text-primary-700 dark:text-primary-300"
                    : "border-transparent text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:border-primary-300",
                )}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-gray-700 dark:text-gray-300">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] sm:w-[350px]">
                <div className="flex items-center mb-6">
                  <div className="relative w-10 h-10 mr-2">
                    <Image src="/img/logo.png" alt="Jerukagung Meteorologi Logo" fill className="object-contain" />
                  </div>
                  <div>
                    <h2 className="text-base font-medium">Jerukagung Seismologi</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Riset dan Pengembangan Ilmu Kebumian</p>
                  </div>
                </div>
                <div className="flex flex-col space-y-1">
                  {navItems.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "px-4 py-2 rounded-md text-sm font-medium",
                        pathname === item.href
                          ? "bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
                      )}
                      onClick={() => setIsOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
                <div className="mt-6 border-t pt-4 flex items-center justify-between">
                  <Link href="/autentikasi" passHref>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>
                      Login
                    </Button>
                  </Link>
                  <ThemeToggle />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Login Button */}
          <div className="hidden md:flex items-center">
            <Link href="/login" passHref>
              <Button variant="outline">Login</Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}