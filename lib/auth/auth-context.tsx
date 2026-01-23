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

type AppUser = {
  id: string;
  email: string | null;
  user_metadata: Record<string, any>;
};

type AuthContextType = {
  user: AppUser | null;
  loading: boolean;
  refreshAuth: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json().catch(() => ({ user: null }));
      setUser(data.user ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const signOut = useCallback(async () => {
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
    () => ({ user, loading, refreshAuth, signOut }),
    [user, loading, refreshAuth, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
