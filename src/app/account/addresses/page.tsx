import { Metadata } from "next";
import { AddressesPageClient } from "./AddressesPageClient";

export const metadata: Metadata = {
  title: "Addresses | Account",
  description: "Manage your billing and shipping addresses.",
};

export default function AddressesPage() {
  return <AddressesPageClient />;
}


