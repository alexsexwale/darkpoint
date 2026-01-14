import { Metadata } from "next";
import { NewsPageClient } from "./NewsPageClient";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://darkpoint.co.za";

export const metadata: Metadata = {
  title: "News",
  description: "Latest tech news, reviews, and updates from Darkpoint. Stay informed about gaming, hardware, and tech trends.",
  openGraph: {
    title: "News | Darkpoint",
    description: "Latest tech news, reviews, and updates from Darkpoint.",
    url: `${BASE_URL}/news`,
    type: "website",
  },
  alternates: {
    canonical: `${BASE_URL}/news`,
  },
};

export default function NewsPage() {
  return <NewsPageClient />;
}
