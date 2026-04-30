// lib/auth/auth-context.tsx
"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

export type AppUser = {
  id: string;
  email: string | null;
  user_metadata: Record<string, any>;
  full_name: string | null;
  avatar_url: string | null;
  subscription_tier: "free" | "pro";
  subscription_status: string;
};

type AuthContextType = {
  user: AppUser | null;
  loading: boolean;
  refreshAuth: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Simple in-memory cache so fast navigation doesn't re-fetch
let _cache: { user: AppUser | null; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAuth = useCallback(async (force = false) => {
    // Return cached value if still fresh
    if (!force && _cache && Date.now() - _cache.ts < CACHE_TTL) {
      setUser(_cache.user);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json().catch(() => ({ user: null }));
      const fetchedUser = data.user ?? null;

      // Update cache
      _cache = { user: fetchedUser, ts: Date.now() };
      setUser(fetchedUser);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const signOut = useCallback(async () => {
    // Clear cache immediately
    _cache = null;
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    } finally {
      setUser(null);
      router.replace("/login");
      router.refresh();
    }
  }, [router]);

  const value = useMemo(
    () => ({ user, loading, refreshAuth: () => refreshAuth(true), signOut }),
    [user, loading, refreshAuth, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
