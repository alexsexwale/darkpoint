import { Metadata } from "next";
import { TrackOrderClient } from "./TrackOrderClient";

export const metadata: Metadata = {
  title: "Track Your Order | Darkpoint",
  description: "Track your Darkpoint order status and delivery. Enter your order number or tracking number to view real-time shipping updates.",
};

export default function TrackOrderPage() {
  return <TrackOrderClient />;
}
