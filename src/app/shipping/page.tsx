import { Metadata } from "next";
import { ShippingPageClient } from "./ShippingPageClient";

export const metadata: Metadata = {
  title: "Shipping Information",
  description: "Shipping rates, delivery times, and policies for Darkpoint orders.",
};

export default function ShippingPage() {
  return <ShippingPageClient />;
}
