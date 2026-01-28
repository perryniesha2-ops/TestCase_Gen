import { ResendConfirmationPage } from "@/components/auth/resend-confirmation-page";
import { ClientPageWrapper } from "@/components/auth/client-page-wrapper";
import { Logo } from "@/components/pagecomponents/brandlogo";
import { GalleryVerticalEnd } from "lucide-react";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { SiteFooter } from "@/components/pagecomponents/site-footer";

export default function ResetPasswordPage() {
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
          <ResendConfirmationPage />{" "}
        </main>{" "}
      </div>{" "}
      <div className="flex-1" />{" "}
      <div className="flex h-4 items-center space-x-4 text-sm"></div>{" "}
      <SiteFooter />{" "}
    </div>
  );
}

export const metadata = {
  title: "Reset Your Password - SynthQA",
  description: "Reset your password to regain access to your SynthQA account.",
};
