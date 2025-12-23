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
  // Import Ikon Cuaca Lengkap dari Lucide
  Sun,
  Moon,
  Cloud,
  CloudSun,
  CloudMoon,
  CloudRain,
  CloudLightning,
  CloudDrizzle
} from "lucide-react"

import html2canvas from "html2canvas"

// --- TIPE DATA ---

export type WeatherCondition =
  | "Cerah"
  | "Cerah Berawan"
  | "Berawan"
  | "Hujan Ringan"
  | "Hujan Sedang"
  | "Hujan Lebat"

export type ForecastRow = {
  time: string
  condition: WeatherCondition | ""
  prediction: string
  temperature?: number | ""
  humidity?: number | ""
}

const initialTimes = ["07:00", "10:00", "13:00", "16:00", "19:00"]

// --- HELPER FUNCTIONS ---

const getRowStyles = (time: string) => {
  const hour = parseInt(time.split(":")[0]) || 0
  
  // Pagi/Siang Cerah (Kuning) - 06:00 s/d 11:00
  if (hour >= 6 && hour < 12) {
    return { bg: "#FEF3C7", border: "#F59E0B", text: "#92400E", iconColor: "#F59E0B" }
  }
  // Siang/Sore Hujan/Berawan (Biru) - 12:00 s/d 17:00
  if (hour >= 12 && hour < 18) {
    return { bg: "#DBEAFE", border: "#3B82F6", text: "#1E40AF", iconColor: "#2563EB" }
  }
  // Malam (Ungu) - 18:00 ke atas atau sebelum 06:00
  return { bg: "#F3E8FF", border: "#9333EA", text: "#6B21A8", iconColor: "#7E22CE" }
}

