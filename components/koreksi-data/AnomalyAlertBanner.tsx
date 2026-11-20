import React from "react";
import { AlertTriangle, Sun } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AnomalyFlag,
  WeatherVarMeta,
  CorrectionMethod,
  InterpolationSubMethod,
} from "./types";
import { useToast } from "@/hooks/use-toast";

export interface AnomalyAlertBannerProps {
  anomalies: AnomalyFlag[];
  selectedVar: WeatherVarMeta;
  setCorrectionMethod: (method: CorrectionMethod) => void;
  setOnlyAnomalies: (val: boolean) => void;
  setInterpolationSubMethod: (method: InterpolationSubMethod) => void;
  handleApplySolarOverheatingPreset: () => void;
}

export function AnomalyAlertBanner({
  anomalies,
  selectedVar,
  setCorrectionMethod,
  setOnlyAnomalies,
  setInterpolationSubMethod,
  handleApplySolarOverheatingPreset,
}: AnomalyAlertBannerProps) {
  const { toast } = useToast();

  if (anomalies.length === 0) return null;

  return (
    <Alert className="border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200">
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertTitle className="text-sm font-semibold flex items-center justify-between">
        <span>
          Terdeteksi {anomalies.length} Titik Anomali Meteorologi pada Parameter {selectedVar.label}
        </span>
        <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 text-[11px]">
          QC Flag Aktif
        </Badge>
      </AlertTitle>
      <AlertDescription className="text-xs mt-1.5">
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-amber-500/40 hover:bg-amber-500/20"
            onClick={() => {
              setCorrectionMethod("clamp");
              setOnlyAnomalies(true);
              toast({
                title: "Metode Clamping Dipilih",
                description: "Menjepit nilai anomali ke batas WMO.",
              });
            }}
          >
            Jepit Batas WMO
          </Button>
          {selectedVar.key === "temperature" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-amber-500/40 bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 font-semibold"
              onClick={handleApplySolarOverheatingPreset}
            >
              <Sun className="h-3.5 w-3.5 mr-1 text-amber-500" />
              Preset Radiasi Surya
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-amber-500/40 hover:bg-amber-500/20"
            onClick={() => {
              setCorrectionMethod("interpolate");
              setInterpolationSubMethod("cubic_pchip");
              setOnlyAnomalies(true);
              toast({
                title: "Interpolasi PCHIP Dipilih",
                description: "Titik anomali direkonstruksi mulus bebas overshoot.",
              });
            }}
          >
            Rekonstruksi PCHIP
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
