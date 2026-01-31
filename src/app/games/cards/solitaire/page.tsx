import { Metadata } from "next";
import { SolitaireGame } from "./SolitaireGame";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://darkpoint.co.za";

export const metadata: Metadata = {
  title: "Solitaire",
  description: "Play classic Klondike Solitaire online for free at Darkpoint. Drag and drop cards, undo moves, and enjoy this timeless card game in your browser!",
  openGraph: {
    title: "Solitaire | Darkpoint Card Games",
    description: "Play classic Klondike Solitaire online for free. Features drag & drop, undo, auto-complete, and more!",
    url: `${BASE_URL}/games/cards/solitaire`,
  },
  alternates: {
    canonical: `${BASE_URL}/games/cards/solitaire`,
  },
};

export default function SolitairePage() {
  return <SolitaireGame />;
}
