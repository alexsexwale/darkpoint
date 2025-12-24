import { Metadata } from "next";
import { DetailsPageClient } from "./DetailsPageClient";

export const metadata: Metadata = {
  title: "Account Details | Account",
  description: "Edit your account details and password.",
};

export default function DetailsPage() {
  return <DetailsPageClient />;
}


