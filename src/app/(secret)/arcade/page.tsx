import { Metadata } from "next";
import { ArcadePageClient } from "./ArcadePageClient";

export const metadata: Metadata = {
  title: "Secret Arcade",
  description: "Hidden mini-games for VIP members",
  robots: "noindex, nofollow",
};

export default function ArcadePage() {
  return <ArcadePageClient />;
}

