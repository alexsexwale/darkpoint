import { Metadata } from "next";
import { GamesPageClient } from "./GamesPageClient";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://darkpoint.co.za";

export const metadata: Metadata = {
  title: "Games",
  description: "Play games online at Darkpoint! Choose from retro arcade emulators, classic board games like Chess and Checkers, or card games like Hearts and Solitaire. Free to play!",
  openGraph: {
    title: "Game Zone | Darkpoint",
    description: "Your ultimate gaming destination. Retro arcade, board games, and card games - all free to play in your browser!",
    url: `${BASE_URL}/games`,
  },
  alternates: {
    canonical: `${BASE_URL}/games`,
  },
};

export default function GamesPage() {
  return <GamesPageClient />;
}

