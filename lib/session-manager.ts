import { createClient } from "@/lib/supabase/client"

/**
 * Comprehensive session cleanup utility
 */
export class SessionManager {
  static async logout(): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient()

      // 1. Sign out from Supabase
      const { error } = await supabase.auth.signOut()
      if (error) {
        throw new Error(error.message)
      }

      // 2. Clear client-side storage
      await this.clearClientStorage()

      // 3. Clear any cached API data
      await this.clearApiCache()

      return { success: true }
    } catch (error) {
      console.error('Session cleanup error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Clear all client-side storage related to the app
   */
  static async clearClientStorage(): Promise<void> {
    if (typeof window === 'undefined') return

    try {
      // Clear localStorage items
      const localStorageKeysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && this.shouldClearKey(key)) {
          localStorageKeysToRemove.push(key)
        }
      }

      localStorageKeysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key)
        } catch (e) {
          console.warn(`Failed to remove localStorage key: ${key}`, e)
        }
      })

      // Clear sessionStorage completely
      try {
        sessionStorage.clear()
      } catch (e) {
        console.warn('Failed to clear sessionStorage', e)
      }

      // Clear any IndexedDB data if we use it in the future
      if ('indexedDB' in window) {
        try {
          // We can add IndexedDB cleanup here if needed
        } catch (e) {
          console.warn('Failed to clear IndexedDB', e)
        }
      }

    } catch (error) {
      console.warn('Client storage cleanup failed:', error)
    }
  }

  /**
   * Clear API caches and any cached network requests
   */
  static async clearApiCache(): Promise<void> {
    if (typeof window === 'undefined') return

    try {
      // Clear fetch cache if supported
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        )
      }

      // Clear any SWR or React Query cache if we add them later
      // SWR: mutate(() => true, undefined, { revalidate: false })
      // React Query: queryClient.clear()

    } catch (error) {
      console.warn('API cache cleanup failed:', error)
    }
  }

  /**
   * Determine if a localStorage key should be cleared
   */
  private static shouldClearKey(key: string): boolean {
    const appPrefixes = [
      'synthqa-',
      'test-case-',
      'requirement-',
      'generator-',
      'supabase.',
      'sb-',
      'auth-'
    ]

    return appPrefixes.some(prefix => key.startsWith(prefix))
  }

  /**
   * Force a complete app reload to ensure clean state
   */
  static forceReload(): void {
    if (typeof window !== 'undefined') {
      window.location.href = '/pages/login'
    }
  }

  /**
   * Check if user session is still valid
   */
  static async isSessionValid(): Promise<boolean> {
    try {
      const supabase = createClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      return !error && !!user
    } catch {
      return false
    }
  }

  /**
   * Refresh the session if possible
   */
  static async refreshSession(): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) {
        throw new Error(error.message)
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Session refresh failed'
      }
    }
  }

  /**
   * Setup automatic session monitoring
   */
  static setupSessionMonitoring(): void {
    if (typeof window === 'undefined') return

    const supabase = createClient()

    // Listen for auth state changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        // User signed out or session invalid
        await this.clearClientStorage()
        
        // Only redirect if we're not already on auth pages
        const currentPath = window.location.pathname
        const isAuthPage = currentPath.startsWith('/pages/login') || 
                          currentPath.startsWith('/pages/signup') ||
                          currentPath.startsWith('/pages/auth')
        
        if (!isAuthPage) {
          window.location.href = '/pages/login'
        }
      }
    })

    // Optional: Check session validity periodically
    setInterval(async () => {
      const isValid = await this.isSessionValid()
      if (!isValid && !window.location.pathname.startsWith('/pages/login')) {
        await this.logout()
        this.forceReload()
      }
    }, 5 * 60 * 1000) // Check every 5 minutes
  }
}

/**
 * Hook for using session management in React components
 */
export function useSessionManager() {
  const logout = async () => {
    const result = await SessionManager.logout()
    if (result.success) {
      SessionManager.forceReload()
    }
    return result
  }

  const checkSession = async () => {
    return await SessionManager.isSessionValid()
  }

  const refreshSession = async () => {
    return await SessionManager.refreshSession()
  }

  return {
    logout,
    checkSession,
    refreshSession,
    isSessionValid: SessionManager.isSessionValid,
    clearStorage: SessionManager.clearClientStorage
  }
}