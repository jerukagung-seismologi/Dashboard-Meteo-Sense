"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Inter } from "next/font/google"
import { LayoutDashboard, Network, FileText, Database, Earth, Sprout, ChartNoAxesCombined, User, CloudRain } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { signOutUser } from "@/lib/FetchingAuth"
import { Sidebar } from "@/components/dashboard/Sidebar"
import { Topbar } from "@/components/dashboard/Topbar"
import { dashboardNavigation } from "@/lib/navigation"
import Loading from "@/app/loading"
const inter = Inter({ subsets: ["latin"] });

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile, loading, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const navigation = dashboardNavigation.filter(item =>
    item.roles?.includes(profile?.role || 'User')
  )

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
      return
    }

    if (!loading && profile) {
      const currentRoute = dashboardNavigation.find(item => item.href === pathname)
      if (currentRoute && !currentRoute.roles?.includes(profile.role)) {
        // If user tries to access a page they don't have permission for, redirect them.
        router.push('/dashboard')
      }
    }
  }, [user, profile, loading, router, pathname])

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  if (loading) {
    return <Loading/>
  }

  if (!user || !profile) {
    return null
  }

  // The navigation constant is now filtered above based on role.
  // const navigation: NavigationItem[] = [ ... ] // This is removed.

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      {/* Topbar now spans full width */}
      <Topbar 
        user={user} 
        profile={profile} 
        setSidebarOpen={setSidebarOpen} 
        handleLogout={handleLogout}
        navigation={navigation} // Pass navigation to Topbar
      />

      {/* Mobile Drawer (active on small screens) */}
      <div className="lg:hidden">
        <Sidebar 
          navigation={navigation}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
      </div>

      {/* Content area with sidebar and main content */}
      <div className="flex h-[calc(100dvh-4rem)]">
        {/* Sidebar - fixed position on desktop only */}
        <aside className="hidden lg:block lg:w-64 flex-shrink-0 h-[calc(100dvh-4rem)] overflow-hidden">
          <Sidebar 
            navigation={navigation}
            sidebarOpen={false}
            setSidebarOpen={setSidebarOpen}
          />
        </aside>

        {/* Main content - scrollable with min-w-0 to prevent flex blowout */}
        <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
          <main className="py-4 sm:py-6">
            <div className="px-3 sm:px-6 lg:px-8 max-w-full">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}