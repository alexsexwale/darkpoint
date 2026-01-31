import { Metadata } from "next";
import { BackgammonGame } from "./BackgammonGame";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://darkpoint.co.za";

export const metadata: Metadata = {
  title: "Backgammon",
  description: "Play Backgammon online at Darkpoint. Roll the dice and race your pieces home!",
  openGraph: {
    title: "Backgammon | Darkpoint Board Games",
    description: "Play Backgammon online against AI opponents with adjustable difficulty!",
    url: `${BASE_URL}/games/board/backgammon`,
  },
  alternates: {
    canonical: `${BASE_URL}/games/board/backgammon`,
  },
};

export default function BackgammonPage() {
  return <BackgammonGame />;
}
