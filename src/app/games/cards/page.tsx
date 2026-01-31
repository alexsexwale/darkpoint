import { Metadata } from "next";
import { CardGamesHubClient } from "./CardGamesHubClient";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://darkpoint.co.za";

export const metadata: Metadata = {
  title: "Card Games",
  description: "Play classic card games online at Darkpoint. Enjoy Solitaire, Spider Solitaire, Crazy Eights, Hearts, and more - all free in your browser!",
  openGraph: {
    title: "Card Games | Darkpoint",
    description: "Play classic card games like Solitaire, Spider Solitaire, Crazy Eights, and Hearts online for free!",
    url: `${BASE_URL}/games/cards`,
  },
  alternates: {
    canonical: `${BASE_URL}/games/cards`,
  },
};

export default function CardGamesPage() {
  return <CardGamesHubClient />;
}
