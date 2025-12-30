import { Metadata } from "next";
import { ForgotPasswordPageClient } from "./ForgotPasswordPageClient";

export const metadata: Metadata = {
  title: "Forgot Password | Dark Point",
  description: "Reset your Dark Point account password",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordPageClient />;
}

