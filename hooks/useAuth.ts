// hooks/useAuth.ts
"use client";

import { useAuthContext } from "@/context/AuthContext";
import type { UserProfile } from "@/lib/FetchingAuth";

/**
 * Custom hook to access global authenticated user state and profile.
 * Consumes unified AuthProvider context.
 */
export const useAuth = () => {
  return useAuthContext();
};

export { UserProfile };
