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

  // Check if a child link is active (exact match or starts with for nested routes)
  const isChildActive = (href: string) => {
    const basePath = href.split("?")[0];
    if (basePath === "/") return pathname === "/";
    // Exact match for most cases, but allow startsWith for deeper nesting
    return pathname === basePath || (pathname.startsWith(basePath + "/"));
  };

  // Check if a parent link should be highlighted
  // Only highlight parent if we're exactly on the parent page, not on a child page
  const isParentActive = (link: NavLink) => {
    const basePath = link.href.split("?")[0];
    if (basePath === "/") return pathname === "/";
    
    // If the link has children, check if we're on a child page
    if (link.children) {
      const isOnChildPage = link.children.some(child => {
        const childPath = child.href.split("?")[0];
        return pathname === childPath || pathname.startsWith(childPath + "/");
      });
      // Only highlight parent if we're exactly on the parent page (e.g., /rewards exactly)
      // and not on any child page
      if (isOnChildPage && pathname !== basePath) {
        return false;
      }
    }
    
    return pathname === basePath || pathname.startsWith(basePath + "/");
  };

  // Legacy function for backward compatibility
  const isActive = (href: string) => isChildActive(href);

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
                isParentActive(link)
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
                        isChildActive(child.href)
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
            isActive={isParentActive(link)}
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
                        isChildActive(child.href)
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
