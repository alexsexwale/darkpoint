import { Metadata } from "next";
import { VIPPageClient } from "./VIPPageClient";

export const metadata: Metadata = {
  title: "VIP Lounge",
  description: "Exclusive rewards and perks for badge owners",
  robots: "noindex, nofollow", // Keep it secret from search engines
};

export default function VIPPage() {
  return <VIPPageClient />;
}

