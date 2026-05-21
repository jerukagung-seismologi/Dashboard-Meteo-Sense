import { UserProfile } from "@/lib/FetchingAuth"
import { canAccessRoute } from "@/lib/rolePermissions"

export const checkRouteAccess = (userProfile: UserProfile | null, pathname: string): boolean => {
  if (!userProfile) return false;
  
  // Extract route name from pathname
  const routeParts = pathname.split("/").filter(Boolean);
  const route = routeParts[routeParts.length - 1] || "dashboard";
  
  return canAccessRoute(userProfile.role as "Admin" | "User", route);
};

export const redirectUnauthorized = (userProfile: UserProfile | null, pathname: string): string | null => {
  if (!userProfile) return "/login";
  
  if (!checkRouteAccess(userProfile, pathname)) {
    return "/dashboard"; // Redirect to dashboard jika user tidak memiliki akses
  }
  
  return null; // Allowed
};
