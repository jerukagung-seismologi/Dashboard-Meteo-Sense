// components/climatology/ClimatologyMobileFilterSheet.tsx
"use client";

import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SlidersHorizontal,
  MapPin,
  Globe,
  Radio,
  Search,
  Navigation2,
  Star,
  Check,
  Compass,
  Loader2,
  Calendar,
} from "lucide-react";
import {
  ClimatologyWorkspaceHook,
  INDONESIAN_CLIMATE_REGIONS,
} from "@/hooks/climatology/useClimatologyWorkspace";
import { PresetSelector } from "@/components/climatology/PresetSelector";

interface ClimatologyMobileFilterSheetProps {
  ws: ClimatologyWorkspaceHook;
}

export function ClimatologyMobileFilterSheet({ ws }: ClimatologyMobileFilterSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-3 text-xs flex items-center gap-1.5 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 shadow-xs font-semibold"
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
          <span>Filter &amp; Lokasi</span>
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-[90vw] sm:max-w-md overflow-y-auto p-4 sm:p-6">
        <SheetHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
          <SheetTitle className="text-base font-bold flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-teal-600" />
            Pengaturan Wilayah &amp; Waktu
          </SheetTitle>
          <SheetDescription className="text-xs text-slate-500">
            Tentukan stasiun cuaca IoT atau pilih wilayah regional di Indonesia
          </SheetDescription>
        </SheetHeader>

        <div className="py-4 space-y-5">
          {/* 1. Mode Switcher */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
              Mode Analisis Lokasi
            </label>
            <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
              <button
                onClick={() => ws.setLocationMode("station")}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition ${
                  ws.locationMode === "station"
                    ? "bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs font-bold"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                <Radio className="h-3.5 w-3.5 text-teal-500" />
                <span>Stasiun IoT ({ws.devices.length})</span>
              </button>
              <button
                onClick={() => ws.setLocationMode("region")}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition ${
                  ws.locationMode === "region"
                    ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs font-bold"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                <Globe className="h-3.5 w-3.5 text-indigo-500" />
                <span>Pencarian Wilayah</span>
              </button>
            </div>
          </div>

          {/* 2. Mode 1: Station Selector */}
          {ws.locationMode === "station" ? (
            <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
              <label className="text-xs font-semibold text-slate-500">
                Pilih Stasiun Terdaftar
              </label>
              <Select
                value={ws.sensorId}
                onValueChange={(val) => {
                  ws.setSensorId(val);
                }}
                disabled={ws.devices.length === 0}
              >
                <SelectTrigger className="bg-white dark:bg-slate-900 h-9 text-xs">
                  <MapPin className="w-3.5 h-3.5 mr-1.5 text-teal-500" />
                  <SelectValue placeholder="Pilih Stasiun Sensor" />
                </SelectTrigger>
                <SelectContent>
                  {ws.devices.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      <div className="flex flex-col">
                        <span className="font-semibold">{opt.label}</span>
                        {opt.location && (
                          <span className="text-[10px] text-slate-400">{opt.location}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {ws.currentDevice && (
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Koordinat:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    [{ws.activeCoords.lat.toFixed(3)}°, {ws.activeCoords.lng.toFixed(3)}°]
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* Mode 2: Free Region Coordinates & Search */
            <div className="space-y-3.5 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
              {/* Geocoding Search */}
              <div className="space-y-1 relative">
                <label className="text-xs font-semibold text-slate-500 flex items-center justify-between">
                  <span>Cari Nama Kota / Kecamatan</span>
                  {ws.isSearchingGeocode && <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />}
                </label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Contoh: Kebumen, Surabaya, Kupang..."
                    value={ws.searchQuery}
                    onChange={(e) => ws.setSearchQuery(e.target.value)}
                    className="pl-8 text-xs h-9 bg-white dark:bg-slate-900"
                  />
                </div>

                {ws.suggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl max-h-48 overflow-y-auto text-xs divide-y divide-slate-100 dark:divide-slate-800">
                    {ws.suggestions.map((city) => (
                      <button
                        key={city.id}
                        onClick={() => ws.handleSelectSuggestion(city)}
                        className="w-full text-left p-2 hover:bg-indigo-50/50 dark:hover:bg-slate-900 flex justify-between items-center transition"
                      >
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-100">{city.name}</div>
                          <div className="text-[10px] text-slate-400">{city.admin1 || city.country}</div>
                        </div>
                        <span className="text-[10px] font-mono text-indigo-600">
                          {city.latitude.toFixed(2)}°, {city.longitude.toFixed(2)}°
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Coordinates Inputs */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500">Lintang (Lat)</label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={ws.latInput}
                    onChange={(e) => ws.setLatInput(e.target.value)}
                    className="text-xs h-8 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500">Bujur (Lng)</label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={ws.lngInput}
                    onChange={(e) => ws.setLngInput(e.target.value)}
                    className="text-xs h-8 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-1.5 pt-1">
                <Button
                  onClick={ws.handleApplyCoordinates}
                  size="sm"
                  className="h-8 text-xs px-3 bg-indigo-600 hover:bg-indigo-700 text-white flex-1"
                >
                  <Check className="h-3.5 w-3.5 mr-1" /> Terapkan Koordinat
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={ws.triggerGeolocation}
                  className="h-8 px-2 text-xs"
                  title="GPS"
                >
                  <Navigation2 className="h-3.5 w-3.5 text-indigo-600" />
                </Button>
                <Button
                  variant={ws.isCurrentFavorite ? "default" : "outline"}
                  size="sm"
                  onClick={ws.handleToggleFavorite}
                  className="h-8 px-2 text-xs"
                  title="Favorit"
                >
                  <Star className={`h-3.5 w-3.5 ${ws.isCurrentFavorite ? "fill-amber-400 text-amber-500" : "text-slate-400"}`} />
                </Button>
              </div>

              {/* Quick Preset Regions */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                  <Compass className="h-3 w-3 text-teal-500" /> Pilihan Cepat Kota Indonesia:
                </span>
                <div className="flex flex-wrap gap-1">
                  {INDONESIAN_CLIMATE_REGIONS.slice(0, 8).map((region) => {
                    const isSelected =
                      ws.locationMode === "region" &&
                      Math.abs(ws.customCoords.lat - region.lat) < 0.01 &&
                      Math.abs(ws.customCoords.lng - region.lng) < 0.01;
                    return (
                      <button
                        key={region.name}
                        onClick={() => ws.handleSelectPresetRegion(region)}
                        className={`text-[10px] px-2 py-0.5 rounded border transition ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-600 font-bold"
                            : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                        }`}
                      >
                        {region.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 3. Preset Selector */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-blue-500" />
              Rentang Waktu Observasi
            </label>
            <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
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
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <Button onClick={() => setOpen(false)} size="sm" className="w-full h-8 text-xs bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900">
            Selesai &amp; Tampilkan Data
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
