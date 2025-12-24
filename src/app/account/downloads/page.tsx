import { Metadata } from "next";
import { DownloadsPageClient } from "./DownloadsPageClient";

export const metadata: Metadata = {
  title: "Downloads | Account",
  description: "View your downloadable products.",
};

export default function DownloadsPage() {
  return <DownloadsPageClient />;
}


