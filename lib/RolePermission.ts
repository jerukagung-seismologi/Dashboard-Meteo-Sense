import { UserProfile } from "@/lib/FetchingAuth"

export type UserRole = "Admin" | "User"

// Define permission untuk setiap role
const rolePermissions: Record<UserRole, string[]> = {
  Admin: [
    "/dashboard",
    "/dashboard/perangkat",
    "/dashboard/peta",
    "/dashboard/agromet",
    "/dashboard/analisis",
    "/dashboard/data",
    "/dashboard/laporan",
    "/dashboard/prakirawan",
    "/dashboard/profil",
  ],
  User: [
    "/dashboard",
    "/dashboard/profil",
  ],
}

/**
 * Cek apakah user dengan role tertentu dapat mengakses route
 */
export const canAccessRoute = (userRole: UserRole | null, route: string): boolean => {
  if (!userRole) return false
  const permissions = rolePermissions[userRole]
  return permissions.includes(route)
}

/**
 * Get navigation items berdasarkan role
 */
export const getNavItemsByRole = (role: UserRole | null, allNavItems: any[]) => {
  if (!role) return []

  if (role === "Admin") {
    return allNavItems
  }

  if (role === "User") {
    return allNavItems.filter((item) => 
      item.href === "/dashboard" || item.href === "/dashboard/profil"
    )
  }

  return []
}

/**
 * Get user role dari profile
 */
export const getUserRole = (profile: UserProfile | null): UserRole | null => {
  return profile?.role || null
}
