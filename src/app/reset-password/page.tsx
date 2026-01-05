import { Metadata } from "next";
import { ResetPasswordPageClient } from "./ResetPasswordPageClient";

export const metadata: Metadata = {
  title: "Reset Password | Darkpoint",
  description: "Create a new password for your Darkpoint account",
};

export default function ResetPasswordPage() {
  return <ResetPasswordPageClient />;
}
