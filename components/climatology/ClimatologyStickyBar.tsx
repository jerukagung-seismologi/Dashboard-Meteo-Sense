// components/climatology/ClimatologyStickyBar.tsx
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Radio,
  Globe,
  MapPin,
  RefreshCw,
  Calendar,
  Compass,
} from "lucide-react";
import { ClimatologyWorkspaceHook } from "@/hooks/climatology/useClimatologyWorkspace";
import { PresetSelector } from "@/components/climatology/PresetSelector";
import { ClimatologyMobileFilterSheet } from "@/components/climatology/ClimatologyMobileFilterSheet";

interface ClimatologyStickyBarProps {
  ws: ClimatologyWorkspaceHook;
}

export function ClimatologyStickyBar({ ws }: ClimatologyStickyBarProps) {
  return (
    <div className="sticky top-0 z-30 w-full bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-all duration-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-3">
        {/* Left Side: Active Location Badge & Mode Selector */}
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Mode Pill Toggle (Desktop) */}
          <div className="hidden md:flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold shrink-0">
            <button
              onClick={() => ws.setLocationMode("station")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                ws.locationMode === "station"
                  ? "bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Radio className="h-3 w-3 text-teal-500" />
              <span>Stasiun</span>
            </button>
            <button
              onClick={() => ws.setLocationMode("region")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                ws.locationMode === "region"
                  ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Globe className="h-3 w-3 text-indigo-500" />
              <span>Wilayah</span>
            </button>
          </div>

          {/* Desktop Station / Region Dropdown */}
          <div className="hidden md:flex items-center min-w-0">
            {ws.locationMode === "station" ? (
              <Select
                value={ws.sensorId}
                onValueChange={(val) => ws.setSensorId(val)}
                disabled={ws.devices.length === 0}
              >
                <SelectTrigger className="h-8 text-xs bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 max-w-[220px] font-medium">
                  <MapPin className="h-3.5 w-3.5 mr-1 text-teal-500 shrink-0" />
                  <SelectValue placeholder="Pilih Stasiun" />
                </SelectTrigger>
                <SelectContent>
                  {ws.devices.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-xs font-semibold text-indigo-800 dark:text-indigo-200 truncate max-w-[240px]">
                <Globe className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                <span className="truncate">{ws.activeLocation.name}</span>
                <span className="text-[10px] text-indigo-500/80 font-mono font-normal">
                  ({ws.activeCoords.lat.toFixed(2)}°, {ws.activeCoords.lng.toFixed(2)}°)
                </span>
              </div>
            )}
          </div>

          {/* Mobile Active Location Indicator */}
          <div className="flex md:hidden items-center gap-1.5 min-w-0">
            <span className={`p-1 rounded-md ${ws.locationMode === "station" ? "bg-teal-500/10 text-teal-600" : "bg-indigo-500/10 text-indigo-600"}`}>
              {ws.locationMode === "station" ? <Radio className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[150px] sm:max-w-[220px]">
              {ws.activeLocation.name}
            </span>
          </div>
        </div>

        {/* Right Side: Desktop Controls & Mobile Sheet Trigger */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Desktop Preset Selector */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            <PresetSelector
              preset={ws.preset}
              setPreset={ws.setPreset}
              selectedMonth={ws.selectedMonth}
              setSelectedMonth={ws.setSelectedMonth}
              selectedYear={ws.selectedYear}
              setSelectedYear={ws.setSelectedYear}
              selectedDasarian={ws.selectedDasarian}
              setSelectedDasarian={ws.setSelectedDasarian}
              isLoading={ws.isKlimLoading}
              onRefresh={ws.handleRefreshKlim}
            />
          </div>

          {/* Refresh Action Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={ws.handleRefreshKlim}
            disabled={ws.isKlimLoading}
            className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
            title="Segarkan data iklim"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${ws.isKlimLoading ? "animate-spin text-teal-500" : ""}`} />
          </Button>

          {/* Mobile Filter Sheet Button */}
          <div className="flex lg:hidden">
            <ClimatologyMobileFilterSheet ws={ws} />
          </div>
        </div>
      </div>
    </div>
  );
}
