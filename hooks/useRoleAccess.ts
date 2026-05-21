"use client"

import { useAuth } from "@/hooks/useAuth"
import { canAccessRoute, getNavItemsByRole, getUserRole, type UserRole } from "@/lib/RolePermission"

export const useRoleAccess = () => {
  const { user, profile, loading } = useAuth()
  const userRole = getUserRole(profile)

  return {
    userRole,
    loading,
    canAccess: (route: string) => canAccessRoute(userRole, route),
    getNavItems: (allNavItems: any[]) => getNavItemsByRole(userRole, allNavItems),
  }
}
