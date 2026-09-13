"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Sun, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { NavigationItem } from "./navigation"

interface SidebarProps {
  navigation: NavigationItem[]
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export function Sidebar({ navigation, sidebarOpen, setSidebarOpen }: SidebarProps) {
  const pathname = usePathname()
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (sidebarOpen && overlayRef.current && event.target === overlayRef.current) {
        setSidebarOpen(false)
      }
    }

    document.addEventListener("click", handleOutsideClick)
    return () => document.removeEventListener("click", handleOutsideClick)
  }, [sidebarOpen, setSidebarOpen])

  // Mobile overlay - only for small screens with smooth fade
  const mobileOverlay = (
    <div 
      ref={overlayRef}
      className={cn(
        "fixed inset-0 z-40 bg-gray-950/60 backdrop-blur-xs lg:hidden transition-opacity duration-300",
        sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}
      onClick={() => setSidebarOpen(false)}
    />
  )

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-2xl lg:m-4 m-3">
      {/* Header with logo - mobile only, since we're showing logo in Topbar on desktop */}
      <div className="flex items-center h-16 px-4 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-800 lg:hidden">
        <div className="p-2 bg-orange-600 rounded-xl shadow-md">
          <Sun className="h-6 w-6 text-white" />
        </div>
        <span className="ml-2.5 text-lg font-extrabold text-gray-900 dark:text-white flex-1 tracking-tight">Meteo Sense</span>
        {/* Close button - mobile only */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(false)}
          className="h-9 w-9 rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 lg:hidden"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Tutup menu</span>
        </Button>
      </div>
      
      {/* Navigation area with gradient background */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-blue-50/50 dark:from-slate-900 dark:to-slate-950/80">
        {/* Main navigation */}
        <nav className="flex-1 space-y-1.5 px-3 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "group flex items-center px-3 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200",
                  isActive
                    ? "bg-blue-600 text-white dark:bg-blue-600 shadow-md font-bold"
                    : "text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-slate-800/80 hover:text-blue-700 dark:hover:text-blue-300"
                )}
              >
                <item.icon 
                  className={cn(
                    "mr-3 h-5 w-5 transition-all duration-200 shrink-0",
                    isActive
                      ? "text-white"
                      : "text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                  )} 
                />
                <span className="truncate">{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )

  return (
    <>
      {mobileOverlay}
      
      {/* Mobile sidebar - smooth slide-in drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden transition-visibility duration-300",
          sidebarOpen ? "pointer-events-auto visible" : "pointer-events-none invisible"
        )}
        aria-modal="true"
      >
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] flex flex-col transition-transform duration-300 ease-in-out",
            sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
          )}
        >
          {sidebarContent}
        </div>
      </div>

      {/* Desktop sidebar - height fixed to match content area */}
      <div className="h-full hidden lg:block">
        {sidebarContent}
      </div>
    </>
  )
}