import { Metadata } from "next";
import { RewardsPageClient } from "./RewardsPageClient";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://darkpoint.co.za";

export const metadata: Metadata = {
  title: "Rewards",
  description: "Join Darkpoint Rewards to earn XP, complete daily quests, unlock achievements, and redeem exclusive discounts on gaming gear. Level up and get rewarded for shopping!",
  openGraph: {
    title: "Rewards Program | Darkpoint",
    description: "Earn XP, complete quests, and redeem amazing rewards at Darkpoint!",
    url: `${BASE_URL}/rewards`,
  },
  alternates: {
    canonical: `${BASE_URL}/rewards`,
  },
};

export default function RewardsPage() {
  return <RewardsPageClient />;
}
