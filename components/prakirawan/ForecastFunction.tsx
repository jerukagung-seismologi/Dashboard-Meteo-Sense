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
  // Icon Lucide untuk UI
  Sun as LucideSun,
  Cloud as LucideCloud,
  CloudRain as LucideRain,
  CloudLightning as LucideZap,
  Wind as LucideWind
} from "lucide-react"

import html2canvas from "html2canvas"

// --- IMPORT ERIK FLOWERS WEATHER ICONS ---
import { 
  WiDaySunny, 
  WiNightClear, 
  WiDayCloudy, 
  WiNightAltCloudy, 
  WiCloudy, 
  WiFog, 
  WiDayShowers, 
  WiNightAltShowers, 
  WiRain, 
  WiRainWind, 
  WiThunderstorm, 
  WiStrongWind, 
  WiNa
} from "react-icons/wi";

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

// --- HELPER 1: PALET WARNA MIRIP REFERENSI ---
const getRowStyles = (condition: string, time: string) => {
  const hour = parseInt(time.split(":")[0]) || 0
  const isNight = hour >= 18 || hour < 6

  // Default Style: Baris Putih dengan Border Halus
  let styles = { 
    iconBg: "#F1F5F9", // Slate-100 (Abu-abu sangat muda untuk default)
    descBg: "#FFFFFF", // Putih bersih untuk deskripsi
    border: "#E2E8F0", // Slate-200 (Border halus)
    text: "#334155",   // Slate-700 (Teks gelap)
    iconColor: "#64748B" // Slate-500 (Ikon abu-abu)
  }

  switch (condition) {
    // 1. CERAH (Kuning Cerah)
    case "Cerah":
    case "Cerah Berawan":
      if (isNight) {
        // Malam: Biru Tua Cerah
        styles = { 
          iconBg: "#60A5FA", // Blue-400 (Biru langit cerah)
          descBg: "#FFFFFF",
          border: "#BFDBFE", // Blue-200
          text: "#1E3A8A",   // Blue-900
          iconColor: "#FFFFFF" // Ikon Putih
        }
      } else {
        // Siang: Kuning Cerah
        styles = { 
          iconBg: "#FDE047", // Yellow-300 (Kuning cerah)
          descBg: "#FFFFFF",
          border: "#FEF08A", // Yellow-200
          text: "#854D0E",   // Yellow-800
          iconColor: "#1E3A8A" // Ikon Biru Tua agar kontras
        }
      }
      break;

    // 2. BERAWAN / KABUT (Ungu Muda Cerah / Abu-abu Kebiruan)
    case "Berawan":
    case "Kabut":
      styles = { 
        iconBg: "#A78BFA", // Violet-400 (Ungu muda cerah, mirip referensi)
        descBg: "#FFFFFF",
        border: "#DDD6FE", // Violet-200
        text: "#4C1D95",   // Violet-900
        iconColor: "#FFFFFF" // Ikon Putih
      }
      break;

    // 3. HUJAN (Biru Cerah)
    case "Hujan Ringan":
    case "Hujan Sedang":
      styles = { 
        iconBg: "#3B82F6", // Blue-500 (Biru cerah standar)
        descBg: "#FFFFFF",
        border: "#93C5FD", // Blue-300
        text: "#1E40AF",   // Blue-800
        iconColor: "#FFFFFF" // Ikon Putih
      }
      break;

    // 4. EKSTREM (Biru Lebih Tua/Ungu)
    case "Hujan Lebat":
    case "Badai Petir":
    case "Angin Kencang":
      styles = { 
        iconBg: "#6366F1", // Indigo-500 (Biru-ungu cerah)
        descBg: "#FFFFFF",
        border: "#A5B4FC", // Indigo-300
        text: "#312E81",   // Indigo-900
        iconColor: "#FFFFFF" // Ikon Putih
      }
      break;
      
    default:
      // Fallback
      if (isNight) styles = { iconBg: "#818CF8", descBg: "#FFFFFF", border: "#C7D2FE", text: "#312E81", iconColor: "#FFFFFF" }
      else styles = { iconBg: "#FCD34D", descBg: "#FFFFFF", border: "#FDE68A", text: "#854D0E", iconColor: "#1E3A8A" }
      break;
  }
  return styles
}

// --- HELPER 2: ICON SELECTOR ---

