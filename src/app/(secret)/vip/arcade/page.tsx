import { Metadata } from "next";
import { VIPArcadePageClient } from "./VIPArcadePageClient";

export const metadata: Metadata = {
  title: "Hidden Arcade",
  description: "Secret mini-games for VIP badge holders – earn bonus XP",
  robots: "noindex, nofollow",
};

export default function VIPArcadePage() {
  return <VIPArcadePageClient />;
}
