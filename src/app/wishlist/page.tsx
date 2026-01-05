import { Metadata } from "next";
import { WishlistPageClient } from "./WishlistPageClient";

export const metadata: Metadata = {
  title: "My Wishlist | Darkpoint",
  description: "View and manage your saved items.",
};

export default function WishlistPage() {
  return <WishlistPageClient />;
}


