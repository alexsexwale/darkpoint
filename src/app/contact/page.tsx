import { Metadata } from "next";
import { ContactPageClient } from "./ContactPageClient";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://darkpoint.co.za";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with Darkpoint. Contact our support team for questions about orders, products, shipping, returns, or partnerships. We're here to help!",
  openGraph: {
    title: "Contact Us | Darkpoint",
    description: "Have questions? Contact the Darkpoint team for support with orders, products, and more.",
    url: `${BASE_URL}/contact`,
  },
  alternates: {
    canonical: `${BASE_URL}/contact`,
  },
};

export default function ContactPage() {
  return <ContactPageClient />;
}
