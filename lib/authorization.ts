import { UserProfile } from "@/lib/FetchingAuth"

export type UserRole = "Admin" | "User"

export const ROLE_PERMISSIONS = {
  Admin: [
    "view_dashboard",
    "manage_devices",
    "view_all_reports",
    "view_analytics",
    "manage_users",
    "view_sensor_data",
    "manage_settings",
    "view_agromet",
    "view_predictions",
    "view_maps",
    "view_database",
  ],
  User: [
    "view_dashboard",
    "view_own_devices",
    "submit_reports",
    "view_own_data",
  ],
}

export const hasPermission = (role: UserRole | undefined, permission: string): boolean => {
  if (!role) return false
  const permissions = ROLE_PERMISSIONS[role] || []
  return permissions.includes(permission)
}

export const isAdmin = (profile: UserProfile | null): boolean => {
  return profile?.role === "Admin"
}

export const canAccessFeature = (userProfile: UserProfile | null, requiredRole: UserRole): boolean => {
  if (!userProfile) return false
  
  // Admin dapat mengakses semua fitur
  if (userProfile.role === "Admin") return true
  
  // User hanya bisa akses fitur User
  return requiredRole === "User"
}
