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
  const { error } = await supabase.auth.signOut()

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/", "layout")
  redirect("/login")
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