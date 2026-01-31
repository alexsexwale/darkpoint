import { Metadata } from "next";
import { CasinoGamesHubClient } from "./CasinoGamesHubClient";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://darkpoint.co.za";

export const metadata: Metadata = {
  title: "Casino Games",
  description: "Play casino games online at Darkpoint! Try your luck at Blackjack and Texas Hold'em Poker against AI opponents. Free to play - no real money involved!",
  openGraph: {
    title: "Casino Games | Darkpoint",
    description: "Play Blackjack and Texas Hold'em Poker against AI opponents. Free to play!",
    url: `${BASE_URL}/games/casino`,
  },
  alternates: {
    canonical: `${BASE_URL}/games/casino`,
  },
};

export default function CasinoGamesPage() {
  return <CasinoGamesHubClient />;
}
