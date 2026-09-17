"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calculator,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";
import { CorrectionMethod } from "@/lib/bias-correction/types";

interface ModelParameterInspectorProps {
  method: CorrectionMethod;
  parameters: any;
  variableUnit?: string;
  provenance?: {
    trainingSamplesCount?: number;
    validationSamplesCount?: number;
    splitRatio?: number;
    trainingPeriod?: { from: string; to: string };
  };
}

interface ParameterItem {
  label: string;
  symbol: string;
  value: string | number;
  description: string;
  unit?: string;
}

export const ModelParameterInspector: React.FC<ModelParameterInspectorProps> = ({
  method,
  parameters,
  variableUnit = "",
  provenance,
}) => {
  const [showRawJson, setShowRawJson] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(parameters || {}, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Determine formula and parameter breakdown based on method
  let formulaDisplay = "";
  let formulaDesc = "";
  const paramItems: ParameterItem[] = [];

  const safeNum = (val: any, decimals = 4): string => {
    if (typeof val === "number") {
      return Number.isFinite(val) ? val.toFixed(decimals) : "0.0000";
    }
    return "0.0000";
  };

  switch (method) {
    case "polynomial_regression":
      formulaDisplay = "y = a·x² + b·x + c";
      formulaDesc = "Regresi polinomial orde-2 untuk memodelkan kelengkungan respon non-linier sensor.";
      paramItems.push(
        {
          label: "Koefisien Kuadratik",
          symbol: "a",
          value: safeNum(parameters?.polyA),
          description: "Kelengkungan respons kurva (x²)",
        },
        {
          label: "Koefisien Linier",
          symbol: "b",
          value: safeNum(parameters?.polyB),
          description: "Kemiringan sensitivitas dasar (x)",
        },
        {
          label: "Konstanta Intercept",
          symbol: "c",
          value: safeNum(parameters?.polyC),
          description: "Offset pergeseran titik nol",
          unit: variableUnit,
        }
      );
      break;

    case "linear_regression":
      formulaDisplay = "y = m·x + c";
      formulaDesc = "Regresi linier Ordinary Least Squares (OLS) dengan penyesuaian skala dan pergeseran intercept.";
      paramItems.push(
        {
          label: "Slope / Skala",
          symbol: "m",
          value: safeNum(parameters?.scale),
          description: "Faktor pengali sensitivitas sensor",
        },
        {
          label: "Intercept",
          symbol: "c",
          value: safeNum(parameters?.offset),
          description: "Koreksi pergeseran titik nol",
          unit: variableUnit,
        }
      );
      break;

    case "robust_huber":
      formulaDisplay = "y = m·x + c (Huber Loss)";
      formulaDesc = "Regresi linier robust berbobot M-Estimator Huber yang tahan terhadap gangguan pencilan / outlier ekstrem.";
      paramItems.push(
        {
          label: "Slope Robust",
          symbol: "m",
          value: safeNum(parameters?.scale),
          description: "Skala pembobotan residual M-estimator",
        },
        {
          label: "Intercept Robust",
          symbol: "c",
          value: safeNum(parameters?.offset),
          description: "Offset titik nol dengan pembobotan robust",
          unit: variableUnit,
        }
      );
      if (parameters?.outliersTrimmed !== undefined) {
        paramItems.push({
          label: "Pencilan Teredam",
          symbol: "k",
          value: parameters.outliersTrimmed,
          description: "Jumlah observasi pencilan yang diboboti rendah",
        });
      }
      break;

    case "mean_bias":
      formulaDisplay = "y = x + Offset";
      formulaDesc = "Koreksi aditif seragam berdasarkan Mean Bias Error (MBE) antara AWS dan ERA5.";
      paramItems.push({
        label: "Nilai Offset (MBE)",
        symbol: "Δ",
        value: safeNum(parameters?.offset),
        description: "Nilai penambah/pengurang rata-rata bias",
        unit: variableUnit,
      });
      break;

    case "power_law":
      formulaDisplay = "y = a · x^b";
      formulaDesc = "Model penskalaan eksponensial hukum daya (power-law) untuk variabel non-linier seperti kecepatan angin.";
      paramItems.push(
        {
          label: "Koefisien Skala",
          symbol: "a",
          value: safeNum(parameters?.powerA),
          description: "Faktor pengali skala daya",
        },
        {
          label: "Eksponen Pangkat",
          symbol: "b",
          value: safeNum(parameters?.powerB),
          description: "Eksponen kurva daya non-linier",
        }
      );
      break;

    case "two_point":
      formulaDisplay = "y = P1_ref + ((x - P1_raw) / (P2_raw - P1_raw)) · (P2_ref - P1_ref)";
      formulaDesc = "Interpolasi linier 2 titik kalibrasi acuan (titik bawah P1 dan titik atas P2).";
      paramItems.push(
        {
          label: "Titik 1 (Mentah)",
          symbol: "P1_raw",
          value: safeNum(parameters?.point1Raw),
          description: "Batas bawah pembacaan sensor",
          unit: variableUnit,
        },
        {
          label: "Titik 1 (Acuan)",
          symbol: "P1_ref",
          value: safeNum(parameters?.point1Ref),
          description: "Batas bawah nilai standar referensi",
          unit: variableUnit,
        },
        {
          label: "Titik 2 (Mentah)",
          symbol: "P2_raw",
          value: safeNum(parameters?.point2Raw),
          description: "Batas atas pembacaan sensor",
          unit: variableUnit,
        },
        {
          label: "Titik 2 (Acuan)",
          symbol: "P2_ref",
          value: safeNum(parameters?.point2Ref),
          description: "Batas atas nilai standar referensi",
          unit: variableUnit,
        }
      );
      break;

    case "diurnal_mbe":
      formulaDisplay = "y(h) = x(h) + MBE(h), h ∈ [00..23]";
      formulaDesc = "Koreksi bias siklus diurnal 24 jam untuk mengatasi bias radiasi matahari dan inversi malam.";
      paramItems.push({
        label: "Resolusi Jam",
        symbol: "H",
        value: "24 Jam",
        description: "Profil bias spesifik per jam",
      });
      break;

    case "quantile_mapping":
    case "quantile_delta_mapping":
      formulaDisplay = "y = F_obs⁻¹(F_era5(x))";
      formulaDesc = "Penyesuaian fungsi distribusi kumulatif empiris (eCDF) 100 persentil standar klimatologi WMO/IPCC.";
      paramItems.push({
        label: "Resolusi Kuantil",
        symbol: "Q",
        value: "100 Persentil (1%)",
        description: "Binned Quantile Mapping resolution",
      });
      break;

    case "zero_aware_rain":
      formulaDisplay = "y = x ≥ 0.1 ? Scale · x : 0";
      formulaDesc = "Koreksi presipitasi dua tahap (probabilitas hari hujan + penskalaan intensitas basah).";
      paramItems.push(
        {
          label: "Ambang Basah",
          symbol: "P0",
          value: "0.1 mm/jam",
          description: "Batas deteksi presipitasi valid",
        },
        {
          label: "Faktor Koreksi Basah",
          symbol: "Scale",
          value: safeNum(parameters?.scale || parameters?.multiplier, 3),
          description: "Penskalaan intensitas curah hujan aktif",
        }
      );
      break;

    case "circular_wind":
      formulaDisplay = "θ_corr = (θ_raw + Δθ + 360°) mod 360°";
      formulaDesc = "Koreksi trigonometri sirkular untuk arah angin azimuth 0°-360° menghindari bias diskontinuitas kutub utara.";
      paramItems.push({
        label: "Offset Azimuth Sirkular",
        symbol: "Δθ",
        value: `${safeNum(parameters?.offset, 1)}°`,
        description: "Koreksi orientasi arah sensor kompas",
      });
      break;

    default:
      formulaDisplay = "Formula Standar Terapan";
      formulaDesc = "Parameter empiris hasil fitting dataset kalibrasi.";
      if (parameters) {
        Object.entries(parameters).forEach(([k, v]) => {
          if (typeof v === "number" || typeof v === "string") {
            paramItems.push({
              label: k,
              symbol: k.substring(0, 3),
              value: typeof v === "number" ? safeNum(v) : String(v),
              description: `Parameter ${k}`,
            });
          }
        });
      }
  }

  return (
    <div className="space-y-3">
      {/* Mathematical Formula Banner */}
      <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-slate-50/50 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-slate-900/40 border border-blue-100 dark:border-blue-900/60 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-2xs">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 dark:text-blue-400 block">
                Persamaan Matematis Model
              </span>
              <span className="font-mono text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                {formulaDisplay}
              </span>
            </div>
          </div>

          <Badge variant="outline" className="text-[10px] font-semibold bg-white/80 dark:bg-slate-900/80 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 self-start sm:self-auto">
            {paramItems.length} Parameter Aktif
          </Badge>
        </div>
        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2 font-medium">
          {formulaDesc}
        </p>
      </div>

      {/* Structured Parameter Cards */}
      {paramItems.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {paramItems.map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  {item.label}
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold">
                  {item.symbol}
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-mono text-base font-bold text-blue-600 dark:text-blue-400">
                  {item.value}
                </span>
                {item.unit && (
                  <span className="text-[10px] text-slate-400 font-medium">
                    {item.unit}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 line-clamp-1">
                {item.description}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Dataset Provenance Details */}
      {provenance && (
        <div className="flex flex-wrap items-center gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5 font-medium">
            <Cpu className="w-3.5 h-3.5 text-indigo-500" />
            <span>Sampel Training: <strong>{provenance.trainingSamplesCount ?? "-"} data</strong></span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">&bull;</span>
          <div className="flex items-center gap-1.5 font-medium">
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            <span>Sampel Validasi: <strong>{provenance.validationSamplesCount ?? "-"} data</strong></span>
          </div>
          {provenance.splitRatio !== undefined && (
            <>
              <span className="text-slate-300 dark:text-slate-700">&bull;</span>
              <span className="font-mono font-medium">
                Split Rasio: <strong>{provenance.splitRatio}% / {100 - provenance.splitRatio}%</strong>
              </span>
            </>
          )}
        </div>
      )}

      {/* Collapsible Raw JSON Payload Viewer */}
      <div className="border border-slate-200/80 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
        <div
          className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors"
          onClick={() => setShowRawJson(!showRawJson)}
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Raw JSON Fitting Payload</span>
            <span className="text-[10px] text-slate-400 font-normal">
              ({showRawJson ? "Klik untuk menutup" : "Klik untuk melihat detail format teknis"})
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {showRawJson && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-[11px] px-2 gap-1 text-slate-600 dark:text-slate-400"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyJson();
                }}
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                {copied ? "Tersalin" : "Salin JSON"}
              </Button>
            )}
            {showRawJson ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </div>

        {showRawJson && (
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
            <pre className="text-[11px] font-mono text-blue-700 dark:text-blue-400 overflow-x-auto p-2 bg-slate-50 dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-800">
              {JSON.stringify(parameters || {}, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
