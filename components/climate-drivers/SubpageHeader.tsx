// components/climate-drivers/SubpageHeader.tsx
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe, ArrowLeft, Layers, Waves, CloudRain, Compass, RefreshCw, Sparkles } from "lucide-react";
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
    { id: "overview", label: "Ringkasan Dynamic", href: "/dashboard/climate-drivers", icon: Layers },
    { id: "enso", label: "ENSO (El Niño / La Niña)", href: "/dashboard/climate-drivers/enso", icon: Waves },
    { id: "mjo", label: "MJO (Madden-Julian Oscillation)", href: "/dashboard/climate-drivers/mjo", icon: CloudRain },
    { id: "iod", label: "IOD (Indian Ocean Dipole)", href: "/dashboard/climate-drivers/iod", icon: Compass },
  ];

  return (
    <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 text-white rounded-2xl shadow-lg border border-indigo-800/40 overflow-hidden relative mb-6">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Banner Header Content */}
      <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <div className="space-y-1.5">
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
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="gap-1.5 text-xs font-semibold text-white bg-slate-800/90 hover:bg-slate-700 border-slate-700 shadow-sm"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 text-indigo-400", isRefreshing && "animate-spin")} />
              Perbarui Data
            </Button>
          )}
          <Button size="sm" asChild className="gap-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
            <Link href="/dashboard/klimatologi">
              <Compass className="h-4 w-4" /> Analisis Stasiun Cuaca
            </Link>
          </Button>
        </div>
      </div>

      {/* Integrated Navigation Tabs at the Bottom of Banner */}
      <div className="px-6 pb-4 pt-2 bg-slate-950/40 border-t border-indigo-900/30 relative z-10">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href;

            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 whitespace-nowrap border",
                  isActive
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-md scale-[1.02]"
                    : "bg-slate-900/70 text-slate-300 border-slate-800/80 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-white" : "text-slate-400")} />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};
