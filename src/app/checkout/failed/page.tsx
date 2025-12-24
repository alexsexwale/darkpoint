import { Metadata } from "next";
import { PaymentFailedClient } from "./PaymentFailedClient";

export const metadata: Metadata = {
  title: "Payment Failed",
  description: "Unfortunately, your payment could not be processed. Please try again.",
};

export default function PaymentFailedPage() {
  return <PaymentFailedClient />;
}


