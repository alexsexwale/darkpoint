import { Metadata } from "next";
import { VideoPokerGame } from "./VideoPokerGame";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://darkpoint.co.za";

export const metadata: Metadata = {
  title: "Video Poker",
  description: "Play Video Poker online at Darkpoint! Classic Jacks or Better draw poker. Hold your best cards and draw for a winning hand!",
  openGraph: {
    title: "Video Poker | Darkpoint",
    description: "Jacks or Better Video Poker. Hold, draw, and win!",
    url: `${BASE_URL}/games/casino/video-poker`,
  },
  alternates: {
    canonical: `${BASE_URL}/games/casino/video-poker`,
  },
};

export default function VideoPokerPage() {
  return <VideoPokerGame />;
}
