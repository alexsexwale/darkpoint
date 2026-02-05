import { Suspense } from "react";
import { Metadata } from "next";
import { DownloadsPageClient } from "./DownloadsPageClient";

export const metadata: Metadata = {
  title: "Downloads | Account",
  description: "View your downloadable products.",
};

function DownloadsFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-[var(--muted-foreground)]">Loading...</p>
    </div>
  );
}

export default function DownloadsPage() {
  return (
    <Suspense fallback={<DownloadsFallback />}>
      <DownloadsPageClient />
    </Suspense>
  );
}


