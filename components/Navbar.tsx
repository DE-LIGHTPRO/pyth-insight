"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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
  const pathname   = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-[rgb(var(--border))] bg-[rgb(var(--background))]/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group" onClick={() => setOpen(false)}>
          <PythLogo size={28} className="transition-opacity group-hover:opacity-90" />
          <span className="font-semibold text-white tracking-tight">
            Pyth <span className="text-purple-400">Insight</span>
          </span>
        </Link>

        {/* Desktop nav links */}
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
            <span className="hidden sm:inline">Live</span>
          </span>
          <a
            href={process.env.NEXT_PUBLIC_GITHUB_URL ?? "https://github.com/DE-LIGHTPRO/pyth-insight"}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:block text-slate-400 hover:text-white transition-colors text-sm"
          >
            GitHub
          </a>

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex flex-col gap-1.5 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <span className={clsx("w-5 h-0.5 bg-slate-400 rounded transition-all origin-center", open && "rotate-45 translate-y-2")} />
            <span className={clsx("w-5 h-0.5 bg-slate-400 rounded transition-all", open && "opacity-0")} />
            <span className={clsx("w-5 h-0.5 bg-slate-400 rounded transition-all origin-center", open && "-rotate-45 -translate-y-2")} />
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden border-t border-white/6 bg-[rgb(var(--background))]/95 backdrop-blur-md px-4 py-3 flex flex-col gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={clsx(
                "text-sm px-3 py-2.5 rounded-lg transition-colors",
                pathname.startsWith(link.href)
                  ? "text-white bg-white/10"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              {link.label}
            </Link>
          ))}
          <a
            href={process.env.NEXT_PUBLIC_GITHUB_URL ?? "https://github.com/DE-LIGHTPRO/pyth-insight"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm px-3 py-2.5 text-slate-400 hover:text-white transition-colors"
            onClick={() => setOpen(false)}
          >
            GitHub ↗
          </a>
        </div>
      )}
    </nav>
  );
}
