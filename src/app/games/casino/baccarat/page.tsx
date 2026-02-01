import { Metadata } from "next";
import { BaccaratGame } from "./BaccaratGame";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://darkpoint.co.za";

export const metadata: Metadata = {
  title: "Baccarat",
  description: "Play Baccarat online at Darkpoint! Bet on Player, Banker, or Tie in this elegant casino card game. Free to play with virtual chips!",
  openGraph: {
    title: "Baccarat | Darkpoint",
    description: "The elegant card game of chance. Bet on Player, Banker, or Tie!",
    url: `${BASE_URL}/games/casino/baccarat`,
  },
  alternates: {
    canonical: `${BASE_URL}/games/casino/baccarat`,
  },
};

export default function BaccaratPage() {
  return <BaccaratGame />;
}
