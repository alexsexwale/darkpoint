"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { NavLinkEffect } from "@/components/ui/NavLinkEffect";
import { useGamificationStore } from "@/stores";

interface NavLink {
  label: string;
  href: string;
  children?: NavLink[];
  vipOnly?: boolean;
}

const baseNavLinks: NavLink[] = [
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
  {
    label: "Games",
    href: "/games",
    children: [
      { label: "Game Zone", href: "/games" },
      { label: "Retro Arcade", href: "/arcade" },
      { label: "Card Games", href: "/games/cards" },
      { label: "Board Games", href: "/games/board" },
    ],
  },
  {
    label: "Rewards",
    href: "/rewards",
    children: [
      { label: "Rewards Hub", href: "/rewards" },
      { label: "Spin Wheel", href: "/rewards/spin" },
      { label: "Rewards Shop", href: "/rewards/shop" },
      { label: "Achievements", href: "/account/achievements" },
      { label: "Referrals", href: "/account/referrals" },
      { label: "✨ VIP Lounge", href: "/vip", vipOnly: true },
    ],
  },
  { label: "News", href: "/news" },
];

interface NavLinksProps {
  className?: string;
  mobile?: boolean;
  onLinkClick?: () => void;
}

// Internal component that uses useSearchParams (must be wrapped in Suspense)
function NavLinksInternal({ className, mobile, onLinkClick }: NavLinksProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { hasAnyBadge } = useGamificationStore();
  const isVIP = hasAnyBadge();

  // Build current full URL for comparison
  const currentUrl = searchParams.toString() 
    ? `${pathname}?${searchParams.toString()}` 
    : pathname;

  // Filter out VIP-only links if user doesn't have a badge
  const navLinks = baseNavLinks.map(link => ({
    ...link,
    children: link.children?.filter(child => !child.vipOnly || isVIP),
  }));

  // Check if a child link is active - compare full URL including query params
  const isChildActive = (href: string) => {
    // For links with query params, compare the full URL
    if (href.includes("?")) {
      return currentUrl === href;
    }
    
    // Special case for /store (All Products) - only highlight if no category filter is active
    if (href === "/store") {
      return pathname === "/store" && !searchParams.has("category");
    }
    
    // Special case for /games (Game Zone) - only highlight if exactly on /games, not sub-paths
    if (href === "/games") {
      return pathname === "/games";
    }
    
    // Special case for /arcade - highlight for /arcade and /arcade/* paths
    if (href === "/arcade") {
      return pathname === "/arcade" || pathname.startsWith("/arcade/");
    }
    
    // For other paths without query params (like /store/mystery-boxes), just match the pathname
    return pathname === href || pathname.startsWith(href + "/");
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
          {link.children && link.children.length > 0 && (
            <div className="absolute left-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <ul className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] min-w-[200px] py-2 shadow-xl">
                {link.children.map((child) => (
                  <li key={child.href}>
                    <Link
                      href={child.href}
                      className={cn(
                        "block px-4 py-2 text-sm transition-colors",
                        child.vipOnly 
                          ? "bg-gradient-to-r from-purple-500/10 to-amber-500/10 text-amber-400 hover:from-purple-500/20 hover:to-amber-500/20 border-t border-amber-500/20 mt-1"
                          : isChildActive(child.href)
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

// Export wrapper that provides Suspense boundary for useSearchParams
export function NavLinks(props: NavLinksProps) {
  const fallback = props.mobile ? (
    <ul className={cn("flex flex-col space-y-2", props.className)}>
      {baseNavLinks.map((link) => (
        <li key={link.href}>
          <Link
            href={link.href}
            className="block py-3 px-4 font-heading text-lg text-white"
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  ) : (
    <ul className={cn("flex items-center gap-1", props.className)}>
      {baseNavLinks.map((link) => (
        <li key={link.href} className="relative group">
          <NavLinkEffect
            href={link.href}
            isActive={false}
            showDots={true}
          >
            {link.label}
          </NavLinkEffect>
        </li>
      ))}
    </ul>
  );

  return (
    <Suspense fallback={fallback}>
      <NavLinksInternal {...props} />
    </Suspense>
  );
}
