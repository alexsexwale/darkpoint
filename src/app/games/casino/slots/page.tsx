import { Metadata } from "next";
import { SlotsGame } from "./SlotsGame";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://darkpoint.co.za";

export const metadata: Metadata = {
  title: "Slot Machine",
  description: "Play Slots online at Darkpoint! Spin the reels and match symbols to win big. Features wilds, scatters, and free spins!",
  openGraph: {
    title: "Slot Machine | Darkpoint",
    description: "Spin the reels and win! Multiple paylines, wilds, and bonus features.",
    url: `${BASE_URL}/games/casino/slots`,
  },
  alternates: {
    canonical: `${BASE_URL}/games/casino/slots`,
  },
};

export default function SlotsPage() {
  return <SlotsGame />;
}
