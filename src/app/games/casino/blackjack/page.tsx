import { Metadata } from "next";
import { BlackjackGame } from "./BlackjackGame";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://darkpoint.co.za";

export const metadata: Metadata = {
  title: "Blackjack",
  description: "Play Blackjack online at Darkpoint! Beat the dealer by getting as close to 21 as possible. Free to play with virtual chips!",
  openGraph: {
    title: "Blackjack | Darkpoint",
    description: "Play Blackjack against an AI dealer. Hit, stand, double down, or split!",
    url: `${BASE_URL}/games/casino/blackjack`,
  },
  alternates: {
    canonical: `${BASE_URL}/games/casino/blackjack`,
  },
};

export default function BlackjackPage() {
  return <BlackjackGame />;
}
