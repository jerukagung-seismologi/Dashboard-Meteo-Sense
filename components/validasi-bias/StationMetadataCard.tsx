// components/validasi-bias/StationMetadataCard.tsx
"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Radio, Compass, Clock, Layers, ShieldCheck } from "lucide-react";
import { SpatialGridCell } from "@/lib/bias-correction/matching/spatialMatch";

interface StationMetadataCardProps {
  stationName: string;
  stationId: string;
  latitude: number;
  longitude: number;
  elevationMeters?: number;
  spatialGrid: SpatialGridCell;
  sampleIntervalMinutes?: number;
  matchingMethod?: "nearest" | "bilinear";
  toleranceWindowMinutes?: number;
}

export const StationMetadataCard: React.FC<StationMetadataCardProps> = ({
  stationName,
  stationId,
  latitude,
  longitude,
  elevationMeters = 45,
  spatialGrid,
  sampleIntervalMinutes = 10,
  matchingMethod = "nearest",
  toleranceWindowMinutes = 30,
}) => {
  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/50 rounded-lg text-blue-600 dark:text-blue-400">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                {stationName}
              </CardTitle>
              <p className="text-xs text-slate-500 font-mono">ID: {stationId}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[11px]">
              <ShieldCheck className="w-3 h-3 mr-1" /> Ground Reference
            </Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 text-[11px]">
              ERA5-Land (0.1°)
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 block mb-0.5 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-500" /> Koordinat AWS
            </span>
            <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">
              {latitude.toFixed(4)}°, {longitude.toFixed(4)}°
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 block mb-0.5 flex items-center gap-1">
              <Compass className="w-3 h-3 text-slate-500" /> Grid ERA5
            </span>
            <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">
              {spatialGrid.gridLatitude.toFixed(2)}°, {spatialGrid.gridLongitude.toFixed(2)}°
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 block mb-0.5">Jarak Grid-Stasiun</span>
            <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">
              {spatialGrid.distanceKm} km
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 block mb-0.5">Elevasi Stasiun</span>
            <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">
              ~{elevationMeters} m dpl
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 block mb-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" /> Sampling / Jendela
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {sampleIntervalMinutes}m / ±{toleranceWindowMinutes}m
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 block mb-0.5 flex items-center gap-1">
              <Layers className="w-3 h-3 text-slate-500" /> Pencocokan Spasial
            </span>
            <span className="font-semibold capitalize text-slate-800 dark:text-slate-200">
              {matchingMethod === "nearest" ? "Nearest Grid" : "Bilinear"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
