import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"
import { ClientPageWrapper } from '@/components/auth/client-page-wrapper'
import Image from "next/image"



export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
            <div className="flex w-full max-w-sm flex-col gap-6">

                  <Image
                       src="/logo-sq-dark.svg"
                       alt="SynthQA Logo"
                       width={5000      }
                       height={2000}
                       className="hidden dark:inline-block h-20 w-auto sm:h-20"
                       loading="eager"
                       priority
                     />
                     {/* Light-mode logo */}
                     <Image
                       src="/logo-sq-light.svg"
                       alt="SynthQA Logo"
                       width={1000}
                       height={100}
                       className="inline-block dark:hidden h-20 w-auto sm:h-20"
                       loading="eager"
                       priority
                     />
      
             <ClientPageWrapper>
                <ForgotPasswordForm />
            </ClientPageWrapper>
    </div>

    </div>
  )
}

export const metadata = {
  title: 'SynthQA - Forgot Password?',
}