import { GalleryVerticalEnd } from "lucide-react";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Separator, SeparatorDemo } from "@/components/ui/separator";

import { LoginForm } from "@/components/auth/login-form";
import { PrivacySheet } from "@/components/legal/PrivacySheet";
import { TermsSheet } from "@/components/legal/TermsSheet";
import { ContactSheet } from "@/components/legal/contactSheet";
import { Logo } from "@/components/pagecomponents/brandlogo";
import Image from "next/image";
import { Footer } from "@/components/landingpage/footer";
import { SiteFooter } from "@/components/pagecomponents/site-footer";

export default function LoginPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Logo size="xl" />
        <main className="space-y-10">
          <LoginForm />
        </main>
      </div>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our Terms of and Privacy Policy.
      </FieldDescription>
      <div className="flex-1" />
      <div className="flex h-4 items-center space-x-4 text-sm"></div>
      <SiteFooter />
    </div>
  );
}
export const metadata = {
  title: "SynthQA - Login",
};
