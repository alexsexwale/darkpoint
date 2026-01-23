import { Metadata } from "next";
import { ShippingPageClient } from "./ShippingPageClient";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/constants";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://darkpoint.co.za";

export const metadata: Metadata = {
  title: "Shipping Information",
  description: `Darkpoint shipping rates and delivery times across South Africa. Free shipping on orders over R${FREE_SHIPPING_THRESHOLD}, standard delivery in 7-14 business days. Track your gaming gear order.`,
  openGraph: {
    title: "Shipping Information | Darkpoint",
    description: `Shipping rates, delivery times, and free shipping policy for Darkpoint orders. Free shipping on orders over R${FREE_SHIPPING_THRESHOLD}.`,
    url: `${BASE_URL}/shipping`,
  },
  alternates: {
    canonical: `${BASE_URL}/shipping`,
  },
};

export default function ShippingPage() {
  return <ShippingPageClient />;
}
