// components/climatology/ClimateRepresentativenessOverview.tsx
"use client";

import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Compass,
  CloudRain,
  ThermometerSun,
  Droplets,
  Sprout,
  ShieldCheck,
  Activity,
  Layers,
  Sparkles,
  MapPin,
  Calendar,
  Waves,
  Sun,
  AlertTriangle,
} from "lucide-react";
import {
  detectIndonesianClimateRegime,
  classifyBmkgRainCharacter,
  classifyBmkgDryDays,
  calculateTemperatureAnomaly,
  calculateDataCompleteness,
} from "@/lib/climatology/climateRepresentativeness";

interface ClimateRepresentativenessOverviewProps {
  coordinates: { lat: number; lng: number };
  stationName: string;
  preset: string;
  selectedMonth: number;
  selectedYear: number;
  selectedDasarian?: number;
  observedRainTotal?: number;
  normalRainTotal?: number;
  observedTempMean?: number;
  normalTempMean?: number;
  pointsCount?: number;
  consecutiveDryDays?: number;
  consecutiveWetDays?: number;
  waterDeficit?: number;
  soilMoistureRoot?: number;
  vpd?: number;
  era5Elevation?: number;
  locationMode?: "station" | "region";
}

export const ClimateRepresentativenessOverview: React.FC<ClimateRepresentativenessOverviewProps> = ({
  coordinates,
  stationName,
  preset,
  selectedMonth,
  selectedYear,
  selectedDasarian,
  observedRainTotal,
  normalRainTotal,
  observedTempMean,
  normalTempMean,
  pointsCount = 0,
  consecutiveDryDays = 0,
  consecutiveWetDays = 0,
  waterDeficit = 0,
  soilMoistureRoot = 0,
  vpd = 0,
  era5Elevation,
  locationMode = "station",
}) => {
  const isRegion = locationMode === "region";
  // 1. Deteksi Pola Iklim Wilayah
  const regimeInfo = useMemo(() => {
    return detectIndonesianClimateRegime(coordinates.lat, coordinates.lng, selectedMonth, era5Elevation);
  }, [coordinates.lat, coordinates.lng, selectedMonth, era5Elevation]);

  // 2. Sifat Hujan BMKG (AN / N / BN)
  const rainCharacter = useMemo(() => {
    return classifyBmkgRainCharacter(observedRainTotal, normalRainTotal);
  }, [observedRainTotal, normalRainTotal]);

  // 3. Anomali Suhu Udara (ΔT)
  const tempAnomaly = useMemo(() => {
    return calculateTemperatureAnomaly(observedTempMean, normalTempMean);
  }, [observedTempMean, normalTempMean]);

  // 4. Klasifikasi Hari Tanpa Hujan (HTH) BMKG
  const hthInfo = useMemo(() => {
    return classifyBmkgDryDays(consecutiveDryDays);
  }, [consecutiveDryDays]);

  // 5. Kelengkapan Data Observasi (WMO)
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  }, [selectedYear, selectedMonth]);

  const completeness = useMemo(() => {
    return calculateDataCompleteness(pointsCount, preset, daysInMonth);
  }, [pointsCount, preset, daysInMonth]);

  // Format label periode
  const periodLabel = useMemo(() => {
    const monthNames = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    const mName = monthNames[Math.max(0, Math.min(11, selectedMonth - 1))];
    if (preset === "dasarian") return `Dasarian ${selectedDasarian || 1} · ${mName} ${selectedYear}`;
    if (preset === "monthly") return `Bulan ${mName} ${selectedYear}`;
    if (preset === "yearly") return `Tahun ${selectedYear}`;
    return `${selectedYear}`;
  }, [preset, selectedDasarian, selectedMonth, selectedYear]);

  return (
    <div className="space-y-4">
      {/* Top Banner: Representative Synthesis Card */}
      <Card className="border-none shadow-md overflow-hidden bg-gradient-to-br from-slate-900 via-teal-950/90 to-slate-900 text-white relative">
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-16 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <CardContent className="p-5 sm:p-6 space-y-5 relative z-10">
          {/* Header Row: Title & Metadata */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-teal-800/40 pb-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={isRegion ? "bg-indigo-500/20 text-indigo-300 border-indigo-400/40 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 py-0.5 px-2.5" : "bg-teal-500/20 text-teal-300 border-teal-400/40 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 py-0.5 px-2.5"}>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {isRegion ? "Sintesis Iklim Regional Standar WMO & BMKG" : "Sintesis Keterwakilan Iklim Standar BMKG & WMO"}
                </Badge>
                <Badge variant="outline" className="text-[10px] font-semibold text-slate-300 border-slate-700 bg-slate-800/60">
                  {periodLabel}
                </Badge>
                <span className="text-[11px] text-teal-200/80 flex items-center gap-1 font-medium">
                  <MapPin className="h-3 w-3 text-teal-400" />
                  {isRegion ? "Wilayah: " : "Stasiun: "}{stationName} ({coordinates.lat.toFixed(3)}°, {coordinates.lng.toFixed(3)}°)
                  {era5Elevation != null && (
                    <span className="text-slate-400 text-[10px]">· Alt ~{era5Elevation} m dpl</span>
                  )}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2.5">
                <Compass className="h-5 w-5 text-teal-400" />
                {isRegion ? "Profil Klimatologi & Karakteristik Wilayah Regional" : "Profil Keterwakilan Iklim & Tolok Ukur Anomali"}
              </h2>
            </div>

            {/* Quality badge right side */}
            <div className="flex items-center gap-3 bg-slate-950/60 p-2.5 rounded-xl border border-teal-900/60 shrink-0">
              <div className="space-y-0.5 text-right">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  {isRegion ? "Basis Data Spasial" : "Validitas Data Stasiun"}
                </div>
                <div className="text-xs font-bold text-emerald-400 flex items-center justify-end gap-1.5">
                  <Sparkles className="h-3 w-3" />
                  {isRegion ? "ECMWF ERA5 & WMO" : `${completeness.qualityLevel} (${completeness.percentage}%)`}
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-bold text-xs border border-emerald-400/30">
                {isRegion ? "9km" : `${completeness.percentage}%`}
              </div>
            </div>
          </div>

          {/* 5 Representative Metric Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* 1. Tipe Rezim Pola Hujan Indonesia */}
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col justify-between space-y-2 hover:border-teal-500/50 transition">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Rezim Pola Iklim</span>
                <span className="p-1 rounded-md bg-teal-500/20 text-teal-300">
                  <Compass className="h-4 w-4" />
                </span>
              </div>
              <div>
                <span className="text-base font-black text-white">{regimeInfo.regime}</span>
                <div className="text-[10px] text-teal-300 font-semibold mt-0.5">{regimeInfo.currentSeasonPhase}</div>
              </div>
              <div className="text-[10px] text-slate-400 leading-tight border-t border-slate-700/50 pt-1.5">
                Puncak Hujan: <strong className="text-slate-200">{regimeInfo.peakRainfallMonths}</strong>
              </div>
              <div className="text-[10px] text-slate-400 leading-tight">
                Zona i-TMY: <strong className="text-slate-200">{regimeInfo.climateZone.code} — {regimeInfo.climateZone.title}</strong>{regimeInfo.climateZone.isIndicative ? " (estimasi)" : ""}
              </div>
            </div>

            {/* 2. Sifat Hujan BMKG (Station) atau Normal Curah Hujan Regional (Region) */}
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col justify-between space-y-2 hover:border-teal-500/50 transition">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {isRegion ? "Curah Hujan Normal WMO" : "Sifat Hujan BMKG"}
                </span>
                <span className="p-1 rounded-md bg-cyan-500/20 text-cyan-300">
                  <CloudRain className="h-4 w-4" />
                </span>
              </div>
              {isRegion ? (
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black font-mono text-white">
                      {normalRainTotal != null ? `${normalRainTotal.toFixed(1)}` : "-"}
                    </span>
                    <span className="text-xs font-semibold text-slate-300">mm / bln</span>
                  </div>
                  <div className="text-[10px] text-slate-300 mt-0.5">
                    Kategori: <strong className="text-cyan-300">
                      {normalRainTotal != null
                        ? normalRainTotal < 100
                          ? "Rendah (0–100 mm)"
                          : normalRainTotal <= 300
                          ? "Menengah (100–300 mm)"
                          : normalRainTotal <= 500
                          ? "Tinggi (300–500 mm)"
                          : "Sangat Tinggi (>500 mm)"
                        : "Standar WMO"}
                    </strong>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-black text-white">
                      {rainCharacter.category === "AN" ? "Atas Normal" : rainCharacter.category === "BN" ? "Bawah Normal" : rainCharacter.category === "N" ? "Normal" : "Tersedia"}
                    </span>
                    {rainCharacter.ratioPercent != null && (
                      <span className="text-xs font-mono font-bold text-cyan-300">({rainCharacter.ratioPercent}%)</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-300 mt-0.5">
                    Obs: <strong className="text-white">{observedRainTotal?.toFixed(1) ?? "-"} mm</strong> vs Norm: <strong className="text-slate-300">{normalRainTotal?.toFixed(1) ?? "-"} mm</strong>
                  </div>
                </div>
              )}
              <div className="text-[10px] leading-tight border-t border-slate-700/50 pt-1.5">
                <span className={isRegion ? "text-cyan-400 font-bold" : rainCharacter.category === "AN" ? "text-emerald-400 font-bold" : rainCharacter.category === "BN" ? "text-amber-400 font-bold" : "text-blue-400 font-bold"}>
                  {isRegion ? "Norma Standar 1991–2020" : rainCharacter.label}
                </span>
              </div>
            </div>

            {/* 3. Anomali Suhu Termal (Station) atau Normal Suhu WMO (Region) */}
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col justify-between space-y-2 hover:border-teal-500/50 transition">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {isRegion ? "Suhu Normal WMO" : "Anomali Suhu Termal"}
                </span>
                <span className="p-1 rounded-md bg-rose-500/20 text-rose-300">
                  <ThermometerSun className="h-4 w-4" />
                </span>
              </div>
              {isRegion ? (
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-black font-mono text-white">
                      {normalTempMean != null ? `${normalTempMean.toFixed(1)}°C` : "-"}
                    </span>
                    <span className="text-[10px] text-slate-400">Rerata Grid</span>
                  </div>
                  <div className="text-[10px] text-slate-300 mt-0.5">
                    Acuan: <strong className="text-white">WMO Standard 1991–2020</strong>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-black font-mono text-white">
                      {tempAnomaly.deltaT > 0 ? `+${tempAnomaly.deltaT}` : tempAnomaly.deltaT}°C
                    </span>
                    <span className="text-[10px] text-slate-400">vs Normal ERA5</span>
                  </div>
                  <div className="text-[10px] text-slate-300 mt-0.5">
                    Rerata: <strong className="text-white">{observedTempMean?.toFixed(1) ?? "-"}°C</strong> (Norm: {normalTempMean?.toFixed(1) ?? "-"}°C)
                  </div>
                </div>
              )}
              <div className="text-[10px] leading-tight border-t border-slate-700/50 pt-1.5">
                <span className={isRegion ? "text-emerald-400 font-bold" : tempAnomaly.deltaT > 0.5 ? "text-rose-400 font-bold" : tempAnomaly.deltaT < -0.5 ? "text-sky-400 font-bold" : "text-emerald-400 font-bold"}>
                  {isRegion ? "Normal Termal Regional 30-Thn" : `${tempAnomaly.status.split(" ")[0]} ${tempAnomaly.status.split(" ")[1]}`}
                </span>
              </div>
            </div>

            {/* 4. Hari Tanpa Hujan (HTH) */}
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col justify-between space-y-2 hover:border-teal-500/50 transition">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {isRegion ? "Estimasi HTH Wilayah" : "Indeks HTH BMKG"}
                </span>
                <span className="p-1 rounded-md bg-amber-500/20 text-amber-300">
                  <Sun className="h-4 w-4" />
                </span>
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black font-mono text-white">{hthInfo.days}</span>
                  <span className="text-xs font-semibold text-slate-300">Hari Tanpa Hujan</span>
                </div>
                <div className="text-[10px] text-slate-300 mt-0.5">
                  Hari Hujan Terpanjang: <strong className="text-cyan-300">{consecutiveWetDays} Hari</strong>
                </div>
              </div>
              <div className="text-[10px] leading-tight border-t border-slate-700/50 pt-1.5 flex items-center justify-between">
                <span className="font-bold text-amber-300">{hthInfo.category}</span>
                <Badge variant="outline" className={`text-[9px] px-1.5 py-0 border ${hthInfo.status === "Aman" ? "text-emerald-300 border-emerald-500" : hthInfo.status === "Waspada" ? "text-amber-300 border-amber-500" : "text-rose-300 border-rose-500"}`}>
                  {hthInfo.status}
                </Badge>
              </div>
            </div>

            {/* 5. Neraca Air Lahan & Transpirasi */}
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col justify-between space-y-2 hover:border-teal-500/50 transition">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Neraca Air & Lahan</span>
                <span className="p-1 rounded-md bg-emerald-500/20 text-emerald-300">
                  <Sprout className="h-4 w-4" />
                </span>
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className={`text-xl font-black font-mono ${waterDeficit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {waterDeficit >= 0 ? `+${waterDeficit.toFixed(1)}` : waterDeficit.toFixed(1)}
                  </span>
                  <span className="text-xs font-semibold text-slate-300">mm (P - ET0)</span>
                </div>
                <div className="text-[10px] text-slate-300 mt-0.5">
                  Kel. Akar: <strong className="text-emerald-300">{soilMoistureRoot.toFixed(1)}%</strong> · VPD: <strong className="text-amber-300">{vpd.toFixed(2)} kPa</strong>
                </div>
              </div>
              <div className="text-[10px] leading-tight border-t border-slate-700/50 pt-1.5">
                <span className={waterDeficit >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                  {waterDeficit >= 0 ? "💧 Surplus Air Perakaran" : "⚠️ Defisit Air Lahan"}
                </span>
              </div>
            </div>
          </div>

          {/* Narrative Summary Bar */}
          <div className="p-3 rounded-xl bg-slate-950/40 border border-teal-900/40 text-xs text-slate-300 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start gap-2">
              <Activity className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                {isRegion ? (
                  <>
                    <strong>Interpretasi Wilayah:</strong> Wilayah <strong>{stationName}</strong> berada dalam rezim iklim <strong>{regimeInfo.title}</strong> pada fase <em>{regimeInfo.currentSeasonPhase}</em> dengan proyeksi puncak hujan pada <strong>{regimeInfo.peakRainfallMonths}</strong>. Berdasarkan reanalisis grid WMO 1991–2020, normal curah hujan periode ini adalah <strong>{normalRainTotal?.toFixed(1) ?? "-"} mm</strong> dengan estimasi suhu rata-rata <strong>{normalTempMean?.toFixed(1) ?? "-"}°C</strong>. Neraca air klimatologis wilayah berstatus <strong>{waterDeficit >= 0 ? "Surplus Ketercukupan" : "Defisit Hidrologis"}</strong>.
                  </>
                ) : (
                  <>
                    <strong>Interpretasi Keterwakilan:</strong> Stasiun berada dalam <strong>{regimeInfo.title}</strong> pada <em>{regimeInfo.currentSeasonPhase}</em>. Sifat hujan periode terpilih adalah <strong>{rainCharacter.label}</strong> dengan deviasi suhu <strong>{tempAnomaly.deltaT > 0 ? `+${tempAnomaly.deltaT}` : tempAnomaly.deltaT}°C</strong> terhadap acuan normal klimatologis ERA5. Ketersediaan air tanah berada pada status <strong>{waterDeficit >= 0 ? "Surplus Ketercukupan" : "Defisit Hidrologis"}</strong>.
                  </>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