// Helper Ikon menggunakan LUCIDE REACT
const getWeatherIcon = (condition: string, time: string, size: number = 24) => {
  const hour = parseInt(time.split(":")[0]) || 0
  const isNight = hour >= 18 || hour < 6
  
  // Kita set strokeWidth agak tebal biar tegas di gambar
  const props = { size, strokeWidth: 2 } 

  switch (condition as WeatherCondition) {
    case "Cerah":
      return isNight ? <Moon {...props} /> : <Sun {...props} />
    
    case "Cerah Berawan":
      return isNight ? <CloudMoon {...props} /> : <CloudSun {...props} />
    
    case "Berawan":
      return <Cloud {...props} />
    
    case "Hujan Ringan":
      return <CloudDrizzle {...props} />
    
    case "Hujan Sedang":
      return <CloudRain {...props} />
    
    case "Hujan Lebat":
      return <CloudLightning {...props} />
      
    default:
      return <Wind {...props} />
  }
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
  
  // Refs
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

  // --- FUNGSI SAVE IMAGE (LUCIDE VERSION - CEPAT & STABIL) ---
  const onSaveAsImage = async () => {
    if (!printRef.current) return;

    try {
      toast({ title: "Memproses Gambar...", description: "Sedang membuat layout..." })

      // Delay sangat singkat cukup karena Lucide itu SVG internal (bukan gambar external)
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(printRef.current, {
        scale: 2, // Resolusi tinggi (Retina)
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
                    {/* INI BAGIAN YANG KAMU SUKA TADI (DROPDOWN + ICON LUCIDE) */}
                    <SelectContent>
                      <SelectItem value="Cerah"><span className="flex items-center gap-2"><Sun size={14} className="text-orange-500"/> Cerah</span></SelectItem>
                      <SelectItem value="Cerah Berawan"><span className="flex items-center gap-2"><CloudSun size={14} className="text-orange-400"/> Cerah Berawan</span></SelectItem>
                      <SelectItem value="Berawan"><span className="flex items-center gap-2"><Cloud size={14} className="text-gray-500"/> Berawan</span></SelectItem>
                      <SelectItem value="Hujan Ringan"><span className="flex items-center gap-2"><CloudDrizzle size={14} className="text-blue-400"/> Hujan Ringan</span></SelectItem>
                      <SelectItem value="Hujan Sedang"><span className="flex items-center gap-2"><CloudRain size={14} className="text-blue-500"/> Hujan Sedang</span></SelectItem>
                      <SelectItem value="Hujan Lebat"><span className="flex items-center gap-2"><CloudLightning size={14} className="text-indigo-600"/> Hujan Lebat</span></SelectItem>
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
      {/* Teknik: Fixed Position di luar layar (-9999px).
          Lucide Icon aman dirender di sini.
      */}
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
              /* Background gradient halus */
              background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
            }
            
            .header-title { font-size: 36px; font-weight: 800; color: #1e3a8a; line-height: 1.1; margin-bottom: 5px; letter-spacing: -0.5px; }
            .header-subtitle { font-size: 22px; font-weight: 600; color: #ea580c; margin-bottom: 35px; }
            
            .weather-row {
              display: flex;
              border-radius: 16px;
              margin-bottom: 14px;
              overflow: hidden;
              color: #fff;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
              position: relative;
            }
            
            /* Shine effect overlay */
            .weather-row::after {
              content: "";
              position: absolute;
              top: 0; left: 0; right: 0; bottom: 0;
              background: linear-gradient(120deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0) 70%);
              pointer-events: none;
            }

            .col-time-h {
              width: 12%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 800;
              font-size: 18px;
              padding: 15px;
              border-right: 1px solid rgba(255,255,255,0.2);
              background-color: rgba(0,0,0,0.05);
            }

            .col-main {
              width: 63%; 
              padding: 15px 25px;
              display: flex;
              align-items: center;
              gap: 25px;
            }
            
            .col-metrics {
              width: 25%;
              padding: 10px 20px; 
              display: flex;
              flex-direction: column;
              justify-content: center;
              gap: 12px; 
              background-color: rgba(255,255,255,0.25);
              border-left: 1px solid rgba(255,255,255,0.2);
            }

            .metric-item {
              display: flex;
              align-items: center;
              gap: 12px;
              font-size: 20px;
              font-weight: 700;
              text-shadow: 0 1px 2px rgba(0,0,0,0.1);
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
                 {/* Logo Placeholder */}
                 <Wind size={32} color="#1e3a8a" strokeWidth={2} />
              </div>
            </div>
          </div>

          {/* Column Headers */}
          <div style={{ display: "flex", padding: "0 10px 10px 10px", fontWeight: "bold", color: "#64748B", textTransform: "uppercase", fontSize: "12px", letterSpacing: "0.5px" }}>
            <div style={{ width: "12%", textAlign: "center" }}>WIB</div>
            <div style={{ width: "63%" }}>Prakiraan</div>
            <div style={{ width: "25%", paddingLeft: "20px" }}>Suhu & RH</div>
          </div>

          {/* Rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {rows.map((row, i) => {
              const styles = getRowStyles(row.time)
              return (
                <div key={i} className="weather-row" style={{ backgroundColor: styles.bg, color: styles.text }}>
                  <div className="col-time-h" style={{ borderColor: styles.border }}>
                    {row.time}
                  </div>

                  <div className="col-main">
                    {/* Render Icon Lucide (Besar untuk Gambar) */}
                    <div style={{ minWidth: "64px", color: styles.iconColor }}>
                      {getWeatherIcon(row.condition || "", row.time, 64)}
                    </div>
                    
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <div style={{ fontSize: "22px", fontWeight: "800", lineHeight: "1.2" }}>
                         {row.prediction.split(',')[0] || row.condition || "-"}
                      </div>
                      <div style={{ fontSize: "15px", opacity: 0.85, marginTop: "4px", fontWeight: "500" }}>
                        {row.prediction.split(',').slice(1).join(', ') || ""}
                      </div>
                    </div>
                  </div>

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