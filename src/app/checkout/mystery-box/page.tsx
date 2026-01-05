import { Metadata } from "next";
import { MysteryBoxCheckoutClient } from "./MysteryBoxCheckoutClient";

export const metadata: Metadata = {
  title: "Mystery Box Checkout | Darkpoint",
  description: "Complete your mystery box purchase",
};

export default function MysteryBoxCheckoutPage() {
  return <MysteryBoxCheckoutClient />;
}

