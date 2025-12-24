import { Metadata } from "next";
import { PaymentSuccessClient } from "./PaymentSuccessClient";

export const metadata: Metadata = {
  title: "Payment Successful",
  description: "Your payment has been processed successfully. Thank you for your order!",
};

export default function PaymentSuccessPage() {
  return <PaymentSuccessClient />;
}


