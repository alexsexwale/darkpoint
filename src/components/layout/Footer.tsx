"use client";

import Link from "next/link";
import Image from "next/image";
import { SITE_NAME } from "@/lib/constants";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="nk-footer relative mt-auto pt-12 pb-6 bg-[#0a0a0a] border-t border-white/10">
      {/* Corner decoration */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="nk-footer-top-corner absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-60"
        src="/images/footer-corner.png"
        alt=""
      />

      <div className="container">

        {/* Partner/Payment Logos Row - Godlike style */}
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 mb-10 pb-8 border-b border-white/10">
          {/* Dark Point Logo */}
          <Link href="/" className="opacity-80 hover:opacity-100 transition-opacity">
            <Image
              src="/images/logo.png"
              alt={SITE_NAME}
              width={150}
              height={50}
              className="h-12 w-auto"
            />
          </Link>
          
          {/* Divider */}
          <span className="hidden md:block w-px h-6 bg-white/20" />
          
          {/* Payment Methods */}
          <div className="flex items-center gap-4">
            <span className="text-white/40 text-xs uppercase tracking-wider">We Accept:</span>
            <div className="flex items-center gap-3">
              {/* Visa */}
              <svg className="w-10 h-6 text-white/60" viewBox="0 0 50 16" fill="currentColor">
                <path d="M19.13 15.26h-3.26l2.04-12.52h3.26l-2.04 12.52zm13.19-12.22c-.65-.26-1.66-.52-2.93-.52-3.23 0-5.5 1.72-5.52 4.18-.02 1.82 1.63 2.84 2.87 3.45 1.28.62 1.71 1.02 1.7 1.58-.01.85-1.02 1.24-1.96 1.24-1.31 0-2.01-.19-3.09-.66l-.42-.2-.46 2.84c.77.35 2.18.66 3.65.68 3.43 0 5.66-1.69 5.68-4.32.01-1.44-.86-2.54-2.74-3.44-1.14-.59-1.84-.98-1.83-1.57 0-.53.59-1.09 1.87-1.09.53-.01 1.81.12 2.69.47l.32.15.49-2.79zm8.41-.3h-2.53c-.78 0-1.37.23-1.71.95l-4.86 11.57h3.43s.56-1.55.69-1.89h4.19c.1.44.4 1.89.4 1.89h3.03l-2.64-12.52zm-4.03 8.08c.27-.73 1.31-3.54 1.31-3.54-.02.03.27-.73.44-1.21l.22 1.09.76 3.66h-2.73zm-17.1-8.08l-3.2 8.54-.34-1.75c-.59-2-2.44-4.17-4.51-5.26l2.93 11h3.46l5.14-12.53h-3.48z"/>
              </svg>
              {/* Mastercard */}
              <svg className="w-10 h-6 text-white/60" viewBox="0 0 50 30" fill="currentColor">
                <circle cx="18" cy="15" r="12" fillOpacity="0.6"/>
                <circle cx="32" cy="15" r="12" fillOpacity="0.4"/>
              </svg>
              {/* PayPal */}
              <span className="text-white/60 text-xs font-bold tracking-tight">PayPal</span>
            </div>
          </div>
        </div>

        {/* Footer Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10 text-center md:text-left">
          {/* Shop */}
          <div>
            <h3 className="font-heading text-sm uppercase tracking-wider text-white mb-4">Shop</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/store" className="text-white/50 hover:text-[var(--color-main-1)] transition-colors text-sm cursor-pointer">
                  All Products
                </Link>
              </li>
              <li>
                <Link href="/store?category=gaming" className="text-white/50 hover:text-[var(--color-main-1)] transition-colors text-sm cursor-pointer">
                  Gaming Gear
                </Link>
              </li>
              <li>
                <Link href="/store?category=hardware" className="text-white/50 hover:text-[var(--color-main-1)] transition-colors text-sm cursor-pointer">
                  Hardware
                </Link>
              </li>
              <li>
                <Link href="/store?category=merchandise" className="text-white/50 hover:text-[var(--color-main-1)] transition-colors text-sm cursor-pointer">
                  Merchandise
                </Link>
              </li>
              <li>
                <Link href="/store?category=audio" className="text-white/50 hover:text-[var(--color-main-1)] transition-colors text-sm cursor-pointer">
                  Audio
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-heading text-sm uppercase tracking-wider text-white mb-4">Categories</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/store?category=accessories" className="text-white/50 hover:text-[var(--color-main-1)] transition-colors text-sm cursor-pointer">
                  Accessories
                </Link>
              </li>
              <li>
                <Link href="/store?category=gadgets" className="text-white/50 hover:text-[var(--color-main-1)] transition-colors text-sm cursor-pointer">
                  Gadgets
                </Link>
              </li>
              <li>
                <Link href="/store?category=wearables" className="text-white/50 hover:text-[var(--color-main-1)] transition-colors text-sm cursor-pointer">
                  Wearables
                </Link>
              </li>
              <li>
                <Link href="/store?featured=true" className="text-white/50 hover:text-[var(--color-main-1)] transition-colors text-sm cursor-pointer">
                  Featured
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-heading text-sm uppercase tracking-wider text-white mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/contact" className="text-white/50 hover:text-[var(--color-main-1)] transition-colors text-sm cursor-pointer">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/track-order" className="text-white/50 hover:text-[var(--color-main-1)] transition-colors text-sm cursor-pointer">
                  Track Order
                </Link>
              </li>
              <li>
                <Link href="/shipping" className="text-white/50 hover:text-[var(--color-main-1)] transition-colors text-sm cursor-pointer">
                  Shipping Info
                </Link>
              </li>
              <li>
                <Link href="/return-request" className="text-white/50 hover:text-[var(--color-main-1)] transition-colors text-sm cursor-pointer">
                  Returns & Refunds
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-white/50 hover:text-[var(--color-main-1)] transition-colors text-sm cursor-pointer">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="font-heading text-sm uppercase tracking-wider text-white mb-4">Connect</h3>
            <ul className="space-y-2">
              <li>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-[var(--color-main-1)] transition-colors text-sm cursor-pointer">
                  Twitter / X
                </a>
              </li>
              <li>
                <a href="https://discord.gg" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-[var(--color-main-1)] transition-colors text-sm cursor-pointer">
                  Discord
                </a>
              </li>
              <li>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-[var(--color-main-1)] transition-colors text-sm cursor-pointer">
                  Instagram
                </a>
              </li>
              <li>
                <Link href="/newsletter" className="text-white/50 hover:text-[var(--color-main-1)] transition-colors text-sm cursor-pointer">
                  Newsletter
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section - Godlike style */}
        <div className="pt-8 border-t border-white/10 text-center md:text-left">
          {/* Copyright */}
          <p className="text-white/60 text-sm mb-4">
            © {currentYear} {SITE_NAME}. All Rights Reserved. Prices in ZAR. {SITE_NAME} and related logos are registered trademarks. All other trademarks or trade names are the property of their respective owners.
          </p>

          {/* Description */}
          <p className="text-white/40 text-sm mb-6">
            {SITE_NAME}® is your ultimate destination for gaming gear, tech gadgets, hardware, and merchandise. Whether you&apos;re a competitive gamer, streamer, or tech enthusiast, we&apos;ve got everything you need to level up your setup. Premium quality products delivered right to your doorstep in South Africa.
          </p>

          {/* Legal Links */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs">
            <Link
              href="/terms"
              className="text-white/40 hover:text-white transition-colors cursor-pointer"
            >
              Terms of Service
            </Link>
            <span className="text-white/20">|</span>
            <Link
              href="/privacy"
              className="text-white/40 hover:text-white transition-colors cursor-pointer"
            >
              Privacy Policy
            </Link>
            <span className="text-white/20">|</span>
            <Link
              href="/shipping"
              className="text-white/40 hover:text-white transition-colors cursor-pointer"
            >
              Shipping
            </Link>
            <span className="text-white/20">|</span>
            <Link
              href="/return-request"
              className="text-white/40 hover:text-white transition-colors cursor-pointer"
            >
              Returns
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
