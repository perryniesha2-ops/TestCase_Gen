import { GalleryVerticalEnd } from "lucide-react"

import { SignupForm } from "@/components/auth/signup-form"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
  } from "@/components/ui/field"
import { Separator,SeparatorDemo } from "@/components/ui/separator"
import Image from "next/image"


import {PrivacySheet} from "@/components/legal/PrivacySheet"
import {TermsSheet} from "@/components/legal/TermsSheet"
import {ContactSheet} from "@/components/legal/contactSheet"


export default function SignupPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
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
        <SignupForm />
        </div>
    <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our Terms of{" "}
        and Privacy Policy.
    </FieldDescription>
    <Separator /> 
     <div className="flex h-6 items-center space-x-4 text-sm">
     <PrivacySheet/><Separator orientation="vertical" />
      <TermsSheet/><Separator orientation="vertical" /> <ContactSheet/>
      </div>
    </div>
  )
}
export const metadata = {
  title: 'SynthQA - Signup',
}