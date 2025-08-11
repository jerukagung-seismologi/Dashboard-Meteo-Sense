import Link from "next/link"
import { Button } from "@/components/ui/button"
import Image from "next/image";
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
      <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
      <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
        <div className="flex h-16 items-center justify-between px-4  bg-green-700">
          <div className="flex items-center">
            <div className="p-2 bg-orange-600 rounded-lg">
              <Sun className="h-6 w-6 text-white" />
            </div>
            <span className="ml-2 text-lg font-bold text-white">Meteo Sense</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-blue-200 hover:text-blue-800 transition-all duration-2000"
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}
