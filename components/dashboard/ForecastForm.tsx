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
  // Printer, // Dihapus
  Download, // Diganti ikon Download/Image
  Sun, 
  Cloud, 
  CloudRain, 
  CloudLightning, 
  Moon, 
  CloudSun, 
  CloudMoon, 
  Thermometer, 
  Droplets, 
  Wind
} from "lucide-react"
// import { useReactToPrint } from "react-to-print" // Dihapus
import html2canvas from "html2canvas" // Ditambahkan

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

const getWeatherIcon = (condition: string, time: string, size: number = 24) => {
  const hour = parseInt(time.split(":")[0]) || 0
  const isNight = hour >= 18 || hour < 6
  const props = { size, strokeWidth: 2 }

  switch (condition as WeatherCondition) {
    case "Cerah":
      return isNight ? <Moon {...props} /> : <Sun {...props} />
    case "Cerah Berawan":
      return isNight ? <CloudMoon {...props} /> : <CloudSun {...props} />
    case "Berawan":
      return <Cloud {...props} />
    case "Hujan Ringan":
      return <CloudRain {...props} />
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
  
  // Ref untuk area konten yang akan dijadikan gambar
  const printRef = React.useRef<HTMLDivElement>(null)
  // Ref baru untuk wrapper pembungkus yang disembunyikan
  const hiddenWrapperRef = React.useRef<HTMLDivElement>(null)

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

  // --- FUNGSI BARU: SIMPAN SEBAGAI GAMBAR ---
  const onSaveAsImage = async () => {
    if (!printRef.current || !hiddenWrapperRef.current) return;

    try {
      toast({ title: "Memproses Gambar...", description: "Mohon tunggu sebentar." })

      // 1. Tampilkan sementara area tersembunyi agar html2canvas bisa membacanya
      // html2canvas tidak bisa menangkap elemen dengan display: none
      hiddenWrapperRef.current.style.display = "block";

      // 2. Gunakan html2canvas untuk membuat gambar dari elemen DOM
      const canvas = await html2canvas(printRef.current, {
        scale: 2, // Meningkatkan resolusi gambar (lebih tajam)
        backgroundColor: "#ffffff", // Pastikan background putih
        logging: false, // Matikan log debug di console
      });

      // 3. Kembalikan status hidden
      hiddenWrapperRef.current.style.display = "none";

      // 4. Buat link download palsu untuk memicu unduhan
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      const fileName = `Outlook_${location || "Kota"}_${new Date().toISOString().split('T')[0]}.png`;
      
      link.href = image;
      link.download = fileName;
      link.click();

      toast({ title: "Berhasil", description: "Gambar telah disimpan ke perangkat Anda." });

    } catch (error) {
      console.error("Error generating image:", error);
      toast({ 
        title: "Gagal Menyimpan", 
        description: "Terjadi kesalahan saat membuat gambar.", 
        variant: "destructive" 
      });
      // Pastikan wrapper disembunyikan kembali jika terjadi error
      if (hiddenWrapperRef.current) {
         hiddenWrapperRef.current.style.display = "none";
      }
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
          {/* Tombol diubah fungsinya */}
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
                  <Input 
                    value={row.time} 
                    onChange={(e) => updateRow(idx, { time: e.target.value })} 
                    className="h-9"
                  />
                </TableCell>
                <TableCell>
                  <Select 
                    value={row.condition} 
                    onValueChange={(v) => updateRow(idx, { condition: v as WeatherCondition })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Pilih..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cerah">☀️ Cerah</SelectItem>
                      <SelectItem value="Cerah Berawan">🌤️ Cerah Berawan</SelectItem>
                      <SelectItem value="Berawan">☁️ Berawan</SelectItem>
                      <SelectItem value="Hujan Ringan">🌧️ Hujan Ringan</SelectItem>
                      <SelectItem value="Hujan Sedang">🌧️ Hujan Sedang</SelectItem>
                      <SelectItem value="Hujan Lebat">⛈️ Hujan Lebat</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Textarea 
                    value={row.prediction} 
                    onChange={(e) => updateRow(idx, { prediction: e.target.value })} 
                    placeholder="Cth: 80% Cerah, 20% Berawan"
                    className="min-h-[40px] h-9 py-1 text-sm resize-none"
                  />
                </TableCell>
                <TableCell>
                  <Input type="number" value={row.temperature || ""} onChange={(e) => updateRow(idx, { temperature: e.target.value })} className="h-9" />
                </TableCell>
                <TableCell>
                  <Input type="number" value={row.humidity || ""} onChange={(e) => updateRow(idx, { humidity: e.target.value })} className="h-9" />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => removeRow(idx)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* --- HIDDEN AREA UNTUK GENERATE GAMBAR --- */}
      {/* Kita gunakan ref pada wrapper ini untuk mengubah display:none menjadi block sementara */}
      <div style={{ display: "none" }} ref={hiddenWrapperRef}>
        {/* Kita pasang lebar tetap di sini agar hasil gambar konsisten tidak tergantung lebar layar saat ini */}
        <div ref={printRef} className="print-container" style={{ width: "800px", margin: "0 auto" }}>
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
            /* @page removed karena tidak dicetak */
            .print-container { 
              font-family: 'Poppins', sans-serif; 
              color: #1F2937;
              padding: 30px; /* Padding sedikit diperbesar untuk gambar */
              box-sizing: border-box;
              background-color: white; /* Penting untuk gambar */
            }
            
            .header-title { font-size: 32px; font-weight: 700; color: #1e3a8a; line-height: 1.2; margin-bottom: 5px; }
            .header-subtitle { font-size: 20px; font-weight: 600; color: #ea580c; margin-bottom: 30px; }
            
            .weather-row {
              display: flex;
              border-radius: 12px;
              margin-bottom: 12px;
              overflow: hidden;
              color: #fff;
              /* page-break-inside removed */
            }
            
            /* Styles for Columns */
            .col-time-h {
              width: 10%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 700;
              font-size: 16px;
              padding: 15px;
              border-right: 2px solid rgba(255,255,255,0.5);
            }

            .col-main {
              width: 65%; 
              padding: 15px 20px;
              display: flex;
              align-items: center;
              gap: 20px;
            }
            
            .col-metrics {
              width: 25%;
              padding: 10px 20px; 
              display: flex;
              flex-direction: column;
              justify-content: center;
              gap: 12px; 
              background-color: rgba(255,255,255,0.4);
              border-left: 1px solid rgba(255,255,255,0.3);
            }

            .metric-item {
              display: flex;
              align-items: center;
              gap: 12px;
              font-size: 18px;
              font-weight: 600;
            }
            
            .footer {
              margin-top: 40px;
              padding-top: 10px;
              border-top: 2px solid #e5e7eb;
              font-size: 12px;
              color: #6b7280;
              display: flex;
              justify-content: space-between;
              font-weight: 600;
            }
          `}</style>

          {/* Title Section */}
          <div>
            <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "4px" }}>
              Meteo Sense Outlook
            </div>
            <div className="header-title">
              {location || "Nama Kota"}
            </div>
            <div className="header-subtitle">
              {tomorrowStr}
            </div>
          </div>

          {/* Column Headers */}
          <div style={{ display: "flex", padding: "0 10px 10px 10px", fontWeight: "bold", color: "#1e3a8a" }}>
            <div style={{ width: "10%" }}>WIB</div>
            <div style={{ width: "65%" }}>Kemungkinan Cuaca</div>
            <div style={{ width: "25%", paddingLeft: "15px" }}>Parameter</div>
          </div>

          {/* Rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {rows.map((row, i) => {
              const styles = getRowStyles(row.time)
              return (
                <div 
                  key={i} 
                  className="weather-row"
                  style={{ backgroundColor: styles.bg, color: styles.text }}
                >
                  {/* Kolom Waktu */}
                  <div className="col-time-h" style={{ borderColor: styles.border }}>
                    {row.time}
                  </div>

                  {/* Kolom Kondisi Utama */}
                  <div className="col-main">
                    <div style={{ color: styles.iconColor }}>
                      {getWeatherIcon(row.condition || "", row.time, 56)}
                    </div>
                    
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <div style={{ fontSize: "20px", fontWeight: "700", lineHeight: "1.2" }}>
                         {row.prediction.split(',')[0] || row.condition || "-"}
                      </div>
                      <div style={{ fontSize: "14px", opacity: 0.8, marginTop: "4px" }}>
                        {row.prediction.split(',').slice(1).join(', ') || ""}
                      </div>
                    </div>
                  </div>

                  {/* Kolom Metrik (Suhu & RH Saja - Font Besar) */}
                  <div className="col-metrics">
                    <div className="metric-item">
                      <Thermometer size={22} color="#E11D48" /> 
                      <span>{row.temperature ? `${row.temperature}°C` : "-"} <span style={{fontSize: "12px", opacity: 0.7}}>(±0.5)</span></span>
                    </div>
                    <div className="metric-item">
                      <Droplets size={22} color="#0EA5E9" />
                      <span>{row.humidity ? `${row.humidity}%` : "-"} <span style={{fontSize: "12px", opacity: 0.7}}>(±5.0)</span></span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="footer">
            <div style={{ display: "flex", gap: "20px" }}>
               <span style={{ display: "flex", alignItems: "center", gap: "5px" }}><Thermometer size={14} color="#E11D48"/> Suhu Udara</span>
               <span style={{ display: "flex", alignItems: "center", gap: "5px" }}><Droplets size={14} color="#0EA5E9"/> Kelembapan</span>
            </div>
            <div>
              Prediksi ini bersifat eksperimental • Meteo Sense
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}