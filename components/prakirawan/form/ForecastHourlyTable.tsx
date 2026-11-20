"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import {
  ForecastRow,
  WeatherCondition,
  weatherOptions,
  getHeatIndexDisplay,
  toNumberOrEmpty,
  calculateHeatIndexCelsius,
} from "@/lib/forecast/nwpConsensusEngine";

interface ForecastHourlyTableProps {
  rows: ForecastRow[];
  updateRow: (index: number, updates: Partial<ForecastRow>) => void;
  deleteRow: (index: number) => void;
  setRows: React.Dispatch<React.SetStateAction<ForecastRow[]>>;
}

const ProbabilitySelectItems = ({ currentVal }: { currentVal?: string }) => {
  const STANDARD_PROBS = ["0", "10", "20", "30", "40", "50", "60", "70", "80", "90", "100"];
  const hasCustom =
    currentVal &&
    currentVal !== "" &&
    currentVal !== "__empty__" &&
    !STANDARD_PROBS.includes(currentVal);

  return (
    <>
      <SelectItem value="__empty__">-</SelectItem>
      {STANDARD_PROBS.map((p) => (
        <SelectItem key={p} value={p}>
          {p}%
        </SelectItem>
      ))}
      {hasCustom && <SelectItem value={currentVal}>{currentVal}%</SelectItem>}
    </>
  );
};

