import { Metadata } from "next";
import { AccountPageClient } from "./AccountPageClient";

export const metadata: Metadata = {
  title: "Account",
  description: "Manage your account and view order history.",
};

export default function AccountPage() {
  return <AccountPageClient />;
}
