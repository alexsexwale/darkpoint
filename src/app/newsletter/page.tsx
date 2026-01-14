import { Metadata } from "next";
import { NewsletterPageClient } from "./NewsletterPageClient";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://darkpoint.co.za";

export const metadata: Metadata = {
  title: "Newsletter",
  description: "Subscribe to the Darkpoint newsletter for exclusive deals, new product announcements, and 10% off your first order. Be first to know about gaming gear and tech drops!",
  openGraph: {
    title: "Newsletter | Darkpoint",
    description: "Subscribe for exclusive deals, new arrivals, and 10% off your first order.",
    url: `${BASE_URL}/newsletter`,
  },
  alternates: {
    canonical: `${BASE_URL}/newsletter`,
  },
};

export default function NewsletterPage() {
  return <NewsletterPageClient />;
}
