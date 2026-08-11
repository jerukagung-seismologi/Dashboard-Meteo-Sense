"use client"

import { useEffect, useState, useMemo } from "react"
import { 
  Download, 
  CalendarIcon, 
  Globe, 
  FileSpreadsheet, 
  Info, 
  CheckCircle2, 
  Loader2, 
  Clock, 
  ExternalLink,
  Copy,
  Settings2,
  Table as TableIcon,
  HelpCircle,
  ShieldCheck,
  Building2,
  KeyRound
} from "lucide-react"
import { type DateRange } from "react-day-picker"
import { format, subDays } from "date-fns"
import { id } from "date-fns/locale"

import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { fetchSensorDataByDateRange } from "@/lib/apiClient"
import type { SensorDate } from "@/lib/FetchingSensorData"
import { cn } from "@/lib/utils"

// Exact UK Met Office WOW Bulk Upload Header (50 Columns)
const WOW_HEADER_COLUMNS = [
  "Id",
  "Site Id",
  "Site Authentication Key",
  "Report Date / Time",
  "Concrete Temp.",
  "Day of Gales",
  "Soil Temp. (at 10cm)",
  "Wet Bulb",
  "Soil Temp. (at 30cm)",
  "Max. Temp. (last 24hr)",
  "Total Cloud Cover",
  "Wind Gust",
  "Day of Hail",
  "Wind Gust Direction",
  "Present Weather",
  "Ground State",
  "Soil Temp. (at 100cm)",
  "Grass Temp.",
  "Sunshine",
  "Day of Snow",
  "Mean Sea-Level Pressure",
  "Pressure (At Station)",
  "Relative Humidity ", // Notice the trailing space per WOW official specification
  "Weather Diary",
  "Rainfall Accumulation",
  "Visibility",
  "Min. Temp. (last 24hr)",
  "Wind Direction",
  "Wind Speed",
  "Air Temperature",
  "Snow Depth",
  "Soil Moisture",
  "Dew Point",
  "Day of Thunder",
  "Rainfall Rate",
  "Rainfall",
  "Travel Disruption",
  "Hazards causing Travel Disruption",
  "Property or Infrastructure Damage",
  "Hazards causing Property or Infrastructure Damage",
  "Personal Health and Safety",
  "Hazards causing Personal Health and Safety",
  "Utility Disruption",
  "Hazards causing Utility Disruption",
  "Service or Business Disruption",
  "Hazards causing Service or Business Disruption",
  "Agriculture Habitat Damage",
  "Hazards causing Agriculture Habitat Damage",
  "Disruption to Camping Events Leisure Activities",
  "Hazards causing Disruption to Camping Events Leisure Activities",
];

// Helper to calculate Dew Point with Magnus-Tetens formula if missing
function calculateDewPoint(temp: number, humidity: number): number {
  if (!Number.isFinite(temp) || !Number.isFinite(humidity) || humidity <= 0) return temp;
  const a = 17.27;
  const b = 237.7;
  const alpha = ((a * temp) / (b + temp)) + Math.log(humidity / 100);
  const dew = (b * alpha) / (a - alpha);
  return Number.isFinite(dew) ? Number(dew.toFixed(1)) : temp;
}

// Helper to calculate Sea Level Pressure from Station Pressure & Elevation
function calculateMSLP(stationPress: number, elevationMeters: number, tempC: number): number {
  if (!Number.isFinite(stationPress) || stationPress <= 0) return 0;
  if (!Number.isFinite(elevationMeters) || elevationMeters <= 0) return stationPress;
  // Hypsometric formula
  const tempK = (Number.isFinite(tempC) ? tempC : 15) + 273.15;
  const mslp = stationPress * Math.exp((9.80665 * 0.0289644 * elevationMeters) / (8.31447 * tempK));
  return Number(mslp.toFixed(1));
}

