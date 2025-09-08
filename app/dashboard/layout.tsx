"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LayoutDashboard, Network, FileText, Database, ChartNoAxesCombined, User } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { signOutUser } from "@/lib/FetchingAuth"
import { MobileSidebar } from "@/components/dashboard/MobileSidebar"
import { DesktopSidebar } from "@/components/dashboard/DesktopSidebar"
import { Topbar } from "@/components/dashboard/Topbar"
import type { NavigationItem } from "@/components/dashboard/navigation"
import Loading from "../loading"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile, loading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  const handleLogout = async () => {
    try {
      await signOutUser()
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  if (loading) {
    return <Loading/>
  }

  if (!user) {
    return null
  }

  const navigation: NavigationItem[] = [
    { name: "Beranda", href: "/dashboard", icon: LayoutDashboard },
    { name: "Perangkat", href: "/dashboard/perangkat", icon: Network },
    { name: "Data", href: "/dashboard/data", icon: Database },
    { name: "Analisis", href: "/dashboard/analisis", icon: ChartNoAxesCombined },
    { name: "Laporan", href: "/dashboard/laporan", icon: FileText },
    { name: "Profil", href: "/dashboard/profil", icon: User },
  ]

  return (
    <div className="min-h-screen bg-gray-200 dark:bg-slate-900">
      <MobileSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} navigation={navigation} />
      <DesktopSidebar navigation={navigation} />

      {/* Main content */}
      <div className="lg:pl-64">
          <Topbar 
            user={user} 
            profile={profile} 
            setSidebarOpen={setSidebarOpen} 
            handleLogout={handleLogout} 
          />
        {/* Page content */}
        <main className="py-6">
          <div className="px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  )
}