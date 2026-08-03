// context/AuthContext.tsx
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, onIdTokenChanged, User, signOut } from "firebase/auth";
import { auth } from "@/lib/ConfigFirebase";
import { getUserProfile, type UserProfile } from "@/lib/FetchingAuth";
import { useRouter } from "next/navigation";

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  isAuthorized: (allowedRoles: UserProfile["role"][]) => boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const isAuthorized = (allowedRoles: UserProfile["role"][]) => {
    if (!user || !profile) return false;
    return allowedRoles.includes(profile.role);
  };

  const loadProfile = async (currentUser: User) => {
    try {
      let fetchedProfile = await getUserProfile(currentUser.uid);

      if (!fetchedProfile) {
        // Fallback profile if Firestore document does not exist yet
        fetchedProfile = {
          uid: currentUser.uid,
          email: currentUser.email || "",
          displayName: currentUser.displayName || currentUser.email?.split("@")[0] || "User",
          createdAt: new Date(),
          lastLoginAt: new Date(),
          role: "User",
        };
      }

      setProfile(fetchedProfile);
      setError(null);
    } catch (err: any) {
      console.warn("[AuthContext] Profile fetch warning, using fallback profile:", err);
      // Fallback profile on network/Firestore error to prevent kicking user out
      setProfile({
        uid: currentUser.uid,
        email: currentUser.email || "",
        displayName: currentUser.displayName || currentUser.email?.split("@")[0] || "User",
        createdAt: new Date(),
        lastLoginAt: new Date(),
        role: "User",
      });
      setError(err?.message || "Failed to load profile");
    }
  };

  useEffect(() => {
    // 1. Listen for auth state changes
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await loadProfile(currentUser);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    // 2. Listen for ID token changes to automatically refresh session cookie with long max-age (30 days)
    const unsubscribeToken = onIdTokenChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const idToken = await currentUser.getIdToken();
          document.cookie = `firebaseIdToken=${idToken}; path=/; max-age=2592000; SameSite=Lax`;
        } catch (e) {
          console.warn("[AuthContext] Cookie token refresh error:", e);
        }
      } else {
        document.cookie = "firebaseIdToken=; path=/; max-age=0; SameSite=Lax";
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeToken();
    };
  }, []);

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      setUser(null);
      setProfile(null);
      document.cookie = "firebaseIdToken=; path=/; max-age=0; SameSite=Lax";
      router.replace("/login");
    } catch (err: any) {
      console.error("[AuthContext] Logout error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, error, isAuthorized, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};

export const useAuth = useAuthContext;