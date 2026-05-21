import { useAuth } from "@/hooks/useAuth"
import { hasPermission, isAdmin, canAccessFeature, type UserRole } from "@/lib/authorization"

export const useAuthorization = () => {
  const { profile } = useAuth()

  return {
    profile,
    isAdmin: isAdmin(profile),
    hasPermission: (permission: string) => hasPermission(profile?.role, permission),
    canAccess: (requiredRole: UserRole) => canAccessFeature(profile, requiredRole),
  }
}
