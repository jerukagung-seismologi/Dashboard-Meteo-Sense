"use client";

import React from "react";
import { Thermometer, Droplets, ThermometerSun } from "lucide-react";
import { APP_CONFIG } from "@/lib/appConfig";
import {
  ForecastRow,
  getRowStyles,
  formatWeatherLine,
  formatValueWithError,
  getErikFlowersIcon,
  calculateHeatIndexCelsius,
} from "@/lib/forecast/nwpConsensusEngine";

interface ForecastPrintableCardProps {
  printRef: React.RefObject<HTMLDivElement | null>;
  currentLocationName: string;
  tomorrowStr: string;
  currentTimeStr: string;
  rows: ForecastRow[];
}

export function ForecastPrintableCard({
  printRef,
  currentLocationName,
  tomorrowStr,
  currentTimeStr,
  rows,
}: ForecastPrintableCardProps) {
  return (
    <div style={{ position: "fixed", left: "-9999px", top: 0, zIndex: -10 }}>
      <div ref={printRef} className="print-container" style={{ width: "800px", margin: "0 auto" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap');
          
          .print-container { 
            font-family: 'Poppins', sans-serif; 
            color: #0F172A; 
            padding: 20px; 
            box-sizing: border-box;
            background-color: white; 
            background: linear-gradient(160deg, #FFFFFF 0%, #F1F5F9 100%);
          }
          
          /* HEADER */
          .header-container { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
          .header-title { font-size: 32px; font-weight: 800; color: #1E3A8A; line-height: 1.1; letter-spacing: -0.5px; }
          .header-subtitle { font-size: 20px; font-weight: 600; color: #EA580C; margin-top: 4px; }
          .sub-label { font-size: 14px; color: #64748B; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-bottom: 2px; }
          
          /* ROW DESIGN */
          .weather-row {
            display: flex;
            border-radius: 12px;
            margin-bottom: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            position: relative;
            border-left-width: 8px; 
            border-left-style: solid;
            height: 132px; 
          }
          
          /* 1. JAM */ 
          .col-time-h {
            width: 14%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 26px;
            padding: 0;
            border-right: 1px solid rgba(0,0,0,0.05);
            color: #334155;
          }

          /* 2. ICON */ 
          .col-icon {
            width: 18%; 
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
          }

          /* 3. DESKRIPSI */ 
          .col-desc {
            width: 43%; 
            padding: 0 20px;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .desc-main { font-size: 28px; font-weight: 800; line-height: 1.1; margin-bottom: 0px; }
          .desc-sub { font-size: 18px; opacity: 0.85; font-weight: 500; margin-top: 2px; }

          /* 4. METRIK */ 
          .col-metrics {
            width: 25%;
            padding: 0 18px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: flex-start;
            gap: 8px;
            border-left: 1px solid rgba(0,0,0,0.05);
          }

          .metric-item {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 18px;
            font-weight: 700;
            color: #334155;
            width: 100%;
            line-height: 1;
          }

          .metric-icon-wrap {
            width: 42px;
            min-width: 42px;
            display: flex;
            justify-content: center;
            align-items: center;
            flex: 0 0 42px;
          }

          .metric-value {
            display: inline-flex;
            align-items: center;
            white-space: nowrap;
          }

          .footer {
            margin-top: 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12px;
            color: #64748B;
            border-top: 1px solid #E2E8F0;
            padding-top: 12px;
          }
        `}</style>

        {/* Title Section */}
        <div className="header-container">
          <div>
            <div className="sub-label">Meteo Sense Outlook</div>
            <div className="header-title">{currentLocationName || "Nama Kota"}</div>
            <div className="header-subtitle">{tomorrowStr}</div>
          </div>
          {/* Official Logo with crossOrigin per AGENTS.md rule 5 */}
          <div style={{ width: "80px", height: "80px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img
              src="/img/logo.webp"
              alt="Logo"
              crossOrigin="anonymous"
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
            />
          </div>
        </div>

        {/* Column Headers */}
        <div style={{ display: "flex", padding: "0 10px 8px 10px", fontWeight: "bold", color: "#1E3A8A", textTransform: "uppercase", fontSize: "14px", letterSpacing: "0.5px" }}>
          <div style={{ width: "14%", textAlign: "center" }}>WIB</div>
          <div style={{ width: "61%", paddingLeft: "15px" }}>Kemungkinan Cuaca</div>
          <div style={{ width: "25%", paddingLeft: "24px" }}>Parameter</div>
        </div>

        {/* Rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          {rows.map((row, i) => {
            const styles = getRowStyles(row.conditionMain || row.conditionSub || "", row.time);
            const mainLine = formatWeatherLine(row.probMain, row.conditionMain);
            const subLine = formatWeatherLine(row.probSub, row.conditionSub);

            const heatIndexDisplay =
              row.heatIndex !== ""
                ? row.heatIndex
                : row.temperature !== "" && row.humidity !== ""
                  ? calculateHeatIndexCelsius(row.temperature, row.humidity)
                  : "";

            const heatIndexValue =
              heatIndexDisplay === ""
                ? "-"
                : formatValueWithError(heatIndexDisplay, row.heatIndexError, "°C");

            return (
              <div
                key={i}
                className="weather-row"
                style={{
                  backgroundColor: styles.bg,
                  borderLeftColor: styles.accent,
                }}
              >
                <div className="col-time-h" style={{ color: styles.text }}>
                  {row.time}
                </div>

                <div className="col-icon">
                  {getErikFlowersIcon(row.conditionMain || row.conditionSub || "", row.time, 78, styles.accent)}
                </div>

                <div className="col-desc" style={{ color: styles.text }}>
                  <div className="desc-main">{mainLine}</div>
                  {row.probSub && row.conditionSub && row.conditionSub !== row.conditionMain && (
                    <div className="desc-sub">{subLine}</div>
                  )}
                </div>

                <div className="col-metrics" style={{ color: styles.text }}>
                  <div className="metric-item">
                    <span className="metric-icon-wrap">
                      <Thermometer size={30} color="#EF4444" />
                    </span>
                    <span className="metric-value">
                      {formatValueWithError(row.temperature, row.temperatureError, "°C")}
                    </span>
                  </div>

                  <div className="metric-item">
                    <span className="metric-icon-wrap">
                      <Droplets size={30} color="#3B82F6" />
                    </span>
                    <span className="metric-value">
                      {formatValueWithError(row.humidity, row.humidityError, "%")}
                    </span>
                  </div>

                  <div className="metric-item">
                    <span className="metric-icon-wrap">
                      <ThermometerSun size={30} color="#F97316" />
                    </span>
                    <span className="metric-value">{heatIndexValue}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="footer">
          <div style={{ display: "flex", gap: "20px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Thermometer size={18} color="#EF4444" /> Suhu
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Droplets size={18} color="#3B82F6" /> Kelembapan Relatif
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <ThermometerSun size={18} color="#F97316" /> Indeks Panas
            </span>
            <span style={{ fontStyle: "italic" }}>Prediksi Ini Bersifat Eksperimental</span>
          </div>
          <div>
            <span style={{ opacity: 0.7 }}>Powered by</span> <strong style={{ color: "#1E3A8A" }}>{APP_CONFIG.name} {APP_CONFIG.version}</strong>
          </div>
          <div>
            <span style={{ opacity: 0.7 }}>Waktu Kirim:</span> <strong style={{ color: "#1E3A8A" }}>{currentTimeStr}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
