import React from "react";
import {
  Database,
  SlidersHorizontal,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Device } from "@/lib/FetchingDevice";
import { setStoredActiveSensorId } from "@/lib/activeSensorStorage";
import {
  WeatherVarMeta,
  WEATHER_VARIABLES,
  formatWibFullDisplayDate,
  formatWibMediumDisplayDate,
} from "./types";

export interface CorrectionToolbarProps {
  devices: Device[];
  sensorId: string;
  setSensorId: (id: string) => void;
  setSelectedStationName: (name: string) => void;
  solarRefStationId: string;
  setSolarRefStationId: (id: string) => void;
  setRefStationRecords: (recs: any[]) => void;
  selectedVarKey: string;
  setSelectedVarKey: (key: string) => void;
  startDateStr: string;
  setStartDateStr: (val: string) => void;
  startTimeStr: string;
  setStartTimeStr: (val: string) => void;
  endDateStr: string;
  setEndDateStr: (val: string) => void;
  endTimeStr: string;
  setEndTimeStr: (val: string) => void;
  loading: boolean;
  handleFetchData: () => void;
  handlePrevDay: () => void;
  handleNextDay: () => void;
  handleToday: () => void;
  isNextDayDisabled: boolean;
  handleApplyPreset: (preset: "today" | "yesterday" | "last3days" | "last7days") => void;
}

export function CorrectionToolbar({
  devices,
  sensorId,
  setSensorId,
  setSelectedStationName,
  solarRefStationId,
  setSolarRefStationId,
  setRefStationRecords,
  selectedVarKey,
  setSelectedVarKey,
  startDateStr,
  setStartDateStr,
  startTimeStr,
  setStartTimeStr,
  endDateStr,
  setEndDateStr,
  endTimeStr,
  setEndTimeStr,
  loading,
  handleFetchData,
  handlePrevDay,
  handleNextDay,
  handleToday,
  isNextDayDisabled,
  handleApplyPreset,
}: CorrectionToolbarProps) {
  return (
    <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
      <CardContent className="p-4 sm:p-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Station Selector */}
          <div className="md:col-span-4 space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-indigo-500" /> Stasiun Sensor AWS
            </Label>
            <Select
              value={sensorId}
              onValueChange={(val) => {
                setSensorId(val);
                setRefStationRecords([]);
                if (solarRefStationId === val) {
                  const alt =
                    val === "id-05" && devices.some((d) => (d.authToken || d.id) === "id-03")
                      ? devices.find((d) => (d.authToken || d.id) === "id-03")
                      : devices.find((d) => (d.authToken || d.id) !== val);
                  setSolarRefStationId(alt ? ((alt.authToken || alt.id) as string) : "");
                }
                const matched = devices.find((d) => (d.authToken || d.id) === val);
                if (matched) {
                  setSelectedStationName(`${matched.name} (${matched.location})`);
                  setStoredActiveSensorId(val, { label: matched.name });
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih Stasiun Sensor" />
              </SelectTrigger>
              <SelectContent>
                {devices.map((device) => {
                  const devVal = (device.authToken || device.id) as string;
                  return (
                    <SelectItem key={device.id} value={devVal}>
                      {device.name} ({device.location})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Parameter Selector */}
          <div className="md:col-span-4 space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5 text-indigo-500" /> Parameter Cuaca Target
            </Label>
            <Select value={selectedVarKey} onValueChange={setSelectedVarKey}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih Parameter" />
              </SelectTrigger>
              <SelectContent>
                {WEATHER_VARIABLES.map((v) => {
                  const IconComp = v.icon;
                  return (
                    <SelectItem key={v.key} value={v.key}>
                      <div className="flex items-center gap-2">
                        <IconComp className="h-4 w-4 text-slate-500" />
                        <span>{v.label} ({v.unit})</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Quick Preset Buttons */}
          <div className="md:col-span-4 flex flex-col justify-end space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-indigo-500" /> Preset Rentang Cepat
            </Label>
            <div className="grid grid-cols-4 gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-9 px-2"
                onClick={() => handleApplyPreset("today")}
              >
                Hari Ini
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-9 px-2"
                onClick={() => handleApplyPreset("yesterday")}
              >
                Kemarin
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-9 px-2"
                onClick={() => handleApplyPreset("last3days")}
              >
                3 Hari
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-9 px-2"
                onClick={() => handleApplyPreset("last7days")}
              >
                7 Hari
              </Button>
            </div>
          </div>
        </div>

        {/* Stepper Bar */}
        <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0">
              <CalendarDays className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Periode Target Observasi Koreksi
                </span>
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 font-mono font-semibold text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/40">
                  {startDateStr === endDateStr ? "24 Jam Penuh" : "Rentang Multi-Hari"}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                  {startDateStr === endDateStr
                    ? formatWibFullDisplayDate(startDateStr)
                    : `${formatWibMediumDisplayDate(startDateStr)} – ${formatWibMediumDisplayDate(endDateStr)}`}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  ({startTimeStr} - {endTimeStr} WIB)
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 self-stretch sm:self-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevDay}
              disabled={loading}
              title="Geser Mundur 1 Hari (Hari Sebelumnya)"
              className="h-8 text-xs font-bold text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400 gap-1 shadow-2xs"
            >
              <ChevronLeft className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              Hari Sebelumnya
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleNextDay}
              disabled={loading || isNextDayDisabled}
              title="Geser Maju 1 Hari (Hari Sesudahnya)"
              className="h-8 text-xs font-bold text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400 gap-1 shadow-2xs disabled:opacity-40"
            >
              Hari Sesudahnya
              <ChevronRight className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleToday}
              disabled={loading}
              title="Lompat ke Hari Ini"
              className="h-8 text-xs font-bold text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 gap-1 shadow-2xs"
            >
              <RotateCcw className="h-3 w-3" />
              Hari Ini
            </Button>
          </div>
        </div>

        {/* Granular Date & Time Selection */}
        <div className="mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-[11px] text-slate-500">Tanggal Mulai (WIB)</Label>
            <Input
              type="date"
              value={startDateStr}
              onChange={(e) => setStartDateStr(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-slate-500">Jam Mulai</Label>
            <Input
              type="time"
              value={startTimeStr}
              onChange={(e) => setStartTimeStr(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-slate-500">Tanggal Selesai (WIB)</Label>
            <Input
              type="date"
              value={endDateStr}
              onChange={(e) => setEndDateStr(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-slate-500">Jam Selesai</Label>
            <Input
              type="time"
              value={endTimeStr}
              onChange={(e) => setEndTimeStr(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
          <div>
            <Button
              className="w-full h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              onClick={handleFetchData}
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Memuat...
                </>
              ) : (
                <>
                  <Database className="h-3.5 w-3.5 mr-1.5" /> Ambil Data Target
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
