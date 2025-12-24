"use client";

import { ReactNode } from "react";
import { AccountSidebar } from "./AccountSidebar";

interface AccountLayoutProps {
  children: ReactNode;
  title: string;
}

export function AccountLayout({ children, title }: AccountLayoutProps) {
  const handleLogout = () => {
    // TODO: Implement logout logic
    console.log("Logout clicked");
  };

  return (
    <div className="container py-8">
      {/* Page Title */}
      <div className="text-center mb-12 pt-8">
        <h1 className="text-4xl md:text-5xl font-heading uppercase tracking-wider">
          Account
        </h1>
        <div className="w-24 h-px bg-white/20 mx-auto mt-4" />
      </div>

      {/* Account Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-12">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <AccountSidebar onLogout={handleLogout} />
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="nk-box-3">
            <h2 className="text-3xl font-heading mb-6">{title}</h2>
            {children}
          </div>
        </div>
      </div>

      <div className="h-24" />
    </div>
  );
}

