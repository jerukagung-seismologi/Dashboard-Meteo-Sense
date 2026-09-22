"use client";

import React from "react";
import useSWR from "swr";
import { Activity, CloudRain, Compass, Gauge, Globe2, Waves } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { detectIndonesianClimateRegime } from "@/lib/climatology/climateRepresentativeness";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface SeasonalRepresentativenessReportProps {
  stats?: any;
  pointsCount: number;
  preset: string;
  periodLabel: string;
  latitude?: number | null;
  longitude?: number | null;
  compact?: boolean;
}

function signalClass(status?: string) {
  if (status === "Positif" || status === "El Niño" || status === "Active") {
    return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800";
  }
  if (status === "Negatif" || status === "La Niña" || status === "Enhanced") {
    return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800";
  }
  return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
}

function driverStatus(value: number, positiveLabel = "Positif", negativeLabel = "Negatif") {
  if (value >= 0.5) return positiveLabel;
  if (value <= -0.5) return negativeLabel;
  return "Netral";
}

export function SeasonalRepresentativenessReport({
  stats,
  pointsCount,
  preset,
  periodLabel,
  latitude,
  longitude,
  compact = false,
}: SeasonalRepresentativenessReportProps) {
  const hasCoordinates =
    Number.isFinite(latitude) && Number.isFinite(longitude);

  const coordinatesLabel = hasCoordinates
    ? `${latitude!.toFixed(2)}°, ${longitude!.toFixed(2)}°`
    : "Lokasi tidak tersedia";

  const { data: monsoon } = useSWR("/api/monsoon-indices", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });
  const { data: drivers } = useSWR("/api/climate-drivers/summary", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  const expectedPoints = preset === "dasarian" ? 10 : preset === "yearly" ? 12 : preset === "monthly" ? 30 : 7;
  const completeness = Math.min(100, Math.round((pointsCount / Math.max(1, expectedPoints)) * 100));
  const rainfall = Number(stats?.rainfall?.total ?? 0);
  const temperature = Number(stats?.temperature?.mean ?? 0);
  const rainDays = Number(stats?.rainfall?.rainDaysCount ?? 0);
  const safeLatitude = Number.isFinite(latitude) ? Number(latitude) : 0;
  const safeLongitude = Number.isFinite(longitude) ? Number(longitude) : 0;
  const climateProfile = detectIndonesianClimateRegime(safeLatitude, safeLongitude);

  const items = [
    {
      label: "AUSMI",
      value: monsoon?.current?.ausmi?.value,
      unit: "m/s",
      status: monsoon?.current?.ausmi?.status,
      icon: WindIcon,
      source: monsoon?.lastUpdated || "Open-Meteo",
    },
    {
      label: "WNPMI",
      value: monsoon?.current?.wnpmi?.value,
      unit: "m/s",
      status: monsoon?.current?.wnpmi?.status,
      icon: Waves,
      source: monsoon?.lastUpdated || "Open-Meteo",
    },
    {
      label: "ONI / ENSO",
      value: drivers?.enso?.oni,
      unit: "°C",
      status: drivers?.enso?.status || driverStatus(Number(drivers?.enso?.oni ?? 0), "El Niño", "La Niña"),
      icon: Globe2,
      source: drivers?.lastUpdated || "NOAA CPC",
    },
    {
      label: "DMI / IOD",
      value: drivers?.iod?.dmi,
      unit: "°C",
      status: drivers?.iod?.status,
      icon: Compass,
      source: drivers?.lastUpdated || "NOAA / BOM",
    },
    {
      label: "MJO",
      value: drivers?.mjo?.amplitude,
      unit: `Fase ${drivers?.mjo?.phase ?? "-"}`,
      status: drivers?.mjo?.status,
      icon: Activity,
      source: drivers?.lastUpdated || "BOM Australia",
    },
  ];

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
      <CardHeader className={compact ? "p-3 pb-2" : "p-4 pb-3"}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Representativitas Musim Tropis
            </CardTitle>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {periodLabel} · {coordinatesLabel} · Normal dan driver iklim sebagai konteks laporan
            </p>
          </div>
          <Badge
            variant="outline"
            className="text-[10px] text-slate-600 dark:text-slate-300"
          >
            Analisis Klimatologi
          </Badge>
        </div>
      </CardHeader>
      <CardContent className={compact ? "p-3 pt-0" : "p-4 pt-0"}>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 p-2.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{item.label}</span>
                  <Icon className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-base font-black font-mono text-slate-900 dark:text-slate-100">
                    {typeof item.value === "number" ? `${item.value >= 0 ? "+" : ""}${item.value.toFixed(2)}` : "-"}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">{item.unit}</span>
                </div>
                <Badge variant="outline" className={`mt-1 text-[9px] px-1.5 py-0 ${signalClass(item.status)}`}>
                  {item.status || "Memuat"}
                </Badge>
                <div className="mt-1 text-[9px] text-slate-400 truncate">{item.source}</div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300"><Gauge className="h-3.5 w-3.5 text-indigo-500" /> Suhu rerata: <strong>{temperature.toFixed(1)}°C</strong></div>
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300"><CloudRain className="h-3.5 w-3.5 text-sky-500" /> Hujan: <strong>{rainfall.toFixed(1)} mm</strong> · {rainDays} hari</div>
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300"><Activity className="h-3.5 w-3.5 text-emerald-500" /> Sintesis: <strong>{monsoon?.current?.seasonType || "Memuat musim"}</strong></div>
        </div>
        <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">
          Profil lokal: <strong className="text-slate-700 dark:text-slate-200">{climateProfile.regime}</strong> · Zona i-TMY <strong className="text-slate-700 dark:text-slate-200">{climateProfile.climateZone.code} {climateProfile.climateZone.title}</strong> (estimasi koordinat)
        </div>
      </CardContent>
    </Card>
  );
}

function WindIcon(props: React.SVGProps<SVGSVGElement>) {
  return <Waves {...props} />;
}
