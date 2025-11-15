// app/pages/confirm-email/page.tsx
// Server Component wrapper for custom email confirmation

import { ClientPageWrapper } from '@/components/auth/client-page-wrapper'
import BetaLoginPage from '@/components/auth/betaloginpage'
export default function ConfirmEmailPage() {
  return (
    <ClientPageWrapper>
      <BetaLoginPage />
    </ClientPageWrapper>
  )
}

