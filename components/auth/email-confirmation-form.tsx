"use client"

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle, AlertCircle, Mail } from 'lucide-react'
import { confirmEmail, resendConfirmationEmail } from '@/app/auth/actions/auth'

export default function EmailConfirmationForm() {
  const [loading, setLoading] = useState(true)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendLoading, setResendLoading] = useState(false)
  const [showResendForm, setShowResendForm] = useState(false)
  const [resendEmail, setResendEmail] = useState('')
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const handleConfirmation = async () => {
      try {
        // Get the token from URL parameters
        const token = searchParams.get('token')
        
        console.log('🔍 Confirmation token found:', !!token)
        
        if (!token) {
          setError('Invalid confirmation link - no token found')
          setLoading(false)
          return
        }

        console.log('🎯 Confirming email with custom token...')
        
        // Use your custom confirmation function
        const formData = new FormData()
        formData.append('token', token)
        
        const result = await confirmEmail(formData)
        
        if (result.success) {
          console.log('✅ Email confirmed successfully!')
          setConfirmed(true)
          toast.success(result.message || 'Email confirmed successfully!')
        } else {
          console.error('❌ Confirmation failed:', result.error)
          setError(result.error || 'Email confirmation failed')
        }

      } catch (err) {
        console.error('❌ Confirmation error:', err)
        setError('An unexpected error occurred during email confirmation')
      } finally {
        setLoading(false)
      }
    }

    // Only run confirmation if we have URL parameters
    if (searchParams.toString()) {
      handleConfirmation()
    } else {
      setLoading(false)
      setError('No confirmation token found in URL')
    }
  }, [searchParams])

  const handleResendConfirmation = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!resendEmail.trim()) {
      toast.error('Please enter your email address')
      return
    }

    try {
      setResendLoading(true)
      
      const formData = new FormData()
      formData.append('email', resendEmail.trim())
      
      const result = await resendConfirmationEmail(formData)
      
      if (result.success) {
        toast.success(result.message || 'Confirmation email sent!')
        setShowResendForm(false)
        setError(null)
      } else {
        toast.error(result.error || 'Failed to resend confirmation email')
      }
    } catch (err) {
      console.error('❌ Resend error:', err)
      toast.error('Failed to resend confirmation email')
    } finally {
      setResendLoading(false)
    }
  }

  const handleContinue = () => {
    router.push('/pages/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {loading && <Loader2 className="h-5 w-5 animate-spin" />}
            {confirmed && <CheckCircle className="h-5 w-5 text-green-600" />}
            {error && <AlertCircle className="h-5 w-5 text-red-600" />}
            {!loading && !confirmed && !error && <Mail className="h-5 w-5" />}
            Email Confirmation
          </CardTitle>
          <CardDescription>
            {loading && 'Confirming your email address...'}
            {confirmed && 'Your email has been successfully confirmed!'}
            {error && 'There was an issue confirming your email'}
            {!loading && !confirmed && !error && 'Confirm your email address'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {loading && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                Please wait while we confirm your email address...
              </p>
            </div>
          )}

          {confirmed && (
            <div className="text-center py-4">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-6">
                Your email has been confirmed and your account is now active. You can now sign in to access SynthQA.
              </p>
              <Button onClick={handleContinue} className="w-full">
                Continue to Sign In
              </Button>
            </div>
          )}

          {error && (
            <div className="text-center py-4">
              <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <p className="text-sm text-red-600 mb-2 font-medium">
                Email Confirmation Failed
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                {error}
              </p>
              
              {!showResendForm ? (
                <div className="space-y-2">
                  <Button 
                    onClick={() => setShowResendForm(true)} 
                    variant="outline" 
                    className="w-full"
                  >
                    Request New Confirmation Email
                  </Button>
                  <Button onClick={() => router.push('/pages/login')} variant="ghost" className="w-full">
                    Back to Sign In
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleResendConfirmation} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="resend-email">Email Address</Label>
                    <Input
                      id="resend-email"
                      type="email"
                      placeholder="Enter your email address"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      required
                      disabled={resendLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={resendLoading}
                    >
                      {resendLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Send Confirmation Email'
                      )}
                    </Button>
                    <Button 
                      type="button"
                      onClick={() => setShowResendForm(false)} 
                      variant="ghost" 
                      className="w-full"
                      disabled={resendLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {!loading && !confirmed && !error && (
            <div className="text-center py-4">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-6">
                Click the confirmation link in your email to activate your account.
              </p>
              <Button onClick={() => setShowResendForm(true)} variant="outline" className="w-full">
                Resend Confirmation Email
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}