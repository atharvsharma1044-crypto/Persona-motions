"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Film,
  Sparkles,
  Layers,
  Activity,
  Cpu,
  Database,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Motion Swap (Video-to-Video)",
      href: "/studio/swap",
      icon: Activity,
      badge: "Mode B",
    },
    {
      label: "Story-to-Video (Storyboard)",
      href: "/studio/story",
      icon: Film,
      badge: "Mode A",
    },
    {
      label: "Character Vault",
      href: "/vault",
      icon: Layers,
      badge: "Cloud Vault",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
      {/* Top Studio Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link href="/studio/swap" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-400 p-[1.5px] shadow-lg shadow-violet-600/20 group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-violet-400" />
                </div>
              </div>
              <div>
                <span className="font-bold text-base tracking-tight bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                  PersonaMotion
                </span>
                <span className="text-[10px] uppercase font-mono tracking-widest text-violet-400 block -mt-1 font-semibold">
                  Web Studio
                </span>
              </div>
            </Link>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1.5 ml-4">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? "bg-zinc-800/90 text-white shadow-sm border border-zinc-700/80"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-violet-400" : "text-zinc-400"}`} />
                    <span>{item.label}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-900/90 border border-zinc-800 text-zinc-400">
                      {item.badge}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Cloud Infrastructure Telemetry & Status */}
          <div className="flex items-center gap-3">
            {/* Serverless GPU cluster status */}
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-400">
              <Cpu className="w-3.5 h-3.5 text-violet-400" />
              <span>Modal A100 Node</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            {/* Cloudflare R2 / S3 status */}
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-400">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>R2 Vault</span>
              <span className="text-zinc-500">Presigned PUT</span>
            </div>

            {/* Render Credits */}
            <Badge variant="purple" className="text-xs font-mono py-1 px-3">
              1,250 Compute Credits
            </Badge>

            {/* User Avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 p-[1px] cursor-pointer">
              <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center font-bold text-xs text-violet-300">
                PM
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Studio Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Studio Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-4 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>PersonaMotion Web v1.0 • Built on Next.js 14, SAM 2, LivePortrait, Wan 2.1 & Modal.com</span>
          <div className="flex items-center gap-4 text-zinc-400">
            <span className="hover:text-zinc-200 cursor-pointer">Cloud Architecture Docs</span>
            <span className="hover:text-zinc-200 cursor-pointer">Inference API</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
