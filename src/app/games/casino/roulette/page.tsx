import { Metadata } from "next";
import { RouletteGame } from "./RouletteGame";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://darkpoint.co.za";

export const metadata: Metadata = {
  title: "Roulette",
  description: "Play Roulette online at Darkpoint! Spin the wheel and bet on where the ball lands. European and American variants available!",
  openGraph: {
    title: "Roulette | Darkpoint",
    description: "Spin the wheel and win big! European and American Roulette.",
    url: `${BASE_URL}/games/casino/roulette`,
  },
  alternates: {
    canonical: `${BASE_URL}/games/casino/roulette`,
  },
};

export default function RoulettePage() {
  return <RouletteGame />;
}
