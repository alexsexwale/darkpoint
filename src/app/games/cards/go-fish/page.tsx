import { Metadata } from "next";
import { GoFishGame } from "./GoFishGame";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://darkpoint.co.za";

export const metadata: Metadata = {
  title: "Go Fish",
  description: "Play Go Fish card game online at Darkpoint. Collect sets of four cards by asking opponents for specific ranks!",
  openGraph: {
    title: "Go Fish | Darkpoint Card Games",
    description: "Play Go Fish online - the classic card game for all ages!",
    url: `${BASE_URL}/games/cards/go-fish`,
  },
  alternates: {
    canonical: `${BASE_URL}/games/cards/go-fish`,
  },
};

export default function GoFishPage() {
  return <GoFishGame />;
}
