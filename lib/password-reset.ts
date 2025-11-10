// lib/password-reset.ts
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export interface PasswordResetToken {
  id: string
  user_id: string
  token: string
  expires_at: Date
  used: boolean
  created_at: Date
}

export interface EmailConfirmationToken {
  id: string
  user_id: string
  email: string
  token: string
  expires_at: Date
  used: boolean
  created_at: Date
}

export interface UserMetadata {
  full_name?: string
  avatar_url?: string
  [key: string]: unknown
}

export class AuthTokenService {
  private static TOKEN_EXPIRY_HOURS = 24 // 24 hours expiry
  private static CONFIRMATION_EXPIRY_HOURS = 72 // 3 days for email confirmation

  // Generate secure token
  static generateToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  // Create reset token in database
  static async createResetToken(email: string) {
    const supabase = await createClient()
    
    // First, verify user exists
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers()
    const user = users?.find(u => u.email === email)
    
    if (!user) {
      // Don't reveal if email exists or not for security
      return { success: true, message: "If that email exists, we've sent a reset link." }
    }

    // Generate token
    const token = this.generateToken()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + this.TOKEN_EXPIRY_HOURS)

    // Store in custom table
    const { error } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        token,
        expires_at: expiresAt.toISOString(),
        used: false
      })

    if (error) {
      return { success: false, error: 'Failed to create reset token' }
    }

    return { 
      success: true, 
      token, 
      userId: user.id,
      email: user.email,
      expiresAt 
    }
  }

  // Create email confirmation token
  static async createConfirmationToken(email: string, userId: string, userMetadata?: UserMetadata) {
    const supabase = await createClient()

    // Generate token
    const token = this.generateToken()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + this.CONFIRMATION_EXPIRY_HOURS)

    // Store in custom table
    const { error } = await supabase
      .from('email_confirmation_tokens')
      .insert({
        user_id: userId,
        email,
        token,
        expires_at: expiresAt.toISOString(),
        used: false
      })

    if (error) {
      return { success: false, error: 'Failed to create confirmation token' }
    }

    return { 
      success: true, 
      token, 
      userId,
      email,
      expiresAt,
      userMetadata 
    }
  }

  // Verify reset token
  static async verifyResetToken(token: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single()

    if (error || !data) {
      return { valid: false, error: 'Invalid or expired reset token' }
    }

    // Check if expired
    const now = new Date()
    const expiresAt = new Date(data.expires_at)
    
    if (now > expiresAt) {
      return { valid: false, error: 'Reset token has expired' }
    }

    return { 
      valid: true, 
      userId: data.user_id,
      tokenId: data.id 
    }
  }

  // Verify confirmation token
  static async verifyConfirmationToken(token: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('email_confirmation_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single()

    if (error || !data) {
      return { valid: false, error: 'Invalid or expired confirmation token' }
    }

    // Check if expired
    const now = new Date()
    const expiresAt = new Date(data.expires_at)
    
    if (now > expiresAt) {
      return { valid: false, error: 'Confirmation token has expired' }
    }

    return { 
      valid: true, 
      userId: data.user_id,
      email: data.email,
      tokenId: data.id 
    }
  }

  // Mark token as used
  static async markResetTokenAsUsed(tokenId: string) {
    const supabase = await createClient()

    const { error } = await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('id', tokenId)

    return !error
  }

  // Mark confirmation token as used
  static async markConfirmationTokenAsUsed(tokenId: string) {
    const supabase = await createClient()

    const { error } = await supabase
      .from('email_confirmation_tokens')
      .update({ used: true })
      .eq('id', tokenId)

    return !error
  }

  // Clean up expired tokens (run periodically)
  static async cleanupExpiredTokens() {
    const supabase = await createClient()

    const now = new Date().toISOString()

    // Clean up reset tokens
    const { error: resetError } = await supabase
      .from('password_reset_tokens')
      .delete()
      .lt('expires_at', now)

    // Clean up confirmation tokens
    const { error: confirmError } = await supabase
      .from('email_confirmation_tokens')
      .delete()
      .lt('expires_at', now)

    return !resetError && !confirmError
  }
}

// Keep the old class name for backward compatibility
export const PasswordResetService = AuthTokenService