import Link from "next/link"
import { Button } from "@/components/ui/button"
import type { NavigationItem } from "./types"
import { X, Sun } from "lucide-react"

interface MobileSidebarProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  navigation: NavigationItem[]
}

export function MobileSidebar({ sidebarOpen, setSidebarOpen, navigation }: MobileSidebarProps) {
  return (
    <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? "block" : "hidden"}`}>
      {/* Backdrop overlay */}
      <div className="fixed inset-0 bg-gray-600 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      
      {/* Sidebar panel */}
      <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 shadow-xl rounded-sm overflow-hidden">
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4 bg-gradient-to-r from-green-600 to-green-700 rounded-sm">
          <div className="flex items-center">
            <div className="p-2 bg-orange-600 rounded-sm shadow-md">
              <Sun className="h-6 w-6 text-white" />
            </div>
            <span className="ml-2 text-lg font-bold text-white">Meteo Sense</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)} className="text-white hover:bg-green-500/30">
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-5 bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-gray-800 overflow-y-auto">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="group flex items-center px-3 py-2.5 text-sm font-medium rounded-sm text-gray-700 dark:text-gray-200 hover:bg-blue-100 dark:hover:bg-gray-700 hover:text-blue-800 dark:hover:text-blue-300 transition-all duration-200"
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400 group-hover:text-blue-700 dark:group-hover:text-blue-300" />
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}
