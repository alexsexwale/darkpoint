import { Metadata } from "next";
import { TicTacToeGame } from "./TicTacToeGame";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://darkpoint.co.za";

export const metadata: Metadata = {
  title: "Tic-Tac-Toe",
  description: "Play Tic-Tac-Toe online at Darkpoint. The classic game of X's and O's!",
  openGraph: {
    title: "Tic-Tac-Toe | Darkpoint Board Games",
    description: "Play Tic-Tac-Toe online against AI opponents!",
    url: `${BASE_URL}/games/board/tic-tac-toe`,
  },
  alternates: {
    canonical: `${BASE_URL}/games/board/tic-tac-toe`,
  },
};

export default function TicTacToePage() {
  return <TicTacToeGame />;
}
