import { Metadata } from "next";
import { AccountPageClient } from "./AccountPageClient";

export const metadata: Metadata = {
  title: "My Account",
  description: "Manage your Darkpoint account settings, view order history, track deliveries, update addresses, and access your rewards dashboard. Your gaming gear hub.",
};

export default function AccountPage() {
  return <AccountPageClient />;
}
