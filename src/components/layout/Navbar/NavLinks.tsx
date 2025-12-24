"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NavLinkEffect } from "@/components/ui/NavLinkEffect";

interface NavLink {
  label: string;
  href: string;
  children?: NavLink[];
}

const navLinks: NavLink[] = [
  { label: "Home", href: "/" },
  {
    label: "Store",
    href: "/store",
    children: [
      { label: "All Products", href: "/store" },
      { label: "Mystery Boxes", href: "/store/mystery-boxes" },
      { label: "Accessories", href: "/store?category=accessories" },
      { label: "Gadgets", href: "/store?category=gadgets" },
      { label: "Wearables", href: "/store?category=wearables" },
      { label: "Audio", href: "/store?category=audio" },
    ],
  },
  { label: "Games", href: "/games" },
  {
    label: "Rewards",
    href: "/rewards",
    children: [
      { label: "Rewards Hub", href: "/rewards" },
      { label: "Spin Wheel", href: "/rewards/spin" },
      { label: "Rewards Shop", href: "/rewards/shop" },
      { label: "Achievements", href: "/account/achievements" },
      { label: "Referrals", href: "/account/referrals" },
    ],
  },
  { label: "News", href: "/news" },
];

interface NavLinksProps {
  className?: string;
  mobile?: boolean;
  onLinkClick?: () => void;
}

export function NavLinks({ className, mobile, onLinkClick }: NavLinksProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href.split("?")[0]);
  };

  if (mobile) {
    return (
      <ul className={cn("flex flex-col space-y-2", className)}>
        {navLinks.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              onClick={onLinkClick}
              className={cn(
                "block py-3 px-4 font-heading text-lg transition-colors",
                isActive(link.href)
                  ? "text-[var(--color-main-1)]"
                  : "text-white hover:text-[var(--color-main-1)]"
              )}
            >
              {link.label}
            </Link>
            {link.children && (
              <ul className="pl-4 space-y-1">
                {link.children.map((child) => (
                  <li key={child.href}>
                    <Link
                      href={child.href}
                      onClick={onLinkClick}
                      className={cn(
                        "block py-2 px-4 text-sm transition-colors",
                        isActive(child.href)
                          ? "text-[var(--color-main-1)]"
                          : "text-[var(--muted-foreground)] hover:text-white"
                      )}
                    >
                      {child.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className={cn("flex items-center gap-1", className)}>
      {navLinks.map((link) => (
        <li key={link.href} className="relative group">
          <NavLinkEffect
            href={link.href}
            isActive={isActive(link.href)}
            showDots={true}
          >
            {link.label}
          </NavLinkEffect>
          {link.children && (
            <div className="absolute left-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <ul className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] min-w-[200px] py-2 shadow-xl">
                {link.children.map((child) => (
                  <li key={child.href}>
                    <Link
                      href={child.href}
                      className={cn(
                        "block px-4 py-2 text-sm transition-colors",
                        isActive(child.href)
                          ? "text-[var(--color-main-1)] bg-[var(--color-dark-3)]"
                          : "text-[var(--muted-foreground)] hover:text-white hover:bg-[var(--color-dark-3)]"
                      )}
                    >
                      {child.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
