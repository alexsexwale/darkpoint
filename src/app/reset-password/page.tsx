import { Metadata } from "next";
import { ResetPasswordPageClient } from "./ResetPasswordPageClient";

export const metadata: Metadata = {
  title: "Reset Password | Dark Point",
  description: "Create a new password for your Dark Point account",
};

export default function ResetPasswordPage() {
  return <ResetPasswordPageClient />;
}
