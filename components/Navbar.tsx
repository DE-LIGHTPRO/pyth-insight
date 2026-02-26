"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import PythLogo from "@/components/PythLogo";

const NAV_LINKS = [
  { href: "/dashboard/feeds",       label: "Live Feeds" },
  { href: "/dashboard/calibration", label: "Calibration" },
  { href: "/dashboard/volatility",  label: "Volatility" },
  { href: "/ai",                    label: "AI Analyst" },
  { href: "/learn",                 label: "Learn Pyth" },
  { href: "/game",                  label: "Game" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-[rgb(var(--border))] bg-[rgb(var(--background))]/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <PythLogo size={28} className="transition-opacity group-hover:opacity-90" />
          <span className="font-semibold text-white tracking-tight">
            Pyth <span className="text-purple-400">Insight</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "text-sm px-3 py-1.5 rounded-lg transition-colors",
                pathname.startsWith(link.href)
                  ? "text-white bg-white/10"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Live
          </span>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-white transition-colors text-sm"
          >
            GitHub
          </a>
        </div>
      </div>
    </nav>
  );
}
