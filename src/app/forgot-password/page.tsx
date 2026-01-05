import { Metadata } from "next";
import { ForgotPasswordPageClient } from "./ForgotPasswordPageClient";

export const metadata: Metadata = {
  title: "Forgot Password | Darkpoint",
  description: "Reset your Darkpoint account password",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordPageClient />;
}

