import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"
import { ClientPageWrapper } from '@/components/auth/client-page-wrapper'


export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
             <ClientPageWrapper>
                <ForgotPasswordForm />
            </ClientPageWrapper>

    </div>
  )
}