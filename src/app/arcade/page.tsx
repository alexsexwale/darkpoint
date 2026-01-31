import { Metadata } from "next";
import { ArcadePageClient } from "./ArcadePageClient";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://darkpoint.co.za";

export const metadata: Metadata = {
  title: "Retro Arcade",
  description: "Play classic retro games in your browser at Darkpoint. Upload ROM files and relive PlayStation, PSP, Game Boy, SNES, and more. Free online emulator for gaming nostalgia!",
  openGraph: {
    title: "Retro Arcade | Darkpoint",
    description: "Play classic retro games right in your browser. Upload ROM files for PlayStation, PSP, Game Boy, and more!",
    url: `${BASE_URL}/arcade`,
  },
  alternates: {
    canonical: `${BASE_URL}/arcade`,
  },
};

export default function ArcadePage() {
  return <ArcadePageClient />;
}
