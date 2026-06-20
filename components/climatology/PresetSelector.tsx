// components/climatology/PresetSelector.tsx
import React, { useMemo } from "react";
import { Calendar, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface PresetSelectorProps {
  preset: string;
  setPreset: (val: string) => void;
  selectedMonth: number;
  setSelectedMonth: (val: number) => void;
  selectedYear: number;
  setSelectedYear: (val: number) => void;
  isLoading: boolean;
  onRefresh: () => void;
}

const MONTHS = [
  { label: "Januari", value: 1 },
  { label: "Februari", value: 2 },
  { label: "Maret", value: 3 },
  { label: "April", value: 4 },
  { label: "Mei", value: 5 },
  { label: "Juni", value: 6 },
  { label: "Juli", value: 7 },
  { label: "Agustus", value: 8 },
  { label: "September", value: 9 },
  { label: "Oktober", value: 10 },
  { label: "November", value: 11 },
  { label: "Desember", value: 12 },
];

export const PresetSelector: React.FC<PresetSelectorProps> = ({
  preset,
  setPreset,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  isLoading,
  onRefresh,
}) => {
  const years = useMemo(() => {
    const current = new Date().getUTCFullYear();
    return Array.from({ length: 5 }, (_, i) => current - i);
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Preset Selectors */}
      <div className="flex flex-col gap-1 w-full sm:w-[160px]">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Periode</span>
        <Select value={preset} onValueChange={setPreset}>
          <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <SelectValue placeholder="Pilih Periode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Harian (UTC)</SelectItem>
            <SelectItem value="weekly">Mingguan (7 Hari)</SelectItem>
            <SelectItem value="monthly">Bulanan Kalender</SelectItem>
            <SelectItem value="yearly">Tahunan Kalender</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Month Selector (only for monthly preset) */}
      {preset === "monthly" && (
        <div className="flex flex-col gap-1 w-full sm:w-[150px]">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pilih Bulan</span>
          <Select
            value={String(selectedMonth)}
            onValueChange={(val) => setSelectedMonth(Number(val))}
          >
            <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <SelectValue placeholder="Pilih Bulan" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={String(m.value)}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Year Selector (for monthly and yearly presets) */}
      {(preset === "monthly" || preset === "yearly") && (
        <div className="flex flex-col gap-1 w-full sm:w-[130px]">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pilih Tahun</span>
          <Select
            value={String(selectedYear)}
            onValueChange={(val) => setSelectedYear(Number(val))}
          >
            <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <SelectValue placeholder="Pilih Tahun" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex items-end mt-auto">
        <Button
          variant="outline"
          onClick={onRefresh}
          disabled={isLoading}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 h-10 px-4"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2 text-indigo-500", isLoading && "animate-spin")} />
          Perbarui Data
        </Button>
      </div>
    </div>
  );
};
