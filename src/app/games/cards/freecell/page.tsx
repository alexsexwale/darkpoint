import { Metadata } from "next";
import { FreeCellGame } from "./FreeCellGame";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://darkpoint.co.za";

export const metadata: Metadata = {
  title: "FreeCell",
  description: "Play FreeCell Solitaire online at Darkpoint. Use strategy to move all cards to the foundation piles!",
  openGraph: {
    title: "FreeCell Solitaire | Darkpoint Card Games",
    description: "Play FreeCell online - the classic strategic solitaire game!",
    url: `${BASE_URL}/games/cards/freecell`,
  },
  alternates: {
    canonical: `${BASE_URL}/games/cards/freecell`,
  },
};

export default function FreeCellPage() {
  return <FreeCellGame />;
}
