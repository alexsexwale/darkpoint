import { Metadata } from "next";
import { SpiderSolitaireGame } from "./SpiderSolitaireGame";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://darkpoint.co.za";

export const metadata: Metadata = {
  title: "Spider Solitaire",
  description: "Play Spider Solitaire online for free at Darkpoint. Choose 1, 2, or 4 suit difficulty and build King-to-Ace sequences!",
  openGraph: {
    title: "Spider Solitaire | Darkpoint Card Games",
    description: "Play Spider Solitaire online with 1, 2, or 4 suits. Build complete sequences and clear the board!",
    url: `${BASE_URL}/games/cards/spider-solitaire`,
  },
  alternates: {
    canonical: `${BASE_URL}/games/cards/spider-solitaire`,
  },
};

export default function SpiderSolitairePage() {
  return <SpiderSolitaireGame />;
}
