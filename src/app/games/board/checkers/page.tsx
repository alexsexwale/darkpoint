import { Metadata } from "next";
import { CheckersGame } from "./CheckersGame";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://darkpoint.co.za";

export const metadata: Metadata = {
  title: "Checkers",
  description: "Play Checkers online at Darkpoint. Challenge the AI with 4 difficulty levels - from beginner to master!",
  openGraph: {
    title: "Checkers | Darkpoint Board Games",
    description: "Play Checkers online against AI opponents with adjustable difficulty!",
    url: `${BASE_URL}/games/board/checkers`,
  },
  alternates: {
    canonical: `${BASE_URL}/games/board/checkers`,
  },
};

export default function CheckersPage() {
  return <CheckersGame />;
}
