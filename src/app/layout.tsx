import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "LaunchLens — Market Entry Sanity Check",
  description: "Compare two market-entry strategies or get ranked first tests from Qloo’s cultural signals. LaunchLens helps you choose what to test first in a new market.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
