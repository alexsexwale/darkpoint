import { Metadata } from "next";
import { CartContent } from "./CartContent";

export const metadata: Metadata = {
  title: "Shopping Cart",
  description: "Review and manage items in your Darkpoint shopping cart. Adjust quantities, apply coupon codes, and proceed to secure checkout for your gaming gear.",
};

export default function CartPage() {
  return (
    <div className="container py-8">
      <div className="nk-gap-2" />

      <h1 className="text-4xl text-center mb-8">Shopping Cart</h1>

      <CartContent />

      <div className="nk-gap-4" />
    </div>
  );
}


