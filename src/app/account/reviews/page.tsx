import { Metadata } from "next";
import { ReviewsPageClient } from "./ReviewsPageClient";

export const metadata: Metadata = {
  title: "Reviews & Reports",
  description: "Manage your product reviews and view your reported content.",
};

export default function ReviewsPage() {
  return <ReviewsPageClient />;
}


