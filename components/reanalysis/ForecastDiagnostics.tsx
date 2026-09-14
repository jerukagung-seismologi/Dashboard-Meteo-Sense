// components/reanalysis/ForecastDiagnostics.tsx
import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Sun, Zap, Compass, Info, AlertTriangle } from "lucide-react";
import dynamic from "next/dynamic";

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => (
    <div className="h-[350px] w-full flex items-center justify-center text-muted-foreground animate-pulse bg-slate-50 dark:bg-slate-900 rounded-lg border">
      Membuat grafik diagnostik...
    </div>
  ),
});

interface ForecastDiagnosticsProps {
  scatter: {
    pressureVsRainfall: [number, number][];
    tempVsHumidity: [number, number][];
  };
  radiation: {
    dailyTotal: number[];
    diurnalCycle: number[];
  };
  cape: {
    max: number;
    mean: number;
    series: number[];
  };
  diagnostics: {
    meanDewPointDepression: number;
    maxDewPointDepression: number;
    diurnalDewPointDepression: number[];
    meanBarometricTendency3h: number;
    maxBarometricTendency3h: number;
  };
  isDarkMode: boolean;
}

export const ForecastDiagnostics: React.FC<ForecastDiagnosticsProps> = ({
  scatter,
  radiation,
  cape,
  diagnostics,
  isDarkMode,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"scatter" | "radiation" | "diagnostics">("scatter");

  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.2)";

  // Scatter plot 1 layout (Temp vs Humidity)
  const scatterTempHumTraces = useMemo(() => {
    const x = scatter.tempVsHumidity.map(p => p[0]);
    const y = scatter.tempVsHumidity.map(p => p[1]);
    return [
      {
        x,
        y,
        mode: "markers" as const,
        type: "scatter" as const,
        name: "Rata-rata Harian",
        marker: {
          color: "#f87171",
          size: 6,
          opacity: 0.7,
          line: {
            color: isDarkMode ? "#ef4444" : "#dc2626",
            width: 0.5
          }
        }
      }
    ];
  }, [scatter.tempVsHumidity, isDarkMode]);

  // Scatter plot 2 layout (Pressure vs Rainfall)
  const scatterPressRainTraces = useMemo(() => {
    const x = scatter.pressureVsRainfall.map(p => p[0]);
    const y = scatter.pressureVsRainfall.map(p => p[1]);
    return [
      {
        x,
        y,
        mode: "markers" as const,
        type: "scatter" as const,
        name: "Rata-rata Harian",
        marker: {
          color: "#60a5fa",
          size: 6,
          opacity: 0.7,
          line: {
            color: isDarkMode ? "#3b82f6" : "#2563eb",
            width: 0.5
          }
        }
      }
    ];
  }, [scatter.pressureVsRainfall, isDarkMode]);

  // Diurnal Solar & Dew Point Depression charts layout
  const radiationTraces = useMemo(() => {
    return [
      {
        x: Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`),
        y: radiation.diurnalCycle,
        type: "scatter" as const,
        mode: "lines+markers" as const,
        name: "Radiasi Gelombang Pendek (W/m²)",
        line: { color: "#fbbf24", width: 3 },
        marker: { size: 6, color: "#f59e0b" }
      }
    ];
  }, [radiation.diurnalCycle]);

  const dewPointDepressionTraces = useMemo(() => {
    return [
      {
        x: Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`),
        y: diagnostics.diurnalDewPointDepression,
        type: "scatter" as const,
        mode: "lines+markers" as const,
        name: "Depresi Titik Embun (T - Td) (°C)",
        line: { color: "#06b6d4", width: 3 },
        marker: { size: 6, color: "#0891b2" }
      }
    ];
  }, [diagnostics.diurnalDewPointDepression]);

  // Plotly layouts
  const layoutScatter1 = useMemo(() => ({
    autosize: true,
    height: 300,
    margin: { l: 50, r: 20, t: 30, b: 40 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: textColor, family: "Inter, sans-serif", size: 10 },
    title: { text: "Korelasi Suhu vs Kelembaban Udara", font: { size: 12, bold: true } },
    xaxis: {
      title: { text: "Suhu Udara (°C)", font: { size: 10 } },
      gridcolor: gridColor,
      zerolinecolor: gridColor,
      tickcolor: textColor
    },
    yaxis: {
      title: { text: "Kelembaban Relatif (%)", font: { size: 10 } },
      gridcolor: gridColor,
      zerolinecolor: gridColor,
      tickcolor: textColor,
      fixedrange: true
    },
    showlegend: false
  }), [textColor, gridColor]);

  const layoutScatter2 = useMemo(() => ({
    autosize: true,
    height: 300,
    margin: { l: 50, r: 20, t: 30, b: 40 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: textColor, family: "Inter, sans-serif", size: 10 },
    title: { text: "Korelasi Tekanan MSL vs Curah Hujan", font: { size: 12, bold: true } },
    xaxis: {
      title: { text: "Tekanan MSL (hPa)", font: { size: 10 } },
      gridcolor: gridColor,
      zerolinecolor: gridColor,
      tickcolor: textColor
    },
    yaxis: {
      title: { text: "Curah Hujan (mm)", font: { size: 10 } },
      gridcolor: gridColor,
      zerolinecolor: gridColor,
      tickcolor: textColor,
      fixedrange: true
    },
    showlegend: false
  }), [textColor, gridColor]);

  const layoutRadiation = useMemo(() => ({
    autosize: true,
    height: 320,
    margin: { l: 50, r: 20, t: 20, b: 40 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: textColor, family: "Inter, sans-serif", size: 10 },
    xaxis: {
      gridcolor: gridColor,
      zerolinecolor: gridColor,
      tickcolor: textColor
    },
    yaxis: {
      title: { text: "Radiasi Gelombang Pendek (W/m²)", font: { size: 10 } },
      gridcolor: gridColor,
      zerolinecolor: gridColor,
      tickcolor: textColor,
      fixedrange: true
    },
    showlegend: false
  }), [textColor, gridColor]);

  const layoutDewPointDepression = useMemo(() => ({
    autosize: true,
    height: 320,
    margin: { l: 50, r: 20, t: 20, b: 40 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: textColor, family: "Inter, sans-serif", size: 10 },
    xaxis: {
      gridcolor: gridColor,
      zerolinecolor: gridColor,
      tickcolor: textColor
    },
    yaxis: {
      title: { text: "Selisih Suhu-Titik Embun (°C)", font: { size: 10 } },
      gridcolor: gridColor,
      zerolinecolor: gridColor,
      tickcolor: textColor,
      fixedrange: true
    },
    showlegend: false
  }), [textColor, gridColor]);

  return (
    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-4 gap-4">
        <div className="space-y-1">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-500" /> Diagnostik & Analisis Sinoptik
          </CardTitle>
          <CardDescription>
            Hubungan parameter atmosfer, ketidakstabilan konvektif (CAPE), radiasi solar, dan kestabilan tekanan
          </CardDescription>
        </div>

        {/* Sub-tab Selectors */}
        <div className="flex border rounded-lg p-1 bg-slate-50 dark:bg-slate-950 dark:border-slate-800 text-xs self-start md:self-center">
          <button
            onClick={() => setActiveSubTab("scatter")}
            className={`px-3 py-1.5 font-semibold rounded-md transition-all duration-200 ${
              activeSubTab === "scatter" ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Diagram Pencaran
          </button>
          <button
            onClick={() => setActiveSubTab("radiation")}
            className={`px-3 py-1.5 font-semibold rounded-md transition-all duration-200 ${
              activeSubTab === "radiation" ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Profil Diurnal Radiasi & Saturasi
          </button>
          <button
            onClick={() => setActiveSubTab("diagnostics")}
            className={`px-3 py-1.5 font-semibold rounded-md transition-all duration-200 ${
              activeSubTab === "diagnostics" ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Instabilitas & Tendensi Tekanan
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {/* Render Tab Content */}
        {activeSubTab === "scatter" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-50/50 dark:bg-slate-950/20 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
              <Plot
                data={scatterTempHumTraces}
                layout={layoutScatter1}
                config={{ responsive: true, displayModeBar: false }}
                style={{ width: "100%", height: "300px" }}
              />
              <div className="text-[10px] text-slate-400 p-2">
                *Diagram pencaran di atas menunjukkan hubungan terbalik antara suhu dan kelembaban udara (RH) harian. Korelasi negatif yang kuat adalah tipikal untuk iklim tropis.
              </div>
            </div>

            <div className="bg-slate-50/50 dark:bg-slate-950/20 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
              <Plot
                data={scatterPressRainTraces}
                layout={layoutScatter2}
                config={{ responsive: true, displayModeBar: false }}
                style={{ width: "100%", height: "300px" }}
              />
              <div className="text-[10px] text-slate-400 p-2">
                *Menggambarkan korelasi tekanan udara MSL terhadap curah hujan. Secara sinoptik, kejadian curah hujan lebat cenderung berkorelasi dengan area tekanan rendah (palung tekanan rendah).
              </div>
            </div>
          </div>
        )}

        {activeSubTab === "radiation" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Shortwave Solar radiation */}
            <div className="space-y-2 bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold flex items-center gap-2 text-amber-500">
                <Sun className="h-4 w-4" /> Radiasi Gelombang Pendek Diurnal
              </h3>
              <p className="text-xs text-slate-500">
                Profil rata-rata insolasi matahari harian yang sampai ke permukaan bumi (W/m²).
              </p>
              <Plot
                data={radiationTraces}
                layout={layoutRadiation}
                config={{ responsive: true, displayModeBar: false }}
                style={{ width: "100%", height: "320px" }}
              />
            </div>

            {/* Dew Point Depression */}
            <div className="space-y-2 bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold flex items-center gap-2 text-cyan-500">
                <Compass className="h-4 w-4" /> Depresi Titik Embun Diurnal (T - Td)
              </h3>
              <p className="text-xs text-slate-500">
                Menunjukkan kejenuhan parsel udara. Nilai yang mendekati 0°C menandakan kejenuhan penuh (potensi kondensasi/kabut/hujan tinggi).
              </p>
              <Plot
                data={dewPointDepressionTraces}
                layout={layoutDewPointDepression}
                config={{ responsive: true, displayModeBar: false }}
                style={{ width: "100%", height: "320px" }}
              />
            </div>
          </div>
        )}

        {activeSubTab === "diagnostics" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* CAPE Stability Indicators */}
            <div className="bg-gradient-to-br from-amber-50/40 to-yellow-50/10 dark:from-yellow-950/10 dark:to-slate-950/20 p-5 rounded-lg border border-yellow-100/50 dark:border-yellow-950/30 space-y-4">
              <h3 className="text-sm font-extrabold flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                <Zap className="h-5 w-5" /> Instabilitas Atmosfer (CAPE)
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Convective Available Potential Energy (CAPE) mengukur jumlah energi pengapungan (buoyancy energy) yang tersedia untuk memicu konveksi udara vertikal.
              </p>

              <div className="grid grid-cols-2 gap-4 border-t border-yellow-100 dark:border-yellow-900/40 pt-4">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">CAPE Rata-rata</span>
                  <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">
                    {cape.mean.toFixed(1)} J/kg
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">CAPE Maksimum</span>
                  <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                    {cape.max.toFixed(0)} J/kg
                  </p>
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-950/30 p-3 rounded text-[11px] text-yellow-800 dark:text-yellow-300 leading-relaxed flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Klasifikasi Instabilitas:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-[10px]">
                    <li>&lt; 1000 J/kg: Lemah (Weak)</li>
                    <li>1000 - 2500 J/kg: Sedang (Moderate)</li>
                    <li>&gt; 2500 J/kg: Kuat (Severe Potential)</li>
                  </ul>
                  <p className="mt-1 font-semibold">
                    Status: {cape.max > 2500 ? "Potensi Badai Petir Kuat" : cape.max > 1000 ? "Potensi Konveksi Sedang" : "Atmosfer Cenderung Stabil"}
                  </p>
                </div>
              </div>
            </div>

            {/* Dew Point Depression Analysis */}
            <div className="bg-slate-50/70 dark:bg-slate-950/40 p-5 rounded-lg border border-slate-100 dark:border-slate-800 space-y-4">
              <h3 className="text-sm font-extrabold flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
                <Compass className="h-5 w-5" /> Kejenuhan Udara (Dew Point Depression)
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Selisih antara temperatur udara (T) dan titik embun (Td). Semakin kecil selisihnya, semakin jenuh udara tersebut.
              </p>

              <div className="grid grid-cols-2 gap-4 border-t dark:border-slate-800 pt-4">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Depresi Rata-rata</span>
                  <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">
                    {diagnostics.meanDewPointDepression.toFixed(2)}°C
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Depresi Maksimum</span>
                  <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">
                    {diagnostics.maxDewPointDepression.toFixed(1)}°C
                  </p>
                </div>
              </div>

              <div className="bg-cyan-50/50 dark:bg-cyan-950/20 p-3 rounded text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                <div className="flex gap-2">
                  <Info className="h-4 w-4 shrink-0 text-cyan-500 mt-0.5" />
                  <div>
                    Rata-rata selisih suhu-titik embun sebesar <strong>{diagnostics.meanDewPointDepression.toFixed(1)}°C</strong> menunjukkan kelembaban atmosfer rata-rata. Selisih &lt; 2°C pada profil harian adalah indikator kuat terbentuknya awan konvektif atau kabut basah di permukaan bumi.
                  </div>
                </div>
              </div>
            </div>

            {/* Barometric Tendency Indicator */}
            <div className="bg-slate-50/70 dark:bg-slate-950/40 p-5 rounded-lg border border-slate-100 dark:border-slate-800 space-y-4">
              <h3 className="text-sm font-extrabold flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <Activity className="h-5 w-5" /> Pasang Surut & Tendensi Barometrik
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Mengukur perubahan absolut tekanan udara dalam rentang 3 jam ($\Delta P / \Delta t$). Fluktuasi yang drastis dikaitkan dengan kedatangan sistem cuaca frontal.
              </p>

              <div className="grid grid-cols-2 gap-4 border-t dark:border-slate-800 pt-4">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Tendensi 3 Jam Rerata</span>
                  <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">
                    {diagnostics.meanBarometricTendency3h.toFixed(2)} hPa
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Tendensi 3 Jam Maks</span>
                  <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">
                    {diagnostics.maxBarometricTendency3h.toFixed(1)} hPa
                  </p>
                </div>
              </div>

              <div className="bg-slate-100 dark:bg-slate-950 p-3 rounded text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Pasang surut atmosfer normal di kawasan khatulistiwa berkisar antara 1 - 2.5 hPa dalam siklus diurnal (semidiurnal tide). Tendensi &gt; 3 hPa per 3 jam merupakan indikasi adanya gangguan badai tropis atau perubahan pola angin regional yang signifikan.
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
