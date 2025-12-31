import type { Metadata } from "next";
import { XPHistoryPageClient } from "./XPHistoryPageClient";

export const metadata: Metadata = {
  title: "XP History | Darkpoint",
  description: "View your XP earning and spending history",
};

export default function XPHistoryPage() {
  return <XPHistoryPageClient />;
}

