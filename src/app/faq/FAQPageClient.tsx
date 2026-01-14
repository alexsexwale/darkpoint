"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    question: "What products do you sell?",
    answer: "We specialize in gaming gear, tech gadgets, hardware, and merchandise. From gaming peripherals like controllers and headsets, to PC components, streaming equipment, and exclusive gaming merchandise - we've got everything you need to level up your setup."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit and debit cards (Visa, Mastercard, American Express), EFT/Bank transfers, SnapScan, and Zapper. All transactions are processed securely through our payment partners."
  },
  {
    question: "How long does delivery take?",
    answer: "Standard delivery takes 5-7 business days nationwide. Orders over R500 qualify for FREE shipping. For orders under R500, a flat delivery fee of R65 applies."
  },
  {
    question: "What is your return policy?",
    answer: "We offer a 30-day return policy for unused items in original packaging. Defective items can be returned within 6 months for a full refund or replacement. Please see our Returns page for full details."
  },
  {
    question: "Do you offer warranty on products?",
    answer: "Yes, all products come with a minimum 1-year manufacturer warranty. Gaming peripherals and hardware may have extended warranty options available at checkout."
  },
  {
    question: "Are your gaming products authentic?",
    answer: "Absolutely! We only sell 100% authentic products sourced directly from manufacturers or authorized distributors. We guarantee the authenticity of every item - from Razer and Logitech peripherals to official gaming merchandise."
  },
  {
    question: "Can I track my order?",
    answer: "Yes! Once your order is dispatched, you'll receive an email and SMS with a tracking number. You can also track your order by logging into your account on our website."
  },
  {
    question: "Do you ship internationally?",
    answer: "Currently, we primarily ship within South Africa. International shipping is available to select African countries - please contact us for availability and rates."
  },
  {
    question: "How do I cancel or modify my order?",
    answer: "Orders can be cancelled or modified within 2 hours of placing them. After this window, please contact our support team and we'll do our best to accommodate your request before the order ships."
  },
  {
    question: "Do you have a Discord community?",
    answer: "Yes! Join our Discord server to connect with fellow gamers, get early access to deals, participate in giveaways, and get real-time support from our team. Check the footer for the invite link!"
  },
  {
    question: "Do you offer bulk or esports team discounts?",
    answer: "Yes, we offer special pricing for esports teams, gaming cafes, and bulk orders. Contact us at support@darkpoint.co.za for more information about our partnership programs."
  },
  {
    question: "How can I contact customer support?",
    answer: "You can reach our support team via email at support@darkpoint.co.za, through our contact form, Discord, or via WhatsApp during business hours (Mon-Fri, 8am-5pm SAST)."
  }
];

export function FAQPageClient() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="container py-8">
      <div className="nk-gap-4 h-16" />

      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-heading text-center mb-4">
          Frequently Asked Questions
        </h1>
        <p className="text-center text-white/60 mb-8">
          Everything you need to know about shopping at Darkpoint
        </p>
        
        <div className="h-px bg-[var(--color-main-1)]/30 mb-12" />

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border border-white/10 bg-white/5 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-white/5 transition-colors"
              >
                <span className="font-heading text-lg text-white">{faq.question}</span>
                <span
                  className={cn(
                    "text-[var(--color-main-1)] text-2xl transition-transform duration-300",
                    openIndex === index ? "rotate-45" : ""
                  )}
                >
                  +
                </span>
              </button>
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300",
                  openIndex === index ? "max-h-96" : "max-h-0"
                )}
              >
                <p className="px-6 pb-5 text-white/70 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-white/50 mb-4">Still have questions?</p>
          <a
            href="/contact"
            className="inline-block px-8 py-3 border border-[var(--color-main-1)] text-[var(--color-main-1)] hover:bg-[var(--color-main-1)] hover:text-black transition-colors font-heading uppercase tracking-wider cursor-pointer"
          >
            Contact Us
          </a>
        </div>
      </div>

      <div className="nk-gap-4 h-16" />
    </div>
  );
}

