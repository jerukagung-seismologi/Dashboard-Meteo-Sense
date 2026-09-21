// components/ui/PageHeaderBanner.tsx
"use client";

import React from "react";
import { LucideIcon, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PageHeaderBannerProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: LucideIcon;
  gradient?: "indigo" | "teal" | "sky" | "purple" | "emerald" | "blue" | "slate";
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

const GRADIENT_THEMES = {
  indigo: {
    container: "bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 border-indigo-800/40",
    glow: "bg-indigo-500/20",
    badge: "bg-indigo-500/20 text-indigo-300 border-indigo-400/30",
    icon: "text-indigo-400",
    bottomBorder: "border-indigo-900/30",
  },
  teal: {
    container: "bg-gradient-to-r from-teal-950 via-slate-900 to-slate-950 border-teal-800/40",
    glow: "bg-teal-500/20",
    badge: "bg-teal-500/20 text-teal-300 border-teal-400/30",
    icon: "text-teal-400",
    bottomBorder: "border-teal-900/30",
  },
  sky: {
    container: "bg-gradient-to-r from-sky-950 via-slate-900 to-slate-950 border-sky-800/40",
    glow: "bg-sky-500/20",
    badge: "bg-sky-500/20 text-sky-300 border-sky-400/30",
    icon: "text-sky-400",
    bottomBorder: "border-sky-900/30",
  },
  purple: {
    container: "bg-gradient-to-r from-purple-950 via-slate-900 to-slate-950 border-purple-800/40",
    glow: "bg-purple-500/20",
    badge: "bg-purple-500/20 text-purple-300 border-purple-400/30",
    icon: "text-purple-400",
    bottomBorder: "border-purple-900/30",
  },
  emerald: {
    container: "bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 border-emerald-800/40",
    glow: "bg-emerald-500/20",
    badge: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
    icon: "text-emerald-400",
    bottomBorder: "border-emerald-900/30",
  },
  blue: {
    container: "bg-gradient-to-r from-blue-950 via-slate-900 to-slate-950 border-blue-800/40",
    glow: "bg-blue-500/20",
    badge: "bg-blue-500/20 text-blue-300 border-blue-400/30",
    icon: "text-blue-400",
    bottomBorder: "border-blue-900/30",
  },
  slate: {
    container: "bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border-slate-800",
    glow: "bg-slate-500/10",
    badge: "bg-slate-700/50 text-slate-300 border-slate-600/40",
    icon: "text-slate-300",
    bottomBorder: "border-slate-800",
  },
};

export const PageHeaderBanner: React.FC<PageHeaderBannerProps> = ({
  title,
  subtitle,
  icon: MainIcon,
  gradient = "indigo",
  actions,
  children,
  className,
}) => {
  const theme = GRADIENT_THEMES[gradient] || GRADIENT_THEMES.indigo;

  return (
    <div
      className={cn(
        "rounded-2xl shadow-md border overflow-hidden relative mb-6 text-white transition-all",
        theme.container,
        className
      )}
    >
      {/* Background Ambient Glow */}
      <div
        className={cn(
          "absolute top-0 right-0 w-72 h-72 rounded-full blur-3xl pointer-events-none",
          theme.glow
        )}
      />

      {/* Main Banner Header Content (Compact padding: p-4 sm:p-5) */}
      <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <div className="space-y-1.5 min-w-0">
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2.5 text-white leading-tight">
            {MainIcon && <MainIcon className={cn("h-6 w-6 shrink-0", theme.icon)} />}
            <span className="truncate">{title}</span>
          </h1>

          {subtitle && (
            <div className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed max-w-3xl">
              {subtitle}
            </div>
          )}
        </div>

        {/* Action Elements / Status Badges at Right */}
        {actions && (
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0 z-10">
            {actions}
          </div>
        )}
      </div>

      {/* Optional Child Elements (e.g. Navigation Tabs or Quick Filter Bar) */}
      {children && (
        <div
          className={cn(
            "px-4 sm:px-5 py-2.5 bg-slate-950/40 border-t relative z-10",
            theme.bottomBorder
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
};
