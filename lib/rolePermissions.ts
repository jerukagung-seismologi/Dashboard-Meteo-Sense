export type UserRole = "Admin" | "User";

export interface NavigationItemWithRole {
  name: string;
  href: string;
  icon: any;
  requiredRole?: UserRole[];
  badge?: string;
}

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  Admin: [
    "dashboard",
    "perangkat",
    "peta",
    "agromet",
    "analisis",
    "data",
    "laporan",
    "prakirawan",
    "profil",
  ],
  User: [
    "dashboard",
    "profil",
  ],
};

export const canAccessRoute = (userRole: UserRole | null, route: string): boolean => {
  if (!userRole) return false;
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.some(perm => route.includes(perm));
};

export const filterNavigationByRole = (
  navigation: NavigationItemWithRole[],
  userRole: UserRole | null
): NavigationItemWithRole[] => {
  if (!userRole) return [];
  const permissions = ROLE_PERMISSIONS[userRole];
  return navigation.filter(item => {
    const routeName = item.href.split("/").pop();
    return permissions.includes(routeName || "");
  });
};
