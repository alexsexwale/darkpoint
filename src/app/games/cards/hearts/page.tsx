import { Metadata } from "next";
import { HeartsGame } from "./HeartsGame";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://darkpoint.co.za";

export const metadata: Metadata = {
  title: "Hearts",
  description: "Play Hearts card game online for free at Darkpoint. Avoid hearts and the Queen of Spades, or shoot the moon for a dramatic win!",
  openGraph: {
    title: "Hearts | Darkpoint Card Games",
    description: "Play the classic Hearts trick-taking card game online. Pass cards, avoid points, or shoot the moon!",
    url: `${BASE_URL}/games/cards/hearts`,
  },
  alternates: {
    canonical: `${BASE_URL}/games/cards/hearts`,
  },
};

export default function HeartsPage() {
  return <HeartsGame />;
}
