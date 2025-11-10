// app/pages/confirm-email/page.tsx
// Server Component wrapper for custom email confirmation

import { ClientPageWrapper } from '@/components/auth/client-page-wrapper'
import EmailConfirmationForm from '@/components/auth/email-confirmation-form'
export default function ConfirmEmailPage() {
  return (
    <ClientPageWrapper>
      <EmailConfirmationForm />
    </ClientPageWrapper>
  )
}

export const metadata = {
  title: 'Confirm Email - SynthQA',
  description: 'Confirm your email address to activate your account',
}