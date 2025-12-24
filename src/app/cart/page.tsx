import { Metadata } from "next";
import { CartContent } from "./CartContent";

export const metadata: Metadata = {
  title: "Shopping Cart",
  description: "View and manage items in your shopping cart.",
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


