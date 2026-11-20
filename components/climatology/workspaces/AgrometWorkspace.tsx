// components/climatology/workspaces/AgrometWorkspace.tsx
"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { ClimatologyWorkspaceHook } from "@/hooks/climatology/useClimatologyWorkspace";

const AgrometTab = dynamic(
  () => import("@/components/klimatologi/tabs/AgrometTab").then((m) => m.AgrometTab),
  { ssr: false, loading: () => <Skeleton className="w-full h-96 rounded-xl" /> }
);

interface AgrometWorkspaceProps {
  ws: ClimatologyWorkspaceHook;
}

export default function AgrometWorkspace({ ws }: AgrometWorkspaceProps) {
  const {
    activeLocation,
    activeCoords,
    isAgrometLoading,
    agrometData,
    agrometError,
    handleRefreshAgromet,
    isDarkMode,
    soilMoistureSurface,
    soilTempSurface,
    soilMoistureRoot,
    soilTempRoot,
    isHeatStress,
    isDroughtRisk,
    isDiseaseRisk,
    isVpdStress,
    agroHourlyData,
    agroDailyData,
    temp,
    tempMin,
    tempMax,
    apparentTemp,
    dewPoint,
    dewPointDepression,
    dewPointCondition,
    surfacePressure,
    rh,
    vpd,
    rainToday,
    rain7d,
    et0Today,
    waterDeficit,
    solarCurrent,
    solarDaily,
    windSpeed,
    windDir,
    getCardinalDirection,
    cloudCover,
    uvIndex,
  } = ws;

  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.2)";

  const soilMoistureOption = useMemo(
    () => ({
      backgroundColor: "transparent",
      tooltip: { trigger: "axis" },
      legend: { data: ["Permukaan (0-1cm)", "Zona Akar (9-27cm)"], textStyle: { color: textColor } },
      grid: { left: "4%", right: "4%", bottom: "10%", containLabel: true },
      xAxis: {
        type: "category",
        data: agroHourlyData.time?.slice(0, 24).map((t: string) => t.substring(11, 16)),
        axisLabel: { color: textColor },
      },
      yAxis: {
        type: "value",
        name: "%",
        scale: true,
        axisLabel: { color: textColor },
        splitLine: { lineStyle: { color: gridColor } },
      },
      series: [
        {
          name: "Permukaan (0-1cm)",
          type: "line",
          data: agroHourlyData.soil_moisture_0_to_1cm?.slice(0, 24).map((v: number) => Number((v * 100).toFixed(1))),
          itemStyle: { color: "#8b5cf6" },
          smooth: true,
        },
        {
          name: "Zona Akar (9-27cm)",
          type: "line",
          data: agroHourlyData.soil_moisture_9_to_27cm?.slice(0, 24).map((v: number) => Number((v * 100).toFixed(1))),
          itemStyle: { color: "#10b981" },
          smooth: true,
        },
      ],
    }),
    [agroHourlyData, textColor, gridColor]
  );

  const solarOption = useMemo(
    () => ({
      backgroundColor: "transparent",
      tooltip: { trigger: "axis" },
      grid: { left: "4%", right: "4%", bottom: "10%", containLabel: true },
      xAxis: {
        type: "category",
        data: agroHourlyData.time?.slice(0, 24).map((t: string) => t.substring(11, 16)),
        axisLabel: { color: textColor },
      },
      yAxis: {
        type: "value",
        name: "W/m²",
        scale: true,
        axisLabel: { color: textColor },
        splitLine: { lineStyle: { color: gridColor } },
      },
      series: [
        {
          name: "Radiasi Surya",
          type: "line",
          areaStyle: { opacity: 0.3 },
          data: agroHourlyData.shortwave_radiation?.slice(0, 24),
          itemStyle: { color: "#fcd34d" },
          smooth: true,
        },
      ],
    }),
    [agroHourlyData, textColor, gridColor]
  );

  return (
    <div className="space-y-6">
      <AgrometTab
        activeLocation={activeLocation}
        activeCoords={activeCoords}
        isAgrometLoading={isAgrometLoading}
        agrometData={agrometData}
        agrometError={agrometError}
        handleRefreshAgromet={handleRefreshAgromet}
        isDarkMode={isDarkMode}
        soilMoistureSurface={soilMoistureSurface}
        soilTempSurface={soilTempSurface}
        soilMoistureRoot={soilMoistureRoot}
        soilTempRoot={soilTempRoot}
        isHeatStress={isHeatStress}
        isDroughtRisk={isDroughtRisk}
        isDiseaseRisk={isDiseaseRisk}
        isVpdStress={isVpdStress}
        agroHourlyData={agroHourlyData}
        agroDailyData={agroDailyData}
        soilMoistureOption={soilMoistureOption}
        solarOption={solarOption}
        temp={temp}
        tempMin={tempMin}
        tempMax={tempMax}
        apparentTemp={apparentTemp}
        dewPoint={dewPoint}
        dewPointDepression={dewPointDepression}
        dewPointCondition={dewPointCondition}
        surfacePressure={surfacePressure}
        rh={rh}
        vpd={vpd}
        rainToday={rainToday}
        rain7d={rain7d}
        et0Today={et0Today}
        waterDeficit={waterDeficit}
        solarCurrent={solarCurrent}
        solarDaily={solarDaily}
        windSpeed={windSpeed}
        windDir={windDir}
        getCardinalDirection={getCardinalDirection}
        cloudCover={cloudCover}
        uvIndex={uvIndex}
      />
    </div>
  );
}
