import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EPIC Review Boost",
  description: "Google review gamification for EPIC Toyota showrooms",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
