// components/climate-drivers/SubpageHeader.tsx
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe, ArrowLeft, Layers, Waves, CloudRain, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SubpageHeaderProps {
  title: string;
  subtitle: string;
  activeTab?: string;
}

export const SubpageHeader: React.FC<SubpageHeaderProps> = ({
  title,
  subtitle,
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
      {/* Top Banner & Breadcrumb */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-2 border-b dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            {pathname !== "/dashboard/climate-drivers" && (
              <Button variant="ghost" size="icon" asChild className="h-8 w-8 mr-1">
                <Link href="/dashboard/climate-drivers">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
            )}
            <div className="p-2 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Globe className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-slate-100 flex items-center gap-2">
                {title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Action button to explore climate documentation or back to main */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <Button variant="outline" size="sm" asChild className="gap-2 text-xs font-semibold">
            <Link href="/dashboard/klimatologi">
              <Compass className="h-4 w-4 text-indigo-500" /> Analisis Stasiun Cuaca
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
