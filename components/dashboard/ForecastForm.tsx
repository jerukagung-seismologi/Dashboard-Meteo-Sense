"use client"

import React from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { 
  Plus, 
  Trash2, 
  Save, 
  Download, 
  Thermometer, 
  Droplets,
  Wind,
  // Icon Lucide untuk UI Select
  Sun,
  Cloud,
  CloudSun,
  CloudFog,
  CloudRain,
  CloudLightning,
  CloudDrizzle,
  Wind as WindIcon
} from "lucide-react"

import html2canvas from "html2canvas"

// --- IMPORT LIBRARY IKON BASMILIUS LINE ---
import { getBasmiliusLineIcon } from "@/components/icons/BasmiliusIcons"

// --- TIPE DATA ---

export type WeatherCondition =
  | "Cerah"
  | "Cerah Berawan"
  | "Berawan"
  | "Hujan Ringan"
  | "Hujan Sedang"
  | "Hujan Lebat"
  | "Badai Petir"
  | "Kabut"
  | "Angin Kencang"

export type ForecastRow = {
  time: string
  condition: WeatherCondition | ""
  prediction: string
  temperature?: number | ""
  humidity?: number | ""
}

const initialTimes = ["07:00", "10:00", "13:00", "16:00", "19:00"]

// --- HELPER FUNCTIONS (COLOR PALETTE) ---

const getRowStyles = (condition: string, time: string) => {
  const hour = parseInt(time.split(":")[0]) || 0
  const isNight = hour >= 18 || hour < 6

  let styles = { 
    iconBg: "#E2E8F0", descBg: "#F8FAFC", border: "#94A3B8", text: "#1E293B", iconColor: "#475569" 
  }

  switch (condition) {
    case "Cerah":
    case "Cerah Berawan":
      if (isNight) {
        styles = { iconBg: "#C7D2FE", descBg: "#EEF2FF", border: "#6366F1", text: "#1E1B4B", iconColor: "#4338CA" }
      } else {
        styles = { iconBg: "#FDE68A", descBg: "#FFFBEB", border: "#F59E0B", text: "#451A03", iconColor: "#B45309" }
      }
      break;
    case "Berawan":
    case "Kabut":
      styles = { iconBg: "#CBD5E1", descBg: "#F1F5F9", border: "#64748B", text: "#0F172A", iconColor: "#334155" }
      break;
    case "Hujan Ringan":
    case "Hujan Sedang":
      styles = { iconBg: "#BFDBFE", descBg: "#EFF6FF", border: "#2563EB", text: "#172554", iconColor: "#1D4ED8" }
      break;
    case "Hujan Lebat":
    case "Badai Petir":
    case "Angin Kencang":
      styles = { iconBg: "#DDD6FE", descBg: "#F5F3FF", border: "#7C3AED", text: "#2E1065", iconColor: "#6D28D9" }
      break;
    default:
      if (isNight) styles = { iconBg: "#D8B4FE", descBg: "#FAF5FF", border: "#9333EA", text: "#3B0764", iconColor: "#7E22CE" }
      else styles = { iconBg: "#FDE047", descBg: "#FEFCE8", border: "#EAB308", text: "#422006", iconColor: "#A16207" }
      break;
  }
  return styles
}

// --- KOMPONEN UTAMA ---

