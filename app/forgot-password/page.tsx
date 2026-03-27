import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { ClientPageWrapper } from "@/components/auth/client-page-wrapper";

export default function ForgotPasswordPage() {
  return (
    <ClientPageWrapper>
      <ForgotPasswordForm />
    </ClientPageWrapper>
  );
}

export const metadata = {
  title: "SynthQA - Forgot Password?",
};
