"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface AccountNavItem {
  label: string;
  href: string;
  onClick?: () => void;
}

const accountNavItems: AccountNavItem[] = [
  { label: "Dashboard", href: "/account" },
  { label: "Orders", href: "/account/orders" },
  { label: "Downloads", href: "/account/downloads" },
  { label: "Addresses", href: "/account/addresses" },
  { label: "Reviews & Reports", href: "/account/reviews" },
  { label: "Account Details", href: "/account/details" },
];

const gamificationNavItems: AccountNavItem[] = [
  { label: "⚡ XP History", href: "/account/xp-history" },
  { label: "🏆 Achievements", href: "/account/achievements" },
  { label: "🎁 Referrals", href: "/account/referrals" },
  { label: "🎡 Spin Wheel", href: "/rewards/spin" },
  { label: "🛒 Rewards Shop", href: "/rewards/shop" },
  { label: "🕹️ Retro Arcade", href: "/games" },
];

interface AccountSidebarProps {
  onLogout?: () => void;
}

export function AccountSidebar({ onLogout }: AccountSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/account") {
      return pathname === "/account";
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="nk-sidebar nk-sidebar-left">
      <div className="nk-store-account-links">
        {/* Account Navigation */}
        <ul className="space-y-1">
          {accountNavItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "block py-2 transition-colors",
                  isActive(item.href)
                    ? "text-[var(--color-main-1)]"
                    : "text-white/80 hover:text-white"
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Gamification Section */}
        <div className="mt-6 pt-6 border-t border-[var(--color-dark-3)]">
          <p className="text-xs uppercase tracking-wider text-white/40 mb-3">Rewards & Fun</p>
          <ul className="space-y-1">
            {gamificationNavItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "block py-2 transition-colors",
                    isActive(item.href)
                      ? "text-[var(--color-main-1)]"
                      : "text-white/80 hover:text-white"
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Logout */}
        <div className="mt-6 pt-6 border-t border-[var(--color-dark-3)]">
          <button
            onClick={onLogout}
            className="block py-2 text-white/80 hover:text-white transition-colors w-full text-left cursor-pointer"
          >
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}