export default function ForecastForm() {
  const { toast } = useToast()

  const [rows, setRows] = React.useState<ForecastRow[]>(
    initialTimes.map((t) => ({ 
      time: t, 
      condition: "", 
      prediction: "", 
      temperature: "", 
      humidity: "" 
    }))
  )
  const [location, setLocation] = React.useState<string>("")
  
  const printRef = React.useRef<HTMLDivElement>(null)
  
  const tomorrowStr = React.useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toLocaleDateString("id-ID", {
      weekday: "long", 
      day: "numeric", 
      month: "long", 
      year: "numeric"
    })
  }, [])

  const updateRow = (index: number, patch: Partial<ForecastRow>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  const addRow = () => {
    setRows((prev) => [...prev, { time: "", condition: "", prediction: "", temperature: "", humidity: "" }])
  }

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  const onSaveDebug = () => {
    console.log("Data:", rows)
    toast({ title: "Debug", description: "Cek console untuk data JSON." })
  }

  const onSaveAsImage = async () => {
    if (!printRef.current) return;

    try {
      toast({ title: "Memproses Gambar...", description: "Mohon tunggu..." })
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(printRef.current, {
        scale: 2, 
        backgroundColor: "#ffffff",
        logging: false,
        width: 800, 
        windowWidth: 1200 
      });

      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      const fileName = `Outlook_${location || "Kota"}_${new Date().toISOString().split('T')[0]}.png`;
      
      link.href = image;
      link.download = fileName;
      link.click();

      toast({ title: "Berhasil!", description: "Gambar tersimpan." });

    } catch (error) {
      console.error("Error generating image:", error);
      toast({ title: "Gagal", description: "Terjadi kesalahan.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* --- HEADER UI INPUT --- */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-4">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Input Prakiraan Cuaca</h2>
          <p className="text-muted-foreground">Isi data di bawah untuk menghasilkan tabel outlook grafis.</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="font-semibold">Lokasi:</span>
            <Input 
              value={location} 
              onChange={(e) => setLocation(e.target.value)} 
              placeholder="Contoh: Kota Bandung" 
              className="w-[250px]"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addRow}><Plus className="w-4 h-4 mr-1"/> Tambah Jam</Button>
          <Button variant="default" size="sm" onClick={onSaveDebug}><Save className="w-4 h-4 mr-1"/> Debug Data</Button>
          <Button variant="secondary" size="sm" onClick={onSaveAsImage}>
            <Download className="w-4 h-4 mr-1"/> Simpan Gambar
          </Button>
        </div>
      </div>

      {/* --- FORM INPUT TABEL --- */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Jam</TableHead>
              <TableHead className="w-[200px]">Kondisi</TableHead>
              <TableHead>Deskripsi (Prediksi)</TableHead>
              <TableHead className="w-[100px]">Suhu</TableHead>
              <TableHead className="w-[100px]">RH (%)</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, idx) => (
              <TableRow key={idx}>
                <TableCell>
                  <Input value={row.time} onChange={(e) => updateRow(idx, { time: e.target.value })} className="h-9"/>
                </TableCell>
                <TableCell>
                  <Select value={row.condition} onValueChange={(v) => updateRow(idx, { condition: v as WeatherCondition })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Pilih..." /></SelectTrigger>
                    
                    <SelectContent>
                      <SelectItem value="Cerah"><span className="flex items-center gap-2"><Sun size={14} className="text-orange-500"/> Cerah</span></SelectItem>
                      <SelectItem value="Cerah Berawan"><span className="flex items-center gap-2"><CloudSun size={14} className="text-orange-400"/> Cerah Berawan</span></SelectItem>
                      <SelectItem value="Berawan"><span className="flex items-center gap-2"><Cloud size={14} className="text-gray-500"/> Berawan</span></SelectItem>
                      <SelectItem value="Kabut"><span className="flex items-center gap-2"><CloudFog size={14} className="text-slate-400"/> Kabut</span></SelectItem>
                      <SelectItem value="Hujan Ringan"><span className="flex items-center gap-2"><CloudDrizzle size={14} className="text-blue-400"/> Hujan Ringan</span></SelectItem>
                      <SelectItem value="Hujan Sedang"><span className="flex items-center gap-2"><CloudRain size={14} className="text-blue-500"/> Hujan Sedang</span></SelectItem>
                      <SelectItem value="Hujan Lebat"><span className="flex items-center gap-2"><CloudLightning size={14} className="text-indigo-600"/> Hujan Lebat</span></SelectItem>
                      <SelectItem value="Badai Petir"><span className="flex items-center gap-2"><CloudLightning size={14} className="text-purple-600"/> Badai Petir</span></SelectItem>
                      <SelectItem value="Angin Kencang"><span className="flex items-center gap-2"><WindIcon size={14} className="text-teal-600"/> Angin Kencang</span></SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell><Textarea value={row.prediction} onChange={(e) => updateRow(idx, { prediction: e.target.value })} placeholder="..." className="min-h-[40px] h-9 py-1 text-sm resize-none"/></TableCell>
                <TableCell><Input type="number" value={row.temperature || ""} onChange={(e) => updateRow(idx, { temperature: e.target.value })} className="h-9" /></TableCell>
                <TableCell><Input type="number" value={row.humidity || ""} onChange={(e) => updateRow(idx, { humidity: e.target.value })} className="h-9" /></TableCell>
                <TableCell><Button variant="ghost" size="icon" onClick={() => removeRow(idx)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* --- HIDDEN AREA UNTUK GENERATE GAMBAR --- */}
      <div 
        style={{ 
          position: "fixed", 
          left: "-9999px", 
          top: 0,
          zIndex: -10 
        }}
      >
        <div ref={printRef} className="print-container" style={{ width: "800px", margin: "0 auto" }}>
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap');
            
            .print-container { 
              font-family: 'Poppins', sans-serif; 
              color: #1F2937;
              padding: 40px; 
              box-sizing: border-box;
              background-color: white; 
              background: linear-gradient(160deg, #ffffff 0%, #f1f5f9 100%);
            }
            
            .header-title { font-size: 36px; font-weight: 800; color: #1e3a8a; line-height: 1.1; margin-bottom: 5px; letter-spacing: -0.5px; }
            .header-subtitle { font-size: 22px; font-weight: 600; color: #ea580c; margin-bottom: 35px; }
            
            .weather-row {
              display: flex;
              border-radius: 16px;
              margin-bottom: 14px;
              overflow: hidden;
              box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.08);
              position: relative;
              border: 2px solid;
            }
            
            .col-time-h {
              width: 12%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 800;
              font-size: 18px;
              padding: 15px;
              background-color: rgba(255,255,255,0.7);
              border-right: 1px solid rgba(0,0,0,0.05);
            }

            .col-icon {
              width: 15%; 
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 10px;
            }

            .col-desc {
              width: 48%; 
              padding: 15px 25px;
              display: flex;
              flex-direction: column;
              justify-content: center;
            }

            .col-metrics {
              width: 25%;
              padding: 10px 20px; 
              display: flex;
              flex-direction: column;
              justify-content: center;
              gap: 12px; 
              background-color: rgba(255,255,255,0.6); 
              border-left: 1px solid rgba(0,0,0,0.05);
            }

            .metric-item {
              display: flex;
              align-items: center;
              gap: 12px;
              font-size: 20px;
              font-weight: 700;
            }
            
            .footer {
              margin-top: 50px;
              padding-top: 15px;
              border-top: 2px solid #e5e7eb;
              font-size: 13px;
              color: #6b7280;
              display: flex;
              justify-content: space-between;
              font-weight: 600;
              align-items: center;
            }
          `}</style>

          {/* Title Section */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <div>
                <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "600" }}>
                  Meteo Sense Outlook
                </div>
                <div className="header-title">
                  {location || "Nama Kota"}
                </div>
                <div className="header-subtitle">
                  {tomorrowStr}
                </div>
              </div>
              <div style={{ width: "64px", height: "64px", background: "#f3f4f6", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)" }}>
                 <Wind size={32} color="#1e3a8a" strokeWidth={2} />
              </div>
            </div>
          </div>

          {/* Column Headers (UPDATED) */}
          <div style={{ display: "flex", padding: "0 10px 10px 10px", fontWeight: "bold", color: "#64748B", textTransform: "uppercase", fontSize: "12px", letterSpacing: "0.5px" }}>
            <div style={{ width: "12%", textAlign: "center" }}>WIB</div>
            {/* Header "Cuaca" dihapus, "Prakiraan" diperlebar (15% + 48% = 63%) */}
            <div style={{ width: "63%", paddingLeft: "15px" }}>Prakiraan</div>
            <div style={{ width: "25%", paddingLeft: "20px" }}>Suhu & Kelembapan</div>
          </div>

          {/* Rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {rows.map((row, i) => {
              const styles = getRowStyles(row.condition || "", row.time)
              return (
                <div key={i} className="weather-row" style={{ borderColor: styles.border, color: styles.text }}>
                  
                  {/* JAM */}
                  <div className="col-time-h">
                    {row.time}
                  </div>

                  {/* ICON */}
                  <div className="col-icon" style={{ backgroundColor: styles.iconBg }}>
                    {getBasmiliusLineIcon(row.condition || "", row.time, 60)}
                  </div>

                  {/* DESKRIPSI */}
                  <div className="col-desc" style={{ backgroundColor: styles.descBg }}>
                    <div style={{ fontSize: "22px", fontWeight: "800", lineHeight: "1.2" }}>
                        {row.prediction.split(',')[0] || row.condition || "-"}
                    </div>
                    <div style={{ fontSize: "15px", opacity: 0.85, marginTop: "4px", fontWeight: "500" }}>
                      {row.prediction.split(',').slice(1).join(', ') || ""}
                    </div>
                  </div>

                  {/* METRIK */}
                  <div className="col-metrics">
                    <div className="metric-item">
                      <Thermometer size={24} color="#E11D48" strokeWidth={2.5} /> 
                      <span>{row.temperature ? `${row.temperature}°C` : "-"} <span style={{fontSize: "12px", opacity: 0.7}}>(±0.5)</span></span>
                    </div>
                    <div className="metric-item">
                      <Droplets size={24} color="#0EA5E9" strokeWidth={2.5} />
                      <span>{row.humidity ? `${row.humidity}%` : "-"} <span style={{fontSize: "12px", opacity: 0.7}}>(±5.0)</span></span>
                    </div>
                  </div>

                </div>
              )
            })}
          </div>

          <div className="footer">
            <div style={{ display: "flex", gap: "20px" }}>
               <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Thermometer size={16} color="#E11D48"/> Suhu Udara</span>
               <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Droplets size={16} color="#0EA5E9"/> Kelembapan</span>
            </div>
            <div>
              <span style={{ opacity: 0.7 }}>Powered by</span> <strong style={{ color: "#1e3a8a" }}>Meteo Sense</strong>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}