const getErikFlowersIcon = (condition: string, time: string, size: number = 72, color: string) => {
  const hour = parseInt(time.split(":")[0]) || 0;
  const isNight = hour >= 18 || hour < 6;
  const props = { size, color };

  switch (condition) {
    case "Cerah": return isNight ? <WiNightClear {...props} /> : <WiDaySunny {...props} />;
    case "Cerah Berawan": return isNight ? <WiNightAltCloudy {...props} /> : <WiDayCloudy {...props} />;
    case "Berawan": return <WiCloudy {...props} />;
    case "Kabut": return <WiFog {...props} />;
    case "Hujan Ringan": return isNight ? <WiNightAltShowers {...props} /> : <WiDayShowers {...props} />;
    case "Hujan Sedang": return <WiRain {...props} />;
    case "Hujan Lebat": return <WiRainWind {...props} />;
    case "Badai Petir": return <WiThunderstorm {...props} />;
    case "Angin Kencang": return <WiStrongWind {...props} />;
    default: return <WiNa {...props} />;
  }
};

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
    toast({ title: "Debug", description: "Cek console." })
  }

  const onSaveAsImage = async () => {
    if (!printRef.current) return;

    try {
      toast({ title: "Memproses Gambar...", description: "Mohon tunggu..." })
      await new Promise(resolve => setTimeout(resolve, 200));

      const canvas = await html2canvas(printRef.current, {
        scale: 2, 
        backgroundColor: "#ffffff",
        logging: false,
        useCORS: true,
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
              placeholder="Contoh: Kebumen" 
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
              <TableHead className="w-[100px]">Kelembapan</TableHead>
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
                      <SelectItem value="Cerah"><span className="flex items-center gap-2"><LucideSun size={14} className="text-orange-500"/> Cerah</span></SelectItem>
                      <SelectItem value="Cerah Berawan"><span className="flex items-center gap-2"><LucideCloud size={14} className="text-orange-400"/> Cerah Berawan</span></SelectItem>
                      <SelectItem value="Berawan"><span className="flex items-center gap-2"><LucideCloud size={14} className="text-gray-500"/> Berawan</span></SelectItem>
                      <SelectItem value="Kabut"><span className="flex items-center gap-2"><LucideCloud size={14} className="text-slate-400"/> Kabut</span></SelectItem>
                      <SelectItem value="Hujan Ringan"><span className="flex items-center gap-2"><LucideRain size={14} className="text-blue-400"/> Hujan Ringan</span></SelectItem>
                      <SelectItem value="Hujan Sedang"><span className="flex items-center gap-2"><LucideRain size={14} className="text-blue-500"/> Hujan Sedang</span></SelectItem>
                      <SelectItem value="Hujan Lebat"><span className="flex items-center gap-2"><LucideZap size={14} className="text-indigo-600"/> Hujan Lebat</span></SelectItem>
                      <SelectItem value="Badai Petir"><span className="flex items-center gap-2"><LucideZap size={14} className="text-purple-600"/> Badai Petir</span></SelectItem>
                      <SelectItem value="Angin Kencang"><span className="flex items-center gap-2"><LucideWind size={14} className="text-teal-600"/> Angin Kencang</span></SelectItem>
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

      {/* --- HIDDEN AREA (OUTPUT IMAGE COMPACT & BIG - WARNA MIRIP REFERENSI) --- */}
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
              color: #334155; /* Slate-700 */
              padding: 20px;
              box-sizing: border-box;
              background-color: white; 
              /* Latar belakang putih bersih dengan sedikit gradien di bawah, mirip referensi */
              background: linear-gradient(180deg, #FFFFFF 80%, #F1F5F9 100%);
            }
            
            /* HEADER LEBIH MIRIP REFERENSI */
            .header-container { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
            .header-title { font-size: 32px; font-weight: 800; color: #1E3A8A; /* Biru Tua */ line-height: 1.1; letter-spacing: -0.5px; }
            .header-subtitle { font-size: 20px; font-weight: 600; color: #EA580C; /* Orange Tua */ margin-top: 4px; }
            .sub-label { font-size: 14px; color: #64748B; /* Slate-500 */ text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-bottom: 2px; }
            
            /* ROW DESIGN: PUTIH DENGAN BORDER WARNA */
            .weather-row {
              display: flex;
              border-radius: 12px;
              margin-bottom: 10px;
              overflow: hidden;
              box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.06); /* Shadow lebih halus */
              position: relative;
              border-left: 6px solid; /* Border warna hanya di kiri */
              border-top: 1px solid #E2E8F0;
              border-right: 1px solid #E2E8F0;
              border-bottom: 1px solid #E2E8F0;
              height: 110px;
              background-color: #FFFFFF; /* Latar belakang baris putih */
            }
            
            /* 1. JAM (Font Besar, Putih) */
            .col-time-h {
              width: 14%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 800;
              font-size: 26px;
              padding: 0;
              background-color: transparent; /* Transparan agar ikut putih */
              border-right: 1px solid rgba(0,0,0,0.05);
              color: #1E3A8A; /* Biru Tua */
            }

            /* 2. ICON (Background Warna Cerah) */
            .col-icon {
              width: 18%; 
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 0;
              /* Background diatur inline dari Logic */
            }

            /* 3. DESKRIPSI (Putih) */
            .col-desc {
              width: 43%; 
              padding: 0 20px;
              display: flex;
              flex-direction: column;
              justify-content: center;
              background-color: transparent; /* Transparan agar ikut putih */
            }
            .desc-main { font-size: 28px; font-weight: 800; line-height: 1.1; margin-bottom: 2px; color: #1E3A8A; /* Biru Tua */ }
            .desc-sub { font-size: 18px; opacity: 0.85; font-weight: 500; color: #334155; }

            /* 4. METRIK (Putih) */
            .col-metrics {
              width: 25%;
              padding: 0 20px; 
              display: flex;
              flex-direction: column;
              justify-content: center;
              gap: 8px;
              background-color: transparent; /* Transparan agar ikut putih */
              border-left: 1px solid rgba(0,0,0,0.05);
            }

            .metric-item {
              display: flex;
              align-items: center;
              gap: 12px;
              font-size: 24px;
              font-weight: 700;
              color: #334155;
            }
            
            /* FOOTER COMPACT */
            .footer {
              margin-top: 30px;
              padding-top: 10px;
              border-top: 2px solid #E2E8F0;
              font-size: 14px;
              color: #64748B;
              display: flex;
              justify-content: space-between;
              font-weight: 600;
              align-items: center;
            }
          `}</style>

          {/* Title Section */}
          <div className="header-container">
            <div>
              <div className="sub-label">Meteo Sense Outlook</div>
              <div className="header-title">{location || "Nama Kota"}</div>
              <div className="header-subtitle">{tomorrowStr}</div>
            </div>
            {/* Logo */}
            <div style={{ width: "80px", height: "80px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                 <img src="/img/logo.webp" alt="Logo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
            </div>
          </div>

          {/* Column Headers */}
          <div style={{ display: "flex", padding: "0 10px 8px 10px", fontWeight: "bold", color: "#64748B", textTransform: "uppercase", fontSize: "14px", letterSpacing: "0.5px" }}>
            <div style={{ width: "14%", textAlign: "center" }}>WIB</div>
            <div style={{ width: "61%", paddingLeft: "15px" }}>Prakiraan</div>
            <div style={{ width: "25%", paddingLeft: "20px" }}>Parameter</div>
          </div>

          {/* Rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {rows.map((row, i) => {
              const styles = getRowStyles(row.condition || "", row.time)
              return (
                <div key={i} className="weather-row" style={{ borderLeftColor: styles.iconBg }}>
                  
                  {/* JAM */}
                  <div className="col-time-h">
                    {row.time}
                  </div>

                  {/* ICON (Background Warna Cerah) */}
                  <div className="col-icon" style={{ backgroundColor: styles.iconBg }}>
                    {getErikFlowersIcon(row.condition || "", row.time, 90, styles.iconColor)}
                  </div>

                  {/* DESKRIPSI (Latar Belakang Putih) */}
                  <div className="col-desc">
                    <div className="desc-main">
                        {row.prediction.split(',')[0] || row.condition || "-"}
                    </div>
                    <div className="desc-sub">
                      {row.prediction.split(',').slice(1).join(', ') || ""}
                    </div>
                  </div>

                  {/* METRIK (Latar Belakang Putih) */}
                  <div className="col-metrics">
                    <div className="metric-item">
                      <Thermometer size={28} color="#EF4444" strokeWidth={3} /> 
                      <span>{row.temperature ? `${row.temperature}°` : "-"}</span>
                    </div>
                    <div className="metric-item">
                      <Droplets size={28} color="#3B82F6" strokeWidth={3} />
                      <span>{row.humidity ? `${row.humidity}%` : "-"}</span>
                    </div>
                  </div>

                </div>
              )
            })}
          </div>

          <div className="footer">
            <div style={{ display: "flex", gap: "20px" }}>
               <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Thermometer size={18} color="#EF4444"/> Suhu</span>
               <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Droplets size={18} color="#3B82F6"/> Kelembapan</span>
            </div>
            <div>
              <span style={{ opacity: 0.7 }}>Powered by</span> <strong style={{ color: "#1E3A8A" }}>Meteo Sense</strong>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}