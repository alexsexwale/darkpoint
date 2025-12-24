import { Metadata } from "next";
import { ReturnRequestClient } from "./ReturnRequestClient";

export const metadata: Metadata = {
  title: "Returns & Refunds | Dark Point",
  description: "Request a return for your Dark Point order. Easy 30-day returns, 5-7 day refund processing. Enter your order details to start a return request for eligible items.",
};

export default function ReturnRequestPage() {
  return <ReturnRequestClient />;
}

