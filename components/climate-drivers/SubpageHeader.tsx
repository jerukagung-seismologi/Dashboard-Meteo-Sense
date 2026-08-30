// components/climate-drivers/SubpageHeader.tsx
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe, ArrowLeft, Layers, Waves, CloudRain, Compass, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SubpageHeaderProps {
  title: string;
  subtitle: string;
  activeTab?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const SubpageHeader: React.FC<SubpageHeaderProps> = ({
  title,
  subtitle,
  onRefresh,
  isRefreshing,
}) => {
  const pathname = usePathname();

  const tabs = [
    { id: "overview", label: "Ringkasan", href: "/dashboard/climate-drivers", icon: Layers },
    { id: "enso", label: "ENSO", href: "/dashboard/climate-drivers/enso", icon: Waves },
    { id: "mjo", label: "MJO", href: "/dashboard/climate-drivers/mjo", icon: CloudRain },
    { id: "iod", label: "IOD", href: "/dashboard/climate-drivers/iod", icon: Compass },
  ];

  return (
    <div className="space-y-4 mb-6">
      {/* Top Banner Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-indigo-900 via-slate-900 to-slate-950 text-white rounded-2xl shadow-lg border border-indigo-800/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            {pathname !== "/dashboard/climate-drivers" && (
              <Button variant="ghost" size="icon" asChild className="h-7 w-7 text-white hover:bg-white/10 mr-1">
                <Link href="/dashboard/climate-drivers">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
            )}
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-indigo-300" /> Climate Drivers &amp; Teleconnections Monitoring
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
            <Globe className="h-7 w-7 text-indigo-400" /> {title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Action button to explore climate documentation or back to main */}
        <div className="z-10 flex items-center gap-2 self-start md:self-auto">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="gap-1.5 text-xs font-semibold text-white bg-slate-800/90 hover:bg-slate-700 border-slate-700"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 text-indigo-400", isRefreshing && "animate-spin")} />
              Perbarui Data
            </Button>
          )}
          <Button size="sm" asChild className="gap-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white">
            <Link href="/dashboard/klimatologi">
              <Compass className="h-4 w-4" /> Analisis Stasiun Cuaca
            </Link>
          </Button>
        </div>
      </div>

      {/* Interactive Tabs Row */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 border dark:border-slate-800 rounded-xl overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 whitespace-nowrap",
                isActive
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50"
              )}
            >
              <Icon className={cn("h-4 w-4", isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400")} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
};
