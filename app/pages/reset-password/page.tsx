import { ResetPasswordForm } from "@/components/auth/reset-password-form"
import { ClientPageWrapper } from '@/components/auth/client-page-wrapper'


export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">

      
       <ClientPageWrapper>
      <ResetPasswordForm />
      </ClientPageWrapper>
    </div>
  )
}

export const metadata = {
  title: 'Reset Your Password - SynthQA',
  description: 'Reset your password to regain access to your SynthQA account.',
}