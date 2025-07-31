import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"
import { Sun } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Header() {
  return (
    <nav className="sticky top-0 z-50 bg-emerald-500 dark:bg-slate-900 backdrop-blur-md border-b ">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="p-2 bg-orange-600 rounded-lg">
              <Sun className="h-6 w-6 text-white" />
            </div>
            <span className="ml-3 text-xl font-bold text-gray-900 dark:text-gray-300">Meteo Sense</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/login">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">Mulai</Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  )
}
