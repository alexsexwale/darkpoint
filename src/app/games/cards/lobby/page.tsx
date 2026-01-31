import { Metadata } from "next";
import { LobbyClient } from "./LobbyClient";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://darkpoint.co.za";

export const metadata: Metadata = {
  title: "Game Lobby",
  description: "Find and join public card game rooms at Darkpoint. Play Crazy Eights and Hearts online with other players!",
  openGraph: {
    title: "Game Lobby | Darkpoint Card Games",
    description: "Browse public card game rooms and join other players for online multiplayer games!",
    url: `${BASE_URL}/games/cards/lobby`,
  },
  alternates: {
    canonical: `${BASE_URL}/games/cards/lobby`,
  },
};

export default function LobbyPage() {
  return <LobbyClient />;
}