// Format timestamp to "DD/MM/YYYY HH:mm" for Met Office WOW
function formatWOWDateTime(timestamp: number, useUtc: boolean): string {
  const d = new Date(timestamp);
  if (useUtc) {
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year = d.getUTCFullYear();
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const mins = String(d.getUTCMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${mins}`;
  } else {
    // Local Time
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${mins}`;
  }
}

interface ExportWOWMetOfficeProps {
  sensorId: string;
  sensorName: string;
  displayName: string;
}

export default function ExportWOWMetOffice({ sensorId, sensorName, displayName }: ExportWOWMetOfficeProps) {
  const { toast } = useToast();

  // Date Range state (Default last 7 days)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const end = new Date();
    const start = subDays(end, 7);
    return { from: start, to: end };
  });

  // WOW Configuration state (Saved in localStorage)
  const [siteId, setSiteId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("wow_site_id") || "";
    }
    return "";
  });

  const [authKey, setAuthKey] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("wow_auth_key") || "";
    }
    return "";
  });

  const [elevation, setElevation] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("wow_elevation");
      return saved ? Number(saved) : 100;
    }
    return 100;
  });

  const [useUtc, setUseUtc] = useState<boolean>(true);
  const [intervalMin, setIntervalMin] = useState<string>("10"); // "raw", "10", "15", "30", "60"
  const [loading, setLoading] = useState<boolean>(false);
  const [rawData, setRawData] = useState<SensorDate[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<string>("data");

  // Save WOW preferences
  const handleSaveConfig = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("wow_site_id", siteId);
      localStorage.setItem("wow_auth_key", authKey);
      localStorage.setItem("wow_elevation", String(elevation));
      toast({ title: "Pengaturan Tersimpan", description: "Site ID dan kredensial WOW Met Office telah disimpan di browser Anda." });
    }
  };

  // Fetch raw sensor data
  const fetchData = async () => {
    if (!sensorId) {
      toast({ title: "Peringatan", description: "Pilih stasiun sensor terlebih dahulu.", variant: "destructive" });
      return;
    }
    if (!dateRange?.from || !dateRange?.to) {
      toast({ title: "Peringatan", description: "Pilih rentang tanggal yang valid.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const start = new Date(dateRange.from);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateRange.to);
      end.setHours(23, 59, 59, 999);

      const records = await fetchSensorDataByDateRange(sensorId, start.getTime(), end.getTime());
      if (!records || records.length === 0) {
        setRawData([]);
        toast({ title: "Informasi", description: "Tidak ada data sensor pada rentang tanggal tersebut." });
      } else {
        // Sort ascending by timestamp
        records.sort((a, b) => a.timestamp - b.timestamp);
        setRawData(records);
        toast({ title: "Data Berhasil Dimuat", description: `Ditemukan ${records.length.toLocaleString("id-ID")} titik observasi sensor.` });
      }
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", description: err.message || "Gagal menarik data sensor", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Filter & downsample data according to selected interval
  const processedObservations = useMemo(() => {
    if (!rawData || rawData.length === 0) return [];
    if (intervalMin === "raw") return rawData;

    const intervalMs = Number(intervalMin) * 60 * 1000;
    const buckets = new Map<number, SensorDate>();

    for (const record of rawData) {
      const bucketKey = Math.floor(record.timestamp / intervalMs) * intervalMs;
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, record);
      }
    }

    return Array.from(buckets.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [rawData, intervalMin]);

  // Convert observations to WOW Bulk Upload Rows
  const wowRows = useMemo(() => {
    return processedObservations.map((r, index) => {
      const dateTimeStr = formatWOWDateTime(r.timestamp, useUtc);
      const temp = Number.isFinite(r.temperature) ? Number(r.temperature.toFixed(1)) : "";
      const humidity = Number.isFinite(r.humidity) ? Math.round(r.humidity) : "";
      const pressureStation = Number.isFinite(r.pressure) ? Number(r.pressure.toFixed(1)) : "";
      const mslp = Number.isFinite(r.pressure) ? calculateMSLP(r.pressure, elevation, Number(r.temperature) || 15) : "";
      
      const dewVal = Number.isFinite(r.dew) 
        ? Number(r.dew.toFixed(1)) 
        : (Number.isFinite(r.temperature) && Number.isFinite(r.humidity) ? calculateDewPoint(r.temperature, r.humidity) : "");

      const rainAccum = Number.isFinite(r.rainfall) ? Number(r.rainfall.toFixed(1)) : "";
      const rainRate = Number.isFinite(r.rainrate) ? Number(r.rainrate.toFixed(1)) : "";
      const soilTemp = Number.isFinite(r.soil_temp) ? Number(r.soil_temp.toFixed(1)) : "";

      // Estimate sunshine (1 if solar radiation / lux indicates clear daylight > 20000 lux)
      const sunshine = Number.isFinite(r.lux) ? (r.lux >= 20000 ? "1" : "0") : "";

      // Any wind data if present
      const anyR = r as any;
      const windSpeed = anyR.wind_speed != null && Number.isFinite(Number(anyR.wind_speed)) ? Number(anyR.wind_speed).toFixed(1) : "";
      const windDir = anyR.wind_dir != null && Number.isFinite(Number(anyR.wind_dir)) ? Math.round(anyR.wind_dir) : "";
      const windGust = anyR.wind_gust != null && Number.isFinite(Number(anyR.wind_gust)) ? Number(anyR.wind_gust).toFixed(1) : "";
      const windGustDir = anyR.wind_gust_dir != null && Number.isFinite(Number(anyR.wind_gust_dir)) ? Math.round(anyR.wind_gust_dir) : "";
      const soilMoisture = anyR.soil_moisture != null && Number.isFinite(Number(anyR.soil_moisture)) ? Math.round(anyR.soil_moisture) : "";

      // Map 50 Columns in exact order:
      return [
        "", // 0: Id
        siteId, // 1: Site Id
        authKey, // 2: Site Authentication Key
        dateTimeStr, // 3: Report Date / Time
        "", // 4: Concrete Temp.
        "", // 5: Day of Gales
        soilTemp, // 6: Soil Temp. (at 10cm)
        "", // 7: Wet Bulb
        "", // 8: Soil Temp. (at 30cm)
        "", // 9: Max. Temp. (last 24hr)
        "", // 10: Total Cloud Cover
        windGust, // 11: Wind Gust
        "", // 12: Day of Hail
        windGustDir, // 13: Wind Gust Direction
        "", // 14: Present Weather
        "", // 15: Ground State
        "", // 16: Soil Temp. (at 100cm)
        "", // 17: Grass Temp.
        sunshine, // 18: Sunshine
        "", // 19: Day of Snow
        mslp, // 20: Mean Sea-Level Pressure
        pressureStation, // 21: Pressure (At Station)
        humidity, // 22: Relative Humidity 
        "", // 23: Weather Diary
        rainAccum, // 24: Rainfall Accumulation
        "", // 25: Visibility
        "", // 26: Min. Temp. (last 24hr)
        windDir, // 27: Wind Direction
        windSpeed, // 28: Wind Speed
        temp, // 29: Air Temperature
        "0", // 30: Snow Depth
        soilMoisture, // 31: Soil Moisture
        dewVal, // 32: Dew Point
        "", // 33: Day of Thunder
        rainRate, // 34: Rainfall Rate
        "", // 35: Rainfall
        "", // 36: Travel Disruption
        "", // 37: Hazards causing Travel Disruption
        "", // 38: Property or Infrastructure Damage
        "", // 39: Hazards causing Property or Infrastructure Damage
        "", // 40: Personal Health and Safety
        "", // 41: Hazards causing Personal Health and Safety
        "", // 42: Utility Disruption
        "", // 43: Hazards causing Utility Disruption
        "", // 44: Service or Business Disruption
        "", // 45: Hazards causing Service or Business Disruption
        "", // 46: Agriculture Habitat Damage
        "", // 47: Hazards causing Agriculture Habitat Damage
        "", // 48: Disruption to Camping Events Leisure Activities
        "", // 49: Hazards causing Disruption to Camping Events Leisure Activities
      ];
    });
  }, [processedObservations, useUtc, siteId, authKey, elevation]);

  // Generate CSV String
  const generateCSVContent = (): string => {
    const headerLine = WOW_HEADER_COLUMNS.join(",");
    const dataLines = wowRows.map(row => 
      row.map(val => {
        if (typeof val === "string" && (val.includes(",") || val.includes('"') || val.includes("\n"))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val ?? "";
      }).join(",")
    );
    return [headerLine, ...dataLines].join("\n");
  };

  // Download CSV File
  const handleDownloadCSV = () => {
    if (wowRows.length === 0) {
      toast({ title: "Peringatan", description: "Tidak ada data untuk diekspor. Muat data terlebih dahulu.", variant: "destructive" });
      return;
    }

    const csvContent = generateCSVContent();
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    const fromStr = dateRange?.from ? format(dateRange.from, 'yyyyMMdd') : '';
    const toStr = dateRange?.to ? format(dateRange.to, 'yyyyMMdd') : '';
    const filename = `WOW_MetOffice_BulkUpload_${sensorName.replace(/\s+/g, '_')}_${fromStr}_${toStr}.csv`;
    
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ 
      title: "✓ File CSV WOW Siap!", 
      description: `File "${filename}" (${wowRows.length.toLocaleString("id-ID")} baris observasi) berhasil diunduh.` 
    });
  };

  // Copy CSV sample to clipboard
  const handleCopyClipboard = () => {
    if (wowRows.length === 0) return;
    const csvContent = generateCSVContent();
    navigator.clipboard.writeText(csvContent);
    toast({ title: "Tersalin ke Clipboard", description: "Format CSV WOW Met Office berhasil disalin." });
  };

  // Initial load
  useEffect(() => {
    if (sensorId) {
      fetchData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensorId]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <Card className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white border-none shadow-md overflow-hidden relative">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-blue-500/10 to-transparent pointer-events-none" />
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-600/80 hover:bg-blue-600 text-white text-xs border-none uppercase tracking-wider font-semibold">
                  UK Met Office Integration
                </Badge>
                <Badge variant="outline" className="text-xs text-blue-200 border-blue-400/40">
                  Template WOW Bulk Upload
                </Badge>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <Globe className="w-6 h-6 text-blue-400" />
                Ekspor Observasi WOW Met Office
              </h1>
              <p className="text-sm text-slate-300 max-w-2xl">
                Konversi dan ekspor riwayat observasi stasiun cuaca ke format CSV resmi <strong>Weather Observations Website (WOW) - UK Met Office</strong> untuk pengunggahan massal (*Bulk Upload*).
              </p>
            </div>

            <div className="flex flex-wrap gap-2 shrink-0">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCopyClipboard} 
                disabled={wowRows.length === 0}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 h-9"
              >
                <Copy className="mr-1.5 h-4 w-4" /> Salin CSV
              </Button>
              <Button 
                onClick={handleDownloadCSV} 
                disabled={wowRows.length === 0 || loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md h-9"
              >
                <Download className="mr-1.5 h-4 w-4" /> Unduh CSV WOW ({wowRows.length.toLocaleString("id-ID")} Baris)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Filter Periode & Ekspor Options */}
        <Card className="lg:col-span-2 shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <CalendarIcon className="w-4 h-4 text-blue-600" />
              Pengaturan Rentang Waktu & Interval
            </CardTitle>
            <CardDescription className="text-xs">
              Tentukan periode data observasi dan resolusi interval pencatatan yang diinginkan.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date Range Picker */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Rentang Tanggal Observasi</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal text-xs h-9", !dateRange && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5 text-blue-600" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>{format(dateRange.from, 'dd LLL y', { locale: id })} – {format(dateRange.to, 'dd LLL y', { locale: id })}</>
                        ) : format(dateRange.from, 'dd LLL y', { locale: id })
                      ) : <span>Pilih Rentang Tanggal</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Interval Downsampling */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Interval Resolusi Data</Label>
                <Select value={intervalMin} onValueChange={setIntervalMin}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Pilih Interval" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="raw">Semua Data Mentah (Tanpa Downsampling)</SelectItem>
                    <SelectItem value="5">Per 5 Menit</SelectItem>
                    <SelectItem value="10">Per 10 Menit (Standar Met Office WOW)</SelectItem>
                    <SelectItem value="15">Per 15 Menit</SelectItem>
                    <SelectItem value="30">Per 30 Menit</SelectItem>
                    <SelectItem value="60">Per 1 Jam (Sinoptik)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Timezone Switch & Fetch Button */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-3 border-t">
              <div className="flex items-center gap-3">
                <div className="flex items-center space-x-2">
                  <Switch id="use-utc" checked={useUtc} onCheckedChange={setUseUtc} />
                  <Label htmlFor="use-utc" className="text-xs font-medium cursor-pointer">
                    Format Waktu Standar <strong>UTC (Zulu / GMT)</strong>
                  </Label>
                </div>
                <Badge variant="outline" className={cn("text-[10px]", useUtc ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-amber-50 text-amber-700 border-amber-200")}>
                  {useUtc ? "Direkomendasikan Met Office" : "Waktu Lokal (WIB)"}
                </Badge>
              </div>

              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={fetchData} 
                  disabled={loading} 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs h-9 px-4"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Memproses Data...
                    </>
                  ) : (
                    "Muat Ulang Observasi"
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right 1 Col: WOW Met Office Metadata & Credentials */}
        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Building2 className="w-4 h-4 text-emerald-600" />
              Identitas Stasiun WOW
            </CardTitle>
            <CardDescription className="text-xs">
              Opsional: Disematkan langsung ke setiap baris CSV.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">Site ID (WOW Stasiun)</Label>
              <Input
                placeholder="Contoh: 98765432-abcd-ef01"
                value={siteId}
                onChange={e => setSiteId(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">Site Authentication Key (PIN AWS)</Label>
              <Input
                type="password"
                placeholder="6-digit PIN AWS WOW"
                value={authKey}
                onChange={e => setAuthKey(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">Elevasi Stasiun (mdpl)</Label>
              <Input
                type="number"
                placeholder="100"
                value={elevation}
                onChange={e => setElevation(Number(e.target.value) || 0)}
                className="h-8 text-xs font-mono"
              />
              <p className="text-[10px] text-slate-400">Digunakan untuk menghitung *Mean Sea-Level Pressure* (MSLP).</p>
            </div>

            <Button variant="outline" size="sm" onClick={handleSaveConfig} className="w-full text-xs h-8 mt-2">
              <Settings2 className="w-3.5 h-3.5 mr-1 text-slate-500" /> Simpan Pengaturan WOW
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-slate-50 dark:bg-slate-900 border">
          <div className="text-xs text-slate-500 font-semibold uppercase">Total Baris Observasi</div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
            {wowRows.length.toLocaleString("id-ID")} <span className="text-xs font-normal text-slate-500">baris</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Siap diunggah ke Met Office</div>
        </Card>

        <Card className="p-4 bg-slate-50 dark:bg-slate-900 border">
          <div className="text-xs text-slate-500 font-semibold uppercase">Resolusi Interval</div>
          <div className="text-2xl font-black text-blue-600 mt-1">
            {intervalMin === "raw" ? "Mentah" : `${intervalMin} Menit`}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Sesuai standar AWS WOW</div>
        </Card>

        <Card className="p-4 bg-slate-50 dark:bg-slate-900 border">
          <div className="text-xs text-slate-500 font-semibold uppercase">Zona Waktu Output</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {useUtc ? "UTC (Zulu)" : "WIB (UTC+7)"}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Format: DD/MM/YYYY HH:mm</div>
        </Card>

        <Card className="p-4 bg-slate-50 dark:bg-slate-900 border">
          <div className="text-xs text-slate-500 font-semibold uppercase">Kelengkapan Header</div>
          <div className="text-2xl font-black text-indigo-600 mt-1">
            50 <span className="text-xs font-normal text-slate-500">Kolom</span>
          </div>
          <div className="text-[10px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> 100% WOW Spec Match
          </div>
        </Card>
      </div>

      {/* Interactive Data Table Preview & Guide Tabs */}
      <Card className="shadow-sm border-slate-200 dark:border-slate-800">
        <CardHeader className="p-4 pb-2 border-b">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-blue-600" />
                Pratinjau Data CSV WOW Met Office
              </CardTitle>
              <CardDescription className="text-xs">
                Memverifikasi struktur kolom dan nilai observasi sebelum mengunduh file CSV.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownloadCSV} 
                disabled={wowRows.length === 0}
                className="h-8 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-300"
              >
                <Download className="w-3.5 h-3.5 mr-1" /> Unduh CSV Lengkap
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="h-[260px] flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="text-xs">Mengagregasi dan memformat data observasi...</span>
            </div>
          ) : wowRows.length === 0 ? (
            <div className="h-[220px] flex flex-col items-center justify-center gap-2 text-slate-400">
              <FileSpreadsheet className="w-8 h-8 text-slate-300" />
              <span className="text-xs">Tidak ada data untuk ditampilkan. Silakan pilih rentang tanggal dan klik "Muat Ulang Observasi".</span>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[420px]">
              <table className="w-full text-xs text-left font-mono border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 sticky top-0 shadow-sm z-10">
                  <tr className="border-b divide-x divide-slate-200 dark:divide-slate-700">
                    <th className="px-3 py-2.5 font-bold">#</th>
                    <th className="px-3 py-2.5 font-bold whitespace-nowrap text-blue-600">Report Date / Time</th>
                    <th className="px-3 py-2.5 font-bold whitespace-nowrap text-orange-600">Air Temp (°C)</th>
                    <th className="px-3 py-2.5 font-bold whitespace-nowrap text-blue-500">Dew Point (°C)</th>
                    <th className="px-3 py-2.5 font-bold whitespace-nowrap text-emerald-600">Humidity (%)</th>
                    <th className="px-3 py-2.5 font-bold whitespace-nowrap text-violet-600">MSLP (hPa)</th>
                    <th className="px-3 py-2.5 font-bold whitespace-nowrap text-violet-500">Station Press (hPa)</th>
                    <th className="px-3 py-2.5 font-bold whitespace-nowrap text-sky-600">Rain Accum (mm)</th>
                    <th className="px-3 py-2.5 font-bold whitespace-nowrap text-sky-500">Rain Rate (mm/h)</th>
                    <th className="px-3 py-2.5 font-bold whitespace-nowrap">Wind Speed</th>
                    <th className="px-3 py-2.5 font-bold whitespace-nowrap">Wind Dir (°)</th>
                    <th className="px-3 py-2.5 font-bold whitespace-nowrap">Sunshine</th>
                    <th className="px-3 py-2.5 font-bold whitespace-nowrap">Soil Temp (°C)</th>
                    <th className="px-3 py-2.5 font-bold whitespace-nowrap text-slate-400">Site ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {wowRows.slice(0, 50).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors divide-x divide-slate-100 dark:divide-slate-800">
                      <td className="px-3 py-1.5 text-slate-400 text-[11px]">{idx + 1}</td>
                      <td className="px-3 py-1.5 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">{row[3]}</td>
                      <td className="px-3 py-1.5 text-orange-600 font-medium">{row[29] || "—"}</td>
                      <td className="px-3 py-1.5 text-blue-600">{row[32] || "—"}</td>
                      <td className="px-3 py-1.5 text-emerald-600 font-medium">{row[22] || "—"}</td>
                      <td className="px-3 py-1.5 text-violet-600">{row[20] || "—"}</td>
                      <td className="px-3 py-1.5 text-violet-500">{row[21] || "—"}</td>
                      <td className="px-3 py-1.5 text-sky-600">{row[24] || "—"}</td>
                      <td className="px-3 py-1.5 text-sky-500">{row[34] || "—"}</td>
                      <td className="px-3 py-1.5">{row[28] || "—"}</td>
                      <td className="px-3 py-1.5">{row[27] || "—"}</td>
                      <td className="px-3 py-1.5">{row[18] || "—"}</td>
                      <td className="px-3 py-1.5">{row[6] || "—"}</td>
                      <td className="px-3 py-1.5 text-slate-400 max-w-[120px] truncate">{row[1] || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {wowRows.length > 50 && (
                <div className="p-3 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 border-t">
                  Menampilkan 50 baris pertama dari total <strong>{wowRows.length.toLocaleString("id-ID")} baris</strong>. Klik "Unduh CSV Lengkap" untuk mengunduh seluruh baris.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Guide Card for UK Met Office WOW Upload */}
      <Card className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <CardContent className="p-4 text-xs text-slate-600 dark:text-slate-300 space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            Panduan Mengunggah CSV ke Portal WOW Met Office:
          </div>
          <ol className="list-decimal pl-5 space-y-1 leading-relaxed">
            <li>Buka portal resmi <strong>UK Met Office Weather Observations Website</strong> di <a href="https://wow.metoffice.gov.uk" target="_blank" rel="noreferrer" className="text-blue-600 underline font-medium inline-flex items-center gap-0.5">wow.metoffice.gov.uk <ExternalLink className="w-3 h-3" /></a>.</li>
            <li>Masuk (*Log In*) ke akun WOW Anda, lalu buka menu <strong>"Enter Data" &gt; "Bulk Upload"</strong>.</li>
            <li>Pilih file CSV yang baru saja Anda unduh dari halaman ini.</li>
            <li>Klik tombol <strong>"Upload Observations"</strong>. Sistem WOW Met Office akan memvalidasi 50 header kolom dan mengimpor seluruh data observasi ke jaringan cuaca global.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
