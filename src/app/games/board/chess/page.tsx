import { Metadata } from "next";
import { ChessGame } from "./ChessGame";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://darkpoint.co.za";

export const metadata: Metadata = {
  title: "Chess",
  description: "Play Chess online at Darkpoint. Challenge the AI with 4 difficulty levels - from beginner to master!",
  openGraph: {
    title: "Chess | Darkpoint Board Games",
    description: "Play Chess online against AI opponents with adjustable difficulty!",
    url: `${BASE_URL}/games/board/chess`,
  },
  alternates: {
    canonical: `${BASE_URL}/games/board/chess`,
  },
};

export default function ChessPage() {
  return <ChessGame />;
}
