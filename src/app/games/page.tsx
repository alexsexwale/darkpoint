import { Metadata } from "next";
import { GamesPageClient } from "./GamesPageClient";

export const metadata: Metadata = {
  title: "Retro Games | Dark Point",
  description:
    "Play classic retro games right in your browser. Upload your ROM files and relive the golden era of gaming with PlayStation, PSP, Game Boy, SNES, and more!",
};

export default function GamesPage() {
  return <GamesPageClient />;
}

