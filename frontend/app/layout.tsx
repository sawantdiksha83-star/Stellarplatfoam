import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Stellancer — Freelance Payments on Stellar",
  description: "Decentralized freelance payments, escrow, and milestones on the Stellar blockchain.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans bg-[#0a0a0a] text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}
