// app/api/test-email/route.ts
import { createEmailService } from '@/lib/email-service'

export async function POST() {
  const emailService = createEmailService()
  
  if (!emailService) {
    return Response.json({ error: 'Email service not configured' })
  }

  const success = await emailService.sendPasswordResetEmail({
    to: 'your-email@example.com',
    token: 'test-token-123',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  })

  return Response.json({ success })
}