import { Metadata } from "next";
import { PokerGame } from "./PokerGame";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://darkpoint.co.za";

export const metadata: Metadata = {
  title: "Texas Hold'em Poker",
  description: "Play Texas Hold'em Poker online at Darkpoint! Bluff, bet, and outplay AI opponents. Free to play with virtual chips!",
  openGraph: {
    title: "Texas Hold'em Poker | Darkpoint",
    description: "Play Texas Hold'em Poker against AI opponents. No-limit betting, bluffing, and all-in showdowns!",
    url: `${BASE_URL}/games/casino/poker`,
  },
  alternates: {
    canonical: `${BASE_URL}/games/casino/poker`,
  },
};

export default function PokerPage() {
  return <PokerGame />;
}
