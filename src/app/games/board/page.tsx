import { Metadata } from "next";
import { BoardGamesHubClient } from "./BoardGamesHubClient";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://darkpoint.co.za";

export const metadata: Metadata = {
  title: "Board Games",
  description: "Play classic board games online at Darkpoint. Challenge the AI in Chess and Checkers with multiple difficulty levels - from beginner to master!",
  openGraph: {
    title: "Board Games | Darkpoint",
    description: "Play Chess and Checkers online against AI opponents with adjustable difficulty levels!",
    url: `${BASE_URL}/games/board`,
  },
  alternates: {
    canonical: `${BASE_URL}/games/board`,
  },
};

export default function BoardGamesPage() {
  return <BoardGamesHubClient />;
}
