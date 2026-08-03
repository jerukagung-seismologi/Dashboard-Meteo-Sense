// components/climate-drivers/StatusBadge.tsx
import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  type: "enso" | "mjo" | "iod" | "convection";
  value: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  type,
  value,
  className,
  size = "md",
}) => {
  let badgeStyle = "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border-gray-300";
  let icon = "🟢";

  if (type === "enso") {
    if (value.includes("El Niño")) {
      badgeStyle = "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300 border-red-300 dark:border-red-800";
      icon = "🔴";
    } else if (value.includes("La Niña")) {
      badgeStyle = "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-300 dark:border-blue-800";
      icon = "🔵";
    } else {
      badgeStyle = "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800";
      icon = "🟢";
    }
  } else if (type === "iod") {
    if (value.includes("Positive")) {
      badgeStyle = "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-300 dark:border-amber-800";
      icon = "🟠";
    } else if (value.includes("Negative")) {
      badgeStyle = "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-300 dark:border-blue-800";
      icon = "🔵";
    } else {
      badgeStyle = "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800";
      icon = "🟢";
    }
  } else if (type === "mjo") {
    if (value.includes("Active")) {
      badgeStyle = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800";
      icon = "🟢";
    } else {
      badgeStyle = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700";
      icon = "⚪";
    }
  } else if (type === "convection") {
    if (value.includes("Enhanced")) {
      badgeStyle = "bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300 border-teal-300 dark:border-teal-800";
      icon = "🌧️";
    } else if (value.includes("Suppressed")) {
      badgeStyle = "bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300 border-orange-300 dark:border-orange-800";
      icon = "☀️";
    } else {
      badgeStyle = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700";
      icon = "⛅";
    }
  }

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs font-semibold",
    md: "px-3 py-1 text-xs sm:text-sm font-semibold",
    lg: "px-4 py-1.5 text-sm sm:text-base font-bold",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border shadow-sm transition-all",
        badgeStyle,
        sizeClasses[size],
        className
      )}
    >
      <span>{icon}</span>
      <span>{value}</span>
    </Badge>
  );
};
