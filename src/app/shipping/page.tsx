import { Metadata } from "next";
import { ShippingPageClient } from "./ShippingPageClient";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://darkpoint.co.za";

export const metadata: Metadata = {
  title: "Shipping Information",
  description: "Darkpoint shipping rates and delivery times across South Africa. Free shipping on orders over R500, standard delivery in 5-7 business days. Track your gaming gear order.",
  openGraph: {
    title: "Shipping Information | Darkpoint",
    description: "Shipping rates, delivery times, and free shipping policy for Darkpoint orders.",
    url: `${BASE_URL}/shipping`,
  },
  alternates: {
    canonical: `${BASE_URL}/shipping`,
  },
};

export default function ShippingPage() {
  return <ShippingPageClient />;
}
