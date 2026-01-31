import { Metadata } from "next";
import { CrazyEightsGame } from "./CrazyEightsGame";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://darkpoint.co.za";

export const metadata: Metadata = {
  title: "Crazy Eights",
  description: "Play Crazy Eights online for free at Darkpoint. Match cards by suit or rank, use 8s as wild cards, and be the first to empty your hand!",
  openGraph: {
    title: "Crazy Eights | Darkpoint Card Games",
    description: "Play Crazy Eights online with AI opponents or friends. Use wild 8s to change suits and win the game!",
    url: `${BASE_URL}/games/cards/crazy-eights`,
  },
  alternates: {
    canonical: `${BASE_URL}/games/cards/crazy-eights`,
  },
};

export default function CrazyEightsPage() {
  return <CrazyEightsGame />;
}
