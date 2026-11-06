// components/reanalysis/MonthlyAnalysis.tsx
import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Thermometer, Droplets, Gauge, CloudRain } from "lucide-react";
import ChartComponent from "@/components/ChartComponent";

interface MonthlyDataField {
  min: number[];
  mean: number[];
  max: number[];
}

interface MonthlyAnalysisProps {
  months: string[];
  temperature: MonthlyDataField;
  humidity: MonthlyDataField;
  pressure: MonthlyDataField;
  rain: number[];
  isDarkMode: boolean;
}

export const MonthlyAnalysis: React.FC<MonthlyAnalysisProps> = ({
  months,
  temperature,
  humidity,
  pressure,
  rain,
  isDarkMode,
}) => {
  const [activeTab, setActiveTab] = useState<"temperature" | "humidity" | "pressure" | "rain">("temperature");

  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.2)";

  const activeInfo = useMemo(() => {
    switch (activeTab) {
      case "temperature":
        return {
          title: "Suhu Udara Bulanan",
          desc: "Klimatologi suhu maksimum, rata-rata, dan minimum bulanan",
          unit: "Suhu (°C)",
          icon: <Thermometer className="h-5 w-5 text-orange-500" />,
          traces: [
            {
              x: months,
              y: temperature.max,
              name: "Maksimum",
              type: "scatter" as const,
              mode: "lines+markers" as const,
              line: { color: "#f87171", width: 2, dash: "dash" as const },
            },
            {
              x: months,
              y: temperature.mean,
              name: "Rata-rata",
              type: "scatter" as const,
              mode: "lines+markers" as const,
              line: { color: "#ef4444", width: 3 },
            },
            {
              x: months,
              y: temperature.min,
              name: "Minimum",
              type: "scatter" as const,
              mode: "lines+markers" as const,
              line: { color: "#60a5fa", width: 2, dash: "dash" as const },
            }
          ]
        };
      case "humidity":
        return {
          title: "Kelembaban Bulanan",
          desc: "Klimatologi kelembaban maksimum, rata-rata, dan minimum bulanan",
          unit: "Kelembaban (%)",
          icon: <Droplets className="h-5 w-5 text-blue-500" />,
          traces: [
            {
              x: months,
              y: humidity.max,
              name: "Maksimum",
              type: "scatter" as const,
              mode: "lines+markers" as const,
              line: { color: "#34d399", width: 2, dash: "dash" as const },
            },
            {
              x: months,
              y: humidity.mean,
              name: "Rata-rata",
              type: "scatter" as const,
              mode: "lines+markers" as const,
              line: { color: "#3b82f6", width: 3 },
            },
            {
              x: months,
              y: humidity.min,
              name: "Minimum",
              type: "scatter" as const,
              mode: "lines+markers" as const,
              line: { color: "#f59e0b", width: 2, dash: "dash" as const },
            }
          ]
        };
      case "pressure":
        return {
          title: "Tekanan MSL Bulanan",
          desc: "Klimatologi tekanan MSL maksimum, rata-rata, dan minimum bulanan",
          unit: "Tekanan MSL (hPa)",
          icon: <Gauge className="h-5 w-5 text-pink-500" />,
          traces: [
            {
              x: months,
              y: pressure.max,
              name: "Maksimum",
              type: "scatter" as const,
              mode: "lines+markers" as const,
              line: { color: "#f43f5e", width: 2, dash: "dash" as const },
            },
            {
              x: months,
              y: pressure.mean,
              name: "Rata-rata",
              type: "scatter" as const,
              mode: "lines+markers" as const,
              line: { color: "#ec4899", width: 3 },
            },
            {
              x: months,
              y: pressure.min,
              name: "Minimum",
              type: "scatter" as const,
              mode: "lines+markers" as const,
              line: { color: "#818cf8", width: 2, dash: "dash" as const },
            }
          ]
        };
      case "rain":
        return {
          title: "Akumulasi Curah Hujan Bulanan",
          desc: "Akumulasi curah hujan kumulatif bulanan (mm) hasil reanalisis",
          unit: "Curah Hujan (mm)",
          icon: <CloudRain className="h-5 w-5 text-purple-500" />,
          traces: [
            {
              x: months,
              y: rain,
              name: "Akumulasi Hujan",
              type: "bar" as const,
              marker: { color: "#8b5cf6" },
            }
          ]
        };
    }
  }, [activeTab, months, temperature, humidity, pressure, rain]);

  const layout = useMemo(() => ({
    autosize: true,
    height: 350,
    hovermode: "x unified" as const,
    margin: { l: 50, r: 20, t: 25, b: 50 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: textColor, family: "Inter, sans-serif" },
    xaxis: {
      type: "category" as const,
      gridcolor: gridColor,
      zerolinecolor: gridColor,
      tickcolor: textColor,
    },
    yaxis: {
      title: { text: activeInfo.unit },
      gridcolor: gridColor,
      zerolinecolor: gridColor,
      tickcolor: textColor,
      fixedrange: true,
    },
    legend: {
      orientation: "h" as const,
      yanchor: "bottom" as const,
      y: 1.05,
      xanchor: "right" as const,
      x: 1,
      font: { color: textColor }
    },
  }), [textColor, gridColor, activeInfo.unit]);

  return (
    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-4 gap-4">
        <div className="space-y-1">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-indigo-500" /> {activeInfo.title}
          </CardTitle>
          <CardDescription>{activeInfo.desc}</CardDescription>
        </div>

        {/* Tab Selection (Gaya Underline seperti Menu Meteorologi) */}
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as "temperature" | "humidity" | "pressure" | "rain")}
          className="self-start"
        >
          <div className="flex items-center border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
            <TabsList className="bg-transparent gap-1.5 sm:gap-2 h-auto p-0 border-none flex-nowrap justify-start -mb-px">
              <TabsTrigger
                value="temperature"
                className="px-3 py-1.5 rounded-t-lg rounded-b-none border border-transparent border-b-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 data-[state=active]:border-slate-200 dark:data-[state=active]:border-slate-800 data-[state=active]:border-b-orange-500 dark:data-[state=active]:border-b-orange-500 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400 data-[state=active]:font-bold data-[state=active]:shadow-xs transition-all cursor-pointer gap-1.5 flex items-center"
              >
                <Thermometer className="w-3.5 h-3.5" />
                Suhu
              </TabsTrigger>
              <TabsTrigger
                value="humidity"
                className="px-3 py-1.5 rounded-t-lg rounded-b-none border border-transparent border-b-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 data-[state=active]:border-slate-200 dark:data-[state=active]:border-slate-800 data-[state=active]:border-b-orange-500 dark:data-[state=active]:border-b-orange-500 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400 data-[state=active]:font-bold data-[state=active]:shadow-xs transition-all cursor-pointer gap-1.5 flex items-center"
              >
                <Droplets className="w-3.5 h-3.5" />
                Kelembaban
              </TabsTrigger>
              <TabsTrigger
                value="pressure"
                className="px-3 py-1.5 rounded-t-lg rounded-b-none border border-transparent border-b-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 data-[state=active]:border-slate-200 dark:data-[state=active]:border-slate-800 data-[state=active]:border-b-orange-500 dark:data-[state=active]:border-b-orange-500 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400 data-[state=active]:font-bold data-[state=active]:shadow-xs transition-all cursor-pointer gap-1.5 flex items-center"
              >
                <Gauge className="w-3.5 h-3.5" />
                Tekanan
              </TabsTrigger>
              <TabsTrigger
                value="rain"
                className="px-3 py-1.5 rounded-t-lg rounded-b-none border border-transparent border-b-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 data-[state=active]:border-slate-200 dark:data-[state=active]:border-slate-800 data-[state=active]:border-b-orange-500 dark:data-[state=active]:border-b-orange-500 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400 data-[state=active]:font-bold data-[state=active]:shadow-xs transition-all cursor-pointer gap-1.5 flex items-center"
              >
                <CloudRain className="w-3.5 h-3.5" />
                Curah Hujan
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
      </CardHeader>
      
      <CardContent className="p-2">
        {months.length > 0 && (
          <ChartComponent
            data={activeInfo.traces}
            layout={layout}
            style={{ width: "100%", height: "350px" }}
          />
        )}
      </CardContent>
    </Card>
  );
};
