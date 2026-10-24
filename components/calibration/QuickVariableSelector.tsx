"use client";

import React from "react";
import { MeteorologicalVariable } from "@/lib/bias-correction/types";
import { Badge } from "@/components/ui/badge";
import {
  Thermometer,
  Droplets,
  CloudFog,
  Gauge,
  Wind,
  Compass,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export interface QuickVariableItem {
  id: MeteorologicalVariable;
  label: string;
  shortLabel: string;
  unit: string;
  sensorKey: string;
  icon: React.ElementType;
}

export const QUICK_VARIABLES: QuickVariableItem[] = [
  { id: "air_temperature", label: "Suhu Udara (2m)", shortLabel: "Suhu Udara", unit: "°C", sensorKey: "temperature", icon: Thermometer },
  { id: "relative_humidity", label: "Kelembapan Relatif", shortLabel: "Kelembapan", unit: "%", sensorKey: "humidity", icon: Droplets },
  { id: "dew_point_temperature", label: "Titik Embun", shortLabel: "Titik Embun", unit: "°C", sensorKey: "dew", icon: CloudFog },
  { id: "surface_pressure", label: "Tekanan Permukaan", shortLabel: "Tekanan", unit: "hPa", sensorKey: "pressure", icon: Gauge },
  { id: "wind_speed", label: "Kecepatan Angin", shortLabel: "Kec. Angin", unit: "m/s", sensorKey: "windSpeed", icon: Wind },
  { id: "wind_direction", label: "Arah Angin", shortLabel: "Arah Angin", unit: "°", sensorKey: "windDirection", icon: Compass },
];

interface QuickVariableSelectorProps {
  selectedVariable: MeteorologicalVariable;
  onSelectVariable: (variable: MeteorologicalVariable) => void;
  stagedCalibrationsForStation?: Record<string, any>;
  disabled?: boolean;
}

export function QuickVariableSelector({
  selectedVariable,
  onSelectVariable,
  stagedCalibrationsForStation = {},
  disabled = false,
}: QuickVariableSelectorProps) {
  return (
    <div className="w-full space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-1 px-0.5">
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <span>Parameter Meteorologi Terpilih:</span>
        </label>
        <span className="text-[10px] text-slate-400">
          Klik untuk memilih parameter yang ingin divalidasi &amp; dikalibrasi
        </span>
      </div>

      {/* Grid of 6 Horizontal Variable Chips (No height crunch, no text overlap) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
        {QUICK_VARIABLES.map(v => {
          const isSelected = selectedVariable === v.id;
          const IconComp = v.icon;
          const stagedItem = stagedCalibrationsForStation[v.sensorKey];

          return (
            <button
              key={v.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectVariable(v.id)}
              className={`group text-left p-2 sm:p-2.5 rounded-xl border transition-all duration-200 flex items-center gap-2 sm:gap-2.5 min-h-[56px] h-auto ${
                isSelected
                  ? "bg-gradient-to-r from-blue-50 to-indigo-50/90 dark:from-blue-950/70 dark:to-indigo-950/50 border-blue-500 dark:border-blue-500 shadow-sm ring-1 ring-blue-500/30"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
              } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {/* Icon */}
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:text-blue-500"
                }`}
              >
                <IconComp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>

              {/* Labels */}
              <div className="min-w-0 flex-1">
                <div className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-100 truncate leading-tight">
                  {v.shortLabel}
                </div>
                <div className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                  {v.unit}
                </div>
              </div>

              {/* Status Indicator */}
              <div className="shrink-0 flex items-center">
                {stagedItem ? (
                  <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[9px] px-1.5 py-0 h-4 rounded-full font-bold shadow-xs">
                    Draf
                  </Badge>
                ) : isSelected ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
