import { Metadata } from "next";
import { CheckoutContent } from "./CheckoutContent";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your purchase securely.",
};

export default function CheckoutPage() {
  return (
    <div className="container py-8">
      <div className="nk-gap-2" />

      <h1 className="text-4xl text-center mb-8">Checkout</h1>

      <CheckoutContent />

      <div className="nk-gap-4" />
    </div>
  );
}


