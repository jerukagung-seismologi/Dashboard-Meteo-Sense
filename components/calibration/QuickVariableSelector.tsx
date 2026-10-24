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
  { id: "air_temperature", label: "Suhu Udara (2m)", shortLabel: "Suhu", unit: "°C", sensorKey: "temperature", icon: Thermometer },
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
    <div className="w-full space-y-1.5">
      <div className="flex items-center justify-between px-1">
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <span>Pilih Parameter Meteorologi:</span>
        </label>
        <span className="text-[10px] text-slate-400">
          Klik untuk beralih parameter analitis
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
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
              className={`group relative text-left p-2.5 rounded-xl border transition-all duration-200 flex flex-col justify-between h-[68px] ${
                isSelected
                  ? "bg-gradient-to-br from-blue-50 to-indigo-50/80 dark:from-blue-950/60 dark:to-indigo-950/40 border-blue-500/80 dark:border-blue-500 shadow-sm ring-1 ring-blue-500/30"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/60 dark:hover:bg-slate-800/50"
              } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <div className="flex items-center justify-between w-full">
                <div
                  className={`p-1.5 rounded-lg transition-colors ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:text-blue-500"
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                </div>

                {stagedItem ? (
                  <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[9px] px-1 py-0 h-4 rounded-full font-bold">
                    Draf
                  </Badge>
                ) : isSelected ? (
                  <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400" />
                ) : null}
              </div>

              <div className="mt-1">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {v.shortLabel}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  Satuan: <span className="font-mono font-medium">{v.unit}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
