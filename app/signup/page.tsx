import { GalleryVerticalEnd } from "lucide-react";

import { SignupForm } from "@/components/auth/signup-form";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Separator, SeparatorDemo } from "@/components/ui/separator";
import Image from "next/image";

import { PrivacySheet } from "@/components/legal/PrivacySheet";
import { TermsSheet } from "@/components/legal/TermsSheet";
import { ContactSheet } from "@/components/legal/contactSheet";
import { SiteFooter } from "@/components/pagecomponents/site-footer";
import { Logo } from "@/components/pagecomponents/brandlogo";

export default function SignupPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      {" "}
      <div className="flex w-full max-w-sm flex-col gap-0">
        {" "}
        <div className="flex justify-center">
          <Logo size="xl" />{" "}
        </div>
        <main className="space-y-5">
          {" "}
          <SignupForm />
        </main>{" "}
      </div>{" "}
      <FieldDescription className="px-6 text-center">
        {" "}
        By clicking continue, you agree to our Terms of and Privacy Policy.
      </FieldDescription>{" "}
      <div className="flex-1" />{" "}
      <div className="flex h-4 items-center space-x-4 text-sm"></div>{" "}
      <SiteFooter />{" "}
    </div>
  );
}
export const metadata = {
  title: "SynthQA - Sign Up",
};
