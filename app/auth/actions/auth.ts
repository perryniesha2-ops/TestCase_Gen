"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export async function signup(formData: FormData) {
  const supabase = await createClient()

  // Get form data
  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    name: formData.get("name") as string,
  }

  // Validate inputs
  if (!data.email || !data.password) {
    return { error: "Email and password are required" }
  }

  if (data.password.length < 6) {
    return { error: "Password must be at least 6 characters" }
  }

  // Create user in Supabase Auth
  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        full_name: data.name,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  // Check if email confirmation is required
  if (authData.user && !authData.session) {
    return { 
      success: true, 
      message: "Check your email to confirm your account!" 
    }
  }

  // Return success, let the client handle redirect
  revalidatePath("/", "layout")
  return { success: true }
}

export async function login(formData: FormData) {
  const supabase = await createClient()

  // Get form data
  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  }

  // Validate inputs
  if (!data.email || !data.password) {
    return { error: "Email and password are required" }
  }

  // Sign in with Supabase
  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: error.message }
  }

  // Return success, let the client handle redirect
  revalidatePath("/", "layout")
  return { success: true }
}

export async function logout() {
  const supabase = await createClient()
  
  try {
    // Sign out from Supabase (clears server-side session)
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Logout error:', error)
      return { error: error.message }
    }

    // Clear any cached data
    revalidatePath("/", "layout")
    
    // Redirect to login page
    redirect("/pages/login")
  } catch (error) {
    console.error('Unexpected logout error:', error)
    return { error: 'An unexpected error occurred during logout' }
  }
}

// Client-side logout helper for additional cleanup
export async function logoutWithCleanup() {
  const supabase = await createClient()
  
  try {
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut()

    if (error) {
      throw error
    }

    // Clear any localStorage items related to our app
    if (typeof window !== 'undefined') {
      // Clear any app-specific localStorage items
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (
          key.startsWith('synthqa-') || 
          key.startsWith('test-case-') ||
          key.startsWith('requirement-') ||
          key.includes('generator-')
        )) {
          keysToRemove.push(key)
        }
      }
      
      // Remove app-specific items
      keysToRemove.forEach(key => localStorage.removeItem(key))
      
      // Clear sessionStorage as well
      sessionStorage.clear()
      
      // Force reload to ensure clean state
      window.location.href = '/pages/login'
    }

    return { success: true }
  } catch (error) {
    console.error('Logout error:', error)
    throw error
  }
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get("email") as string

  if (!email) {
    return { error: "Email is required" }
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { 
    success: true, 
    message: "Check your email for the password reset link" 
  }
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()
  const password = formData.get("password") as string

  if (!password || password.length < 6) {
    return { error: "Password must be at least 6 characters" }
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  })

  if (error) {
    return { error: error.message }
  }

  return { 
    success: true, 
    message: "Password updated successfully" 
  }
}