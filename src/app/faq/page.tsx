import { Metadata } from "next";
import { FAQPageClient } from "./FAQPageClient";
import { FAQJsonLd } from "@/components/seo";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://darkpoint.co.za";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about Darkpoint. Find answers about shipping, returns, payment methods, product authenticity, order tracking, and more.",
  openGraph: {
    title: "FAQ | Darkpoint",
    description: "Find answers to common questions about shopping at Darkpoint - shipping, returns, payments, and more.",
    url: `${BASE_URL}/faq`,
  },
  alternates: {
    canonical: `${BASE_URL}/faq`,
  },
};

// FAQ data for structured data
const faqItems = [
  { question: "What products do you sell?", answer: "We specialize in gaming gear, tech gadgets, hardware, and merchandise. From gaming peripherals like controllers and headsets, to PC components, streaming equipment, and exclusive gaming merchandise." },
  { question: "What payment methods do you accept?", answer: "We accept all major credit and debit cards (Visa, Mastercard, American Express), EFT/Bank transfers, SnapScan, and Zapper. All transactions are processed securely." },
  { question: "How long does delivery take?", answer: "Standard delivery takes 5-7 business days nationwide. Orders over R500 qualify for FREE shipping. For orders under R500, a flat delivery fee of R65 applies." },
  { question: "What is your return policy?", answer: "We offer a 30-day return policy for unused items in original packaging. Defective items can be returned within 6 months for a full refund or replacement." },
  { question: "Do you offer warranty on products?", answer: "Yes, all products come with a minimum 1-year manufacturer warranty. Gaming peripherals and hardware may have extended warranty options available at checkout." },
  { question: "Can I track my order?", answer: "Yes! Once your order is dispatched, you'll receive an email and SMS with a tracking number. You can also track your order by logging into your account." },
];

export default function FAQPage() {
  return (
    <>
      <FAQJsonLd items={faqItems} />
      <FAQPageClient />
    </>
  );
}
