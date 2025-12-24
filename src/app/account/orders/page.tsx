import { Metadata } from "next";
import { OrdersPageClient } from "./OrdersPageClient";

export const metadata: Metadata = {
  title: "Orders | Account",
  description: "View your order history.",
};

export default function OrdersPage() {
  return <OrdersPageClient />;
}


