import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Pyth Insight — Oracle Intelligence Platform",
  description:
    "The first platform to publicly measure whether Pyth's confidence intervals are statistically accurate. Built on Pyth Price Feeds, Benchmarks, Entropy, and the Pyth MCP Server.",
  keywords: ["Pyth", "oracle", "DeFi", "confidence interval", "calibration", "blockchain"],
  openGraph: {
    title: "Pyth Insight",
    description: "Are Pyth's confidence intervals actually accurate? We measured it.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <Navbar />
        <main className="min-h-screen">{children}</main>
        <footer className="border-t border-[rgb(var(--border))] mt-20 py-8 text-center text-sm text-slate-500">
          Built for{" "}
          <a
            href="https://forum.pyth.network/t/pyth-playground-community-hackathon/2363"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300"
          >
            Pyth Playground Hackathon 2026
          </a>{" "}
          · Powered by Pyth Price Feeds, Benchmarks &amp; Entropy
        </footer>
      </body>
    </html>
  );
}
