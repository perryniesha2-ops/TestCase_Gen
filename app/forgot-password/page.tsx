import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { ClientPageWrapper } from "@/components/auth/client-page-wrapper";
import Image from "next/image";
import { SiteFooter } from "@/components/pagecomponents/site-footer";
import { Logo } from "@/components/pagecomponents/brandlogo";

export default function ForgotPasswordPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-0">
        {" "}
        <div className="flex justify-center">
          <Logo size="xl" />{" "}
        </div>
        <main className="space-y-5">
          {" "}
          <ClientPageWrapper>
            <ForgotPasswordForm />
          </ClientPageWrapper>
        </main>{" "}
      </div>{" "}
      <div className="flex-1" />{" "}
      <div className="flex h-4 items-center space-x-4 text-sm"></div>{" "}
      <SiteFooter />{" "}
    </div>
  );
}

export const metadata = {
  title: "SynthQA - Forgot Password?",
};
