import { Metadata } from "next";
import { ReversiGame } from "./ReversiGame";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://darkpoint.co.za";

export const metadata: Metadata = {
  title: "Reversi / Othello",
  description: "Play Reversi (Othello) online at Darkpoint. Flip your opponent's pieces and dominate the board!",
  openGraph: {
    title: "Reversi / Othello | Darkpoint Board Games",
    description: "Play Reversi online against AI opponents with adjustable difficulty!",
    url: `${BASE_URL}/games/board/reversi`,
  },
  alternates: {
    canonical: `${BASE_URL}/games/board/reversi`,
  },
};

export default function ReversiPage() {
  return <ReversiGame />;
}
