import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "LaunchLens — Market Entry Sanity Check",
  description: "Compare a brand or product with a target audience in a new market. Surface cultural connections and potential gaps as hypotheses to investigate.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
