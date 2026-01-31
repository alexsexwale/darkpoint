import { Metadata } from "next";
import { ConnectFourGame } from "./ConnectFourGame";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://darkpoint.co.za";

export const metadata: Metadata = {
  title: "Connect Four",
  description: "Play Connect Four online at Darkpoint. Drop pieces to connect 4 in a row and beat the AI!",
  openGraph: {
    title: "Connect Four | Darkpoint Board Games",
    description: "Play Connect Four online against AI opponents with adjustable difficulty!",
    url: `${BASE_URL}/games/board/connect-four`,
  },
  alternates: {
    canonical: `${BASE_URL}/games/board/connect-four`,
  },
};

export default function ConnectFourPage() {
  return <ConnectFourGame />;
}
