import { ThemeSwitch } from "@/components/theme-switch"
import { Sun } from "lucide-react"

export default function Header() {
  return (
    <nav className="sticky top-0 z-50 bg-slate-50 dark:bg-slate-900 backdrop-blur-md border-b shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="p-2 bg-orange-600 rounded-lg">
              <Sun className="h-6 w-6 text-white" />
            </div>
            <span className="ml-3 text-xl font-bold text-gray-900 dark:text-gray-300">Meteo Sense</span>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeSwitch/>
          </div>
        </div>
      </div>
    </nav>
  )
}
