import { Metadata } from "next";
import { ResetPasswordClient } from "./ResetPasswordClient";

export const metadata: Metadata = {
  title: "Reset Password | Dark Point",
  description: "Set a new password for your Dark Point account",
};

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
