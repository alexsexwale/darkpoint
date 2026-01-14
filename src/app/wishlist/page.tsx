import { Metadata } from "next";
import { WishlistPageClient } from "./WishlistPageClient";

export const metadata: Metadata = {
  title: "My Wishlist",
  description: "Save your favorite gaming gear and tech products to your Darkpoint wishlist. Track prices, get notified of sales, and easily add items to cart when ready.",
};

export default function WishlistPage() {
  return <WishlistPageClient />;
}