export function ForecastHourlyTable({ rows, updateRow, deleteRow, setRows }: ForecastHourlyTableProps) {
  const updateTemperature = (index: number, value: string) => {
    const nextTemp = toNumberOrEmpty(value);
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== index) return r;
        const hi =
          nextTemp !== "" && r.humidity !== ""
            ? calculateHeatIndexCelsius(nextTemp, r.humidity)
            : "";
        return { ...r, temperature: nextTemp, heatIndex: hi };
      })
    );
  };

  const updateHumidity = (index: number, value: string) => {
    let nextHum = toNumberOrEmpty(value);
    if (typeof nextHum === "number") {
      nextHum = Math.min(100, Math.max(0, nextHum));
    }
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== index) return r;
        const hi =
          r.temperature !== "" && nextHum !== ""
            ? calculateHeatIndexCelsius(r.temperature, nextHum)
            : "";

        let adjustedHumError = r.humidityError;
        if (typeof nextHum === "number" && typeof adjustedHumError === "number") {
          // Diurnal saturation consistency (AGENTS.md): RH >= 90% error contracts to <= 5%
          if (nextHum >= 90 && adjustedHumError > 5) {
            adjustedHumError = 5;
          }
          // Absolute physical boundaries: ensure (RH ± error) remains strictly within [0%, 100%]
          const maxPossibleSpread = Math.min(100 - nextHum, nextHum);
          const minFloor = Math.min(2, maxPossibleSpread);
          adjustedHumError = Math.max(minFloor, Math.min(adjustedHumError, maxPossibleSpread));
        }

        return { ...r, humidity: nextHum, humidityError: adjustedHumError, heatIndex: hi };
      })
    );
  };

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table className="min-w-[850px]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[70px] text-center">Jam</TableHead>
            <TableHead className="w-[160px]">Kondisi Utama</TableHead>
            <TableHead className="w-[90px] text-center">Prob %</TableHead>
            <TableHead className="w-[160px]">Kondisi Tambahan</TableHead>
            <TableHead className="w-[90px] text-center">Prob %</TableHead>
            <TableHead className="w-[140px]">Suhu (°C)</TableHead>
            <TableHead className="w-[140px]">Kelembapan (%)</TableHead>
            <TableHead className="w-[140px]">Indeks Panas (°C)</TableHead>
            <TableHead className="w-[50px] text-center">Hapus</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, idx) => (
            <TableRow key={idx}>
              {/* JAM */}
              <TableCell className="text-center">
                <Input
                  value={row.time}
                  onChange={(e) => updateRow(idx, { time: e.target.value })}
                  className="h-8 text-center font-semibold"
                />
              </TableCell>

              {/* KONDISI UTAMA */}
              <TableCell>
                <Select
                  value={row.conditionMain || "__empty__"}
                  onValueChange={(value) =>
                    updateRow(idx, {
                      conditionMain: value === "__empty__" ? "" : (value as WeatherCondition),
                    })
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Pilih" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__empty__">
                      <div className="flex items-center gap-2">
                        <span className="min-w-[20px]" />
                        <span>-</span>
                      </div>
                    </SelectItem>
                    {weatherOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-3">
                          <span
                            style={{
                              width: 22,
                              display: "inline-flex",
                              justifyContent: "center",
                              alignItems: "center",
                            }}
                          >
                            <opt.Icon size={18} color={opt.color} />
                          </span>
                          <span className="text-sm">{opt.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>

              {/* PROB UTAMA */}
              <TableCell>
                <Select
                  value={row.probMain || "__empty__"}
                  onValueChange={(value) =>
                    updateRow(idx, { probMain: value === "__empty__" ? "" : value })
                  }
                >
                  <SelectTrigger className="h-8 text-center font-medium">
                    <SelectValue placeholder="-" />
                  </SelectTrigger>
                  <SelectContent>
                    <ProbabilitySelectItems currentVal={row.probMain} />
                  </SelectContent>
                </Select>
              </TableCell>

              {/* KONDISI TAMBAHAN */}
              <TableCell>
                <Select
                  value={row.conditionSub || "__empty__"}
                  onValueChange={(value) =>
                    updateRow(idx, {
                      conditionSub: value === "__empty__" ? "" : (value as WeatherCondition),
                    })
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Pilih" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__empty__">
                      <div className="flex items-center gap-2">
                        <span className="min-w-[20px]" />
                        <span>-</span>
                      </div>
                    </SelectItem>
                    {weatherOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-3">
                          <span
                            style={{
                              width: 22,
                              display: "inline-flex",
                              justifyContent: "center",
                              alignItems: "center",
                            }}
                          >
                            <opt.Icon size={18} color={opt.color} />
                          </span>
                          <span className="text-sm">{opt.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>

              {/* PROB TAMBAHAN */}
              <TableCell>
                <Select
                  value={row.probSub || "__empty__"}
                  onValueChange={(value) =>
                    updateRow(idx, { probSub: value === "__empty__" ? "" : value })
                  }
                >
                  <SelectTrigger className="h-8 text-center font-medium">
                    <SelectValue placeholder="-" />
                  </SelectTrigger>
                  <SelectContent>
                    <ProbabilitySelectItems currentVal={row.probSub} />
                  </SelectContent>
                </Select>
              </TableCell>

              {/* SUHU + ERROR */}
              <TableCell>
                <div className="flex flex-col gap-1">
                  <div className="flex gap-1 items-center">
                    <span className="text-xs text-muted-foreground min-w-fit">Nilai:</span>
                    <Input
                      type="number"
                      value={row.temperature}
                      onChange={(e) => updateTemperature(idx, e.target.value)}
                      className="h-7 text-sm flex-1"
                      placeholder="—"
                    />
                  </div>
                  <div className="flex gap-1 items-center">
                    <span className="text-xs text-muted-foreground min-w-fit">Error:</span>
                    <Input
                      type="number"
                      value={row.temperatureError}
                      onChange={(e) =>
                        updateRow(idx, { temperatureError: toNumberOrEmpty(e.target.value) })
                      }
                      className="h-7 text-sm flex-1"
                      placeholder="—"
                    />
                  </div>
                </div>
              </TableCell>

              {/* KELEMBAPAN + ERROR */}
              <TableCell>
                <div className="flex flex-col gap-1">
                  <div className="flex gap-1 items-center">
                    <span className="text-xs text-muted-foreground min-w-fit">Nilai:</span>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={row.humidity}
                      onChange={(e) => updateHumidity(idx, e.target.value)}
                      className="h-7 text-sm flex-1"
                      placeholder="—"
                    />
                  </div>
                  <div className="flex gap-1 items-center">
                    <span className="text-xs text-muted-foreground min-w-fit">Error:</span>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={row.humidityError}
                      onChange={(e) => {
                        const val = toNumberOrEmpty(e.target.value);
                        let safeVal = val;
                        if (typeof val === "number" && typeof row.humidity === "number") {
                          const maxSpread = Math.min(100 - row.humidity, row.humidity);
                          safeVal = Math.min(val, Math.max(2, maxSpread));
                        }
                        updateRow(idx, { humidityError: safeVal });
                      }}
                      className="h-7 text-sm flex-1"
                      placeholder="—"
                    />
                  </div>
                </div>
              </TableCell>

              {/* INDEKS PANAS + ERROR */}
              <TableCell>
                <div className="flex flex-col gap-1">
                  <div className="flex gap-1 items-center">
                    <span className="text-xs text-muted-foreground min-w-fit">Nilai:</span>
                    <Input
                      type="number"
                      value={getHeatIndexDisplay(row)}
                      readOnly
                      className="h-7 text-sm flex-1 bg-muted"
                      placeholder="—"
                    />
                  </div>
                  <div className="flex gap-1 items-center">
                    <span className="text-xs text-muted-foreground min-w-fit">Error:</span>
                    <Input
                      type="number"
                      value={row.heatIndexError}
                      onChange={(e) =>
                        updateRow(idx, { heatIndexError: toNumberOrEmpty(e.target.value) })
                      }
                      className="h-7 text-sm flex-1"
                      placeholder="—"
                    />
                  </div>
                </div>
              </TableCell>

              {/* HAPUS */}
              <TableCell className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteRow(idx)}
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
