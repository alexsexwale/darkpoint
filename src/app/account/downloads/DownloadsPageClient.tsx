"use client";

import Link from "next/link";
import { AccountLayout } from "@/components/account";
import { Button } from "@/components/ui";

// Mock downloads data
const mockDownloads: {
  id: string;
  name: string;
  date: string;
  expiresAt: string;
  downloadsRemaining: number;
}[] = [];

export function DownloadsPageClient() {
  return (
    <AccountLayout title="Downloads">
      {mockDownloads.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[var(--muted-foreground)] mb-4">
            No downloads available yet.
          </p>
          <Link href="/store">
            <Button variant="outline">Browse Products</Button>
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 font-heading text-sm uppercase tracking-wider">
                  Product
                </th>
                <th className="text-left py-3 px-4 font-heading text-sm uppercase tracking-wider">
                  Downloads Remaining
                </th>
                <th className="text-left py-3 px-4 font-heading text-sm uppercase tracking-wider">
                  Expires
                </th>
                <th className="py-3 px-4">&nbsp;</th>
              </tr>
            </thead>
            <tbody>
              {mockDownloads.map((download) => (
                <tr
                  key={download.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="py-4 px-4">{download.name}</td>
                  <td className="py-4 px-4 text-white/70">
                    {download.downloadsRemaining}
                  </td>
                  <td className="py-4 px-4 text-white/70">
                    {new Date(download.expiresAt).toLocaleDateString("en-ZA")}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <Button variant="outline" size="sm">
                      Download
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AccountLayout>
  );
}


