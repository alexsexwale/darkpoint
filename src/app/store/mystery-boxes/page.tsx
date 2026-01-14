import { Metadata } from "next";
import { MysteryBoxesPageClient } from "./MysteryBoxesPageClient";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://darkpoint.co.za";

export const metadata: Metadata = {
  title: "Mystery Boxes",
  description: "Try your luck with Darkpoint Mystery Boxes! Unbox surprise gaming gear, tech gadgets, and accessories at incredible prices. Multiple tiers with amazing guaranteed value.",
  openGraph: {
    title: "Mystery Boxes | Darkpoint",
    description: "Unbox surprise gaming gear at incredible prices with Darkpoint Mystery Boxes!",
    url: `${BASE_URL}/store/mystery-boxes`,
  },
  alternates: {
    canonical: `${BASE_URL}/store/mystery-boxes`,
  },
};

export default function MysteryBoxesPage() {
  return <MysteryBoxesPageClient />;
}

