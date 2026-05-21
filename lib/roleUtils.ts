import { UserProfile } from "@/lib/FetchingAuth"

export type UserRole = "Admin" | "User"

// Check if user has specific role
export const hasRole = (profile: UserProfile | null, requiredRole: UserRole): boolean => {
  if (!profile) return false
  return profile.role === requiredRole
}

// Check if user is admin
export const isAdmin = (profile: UserProfile | null): boolean => {
  return hasRole(profile, "Admin")
}

// Check if user has any of the required roles
export const hasAnyRole = (profile: UserProfile | null, requiredRoles: UserRole[]): boolean => {
  if (!profile) return false
  return requiredRoles.includes(profile.role)
}

// Filter navigation items based on role
export const filterNavigationByRole = (
  items: any[],
  profile: UserProfile | null
): any[] => {
  return items.filter((item) => {
    // If no role requirement, show to everyone
    if (!item.requiredRole) return true
    
    // Check if user has required role
    return hasAnyRole(profile, Array.isArray(item.requiredRole) ? item.requiredRole : [item.requiredRole])
  })
}
