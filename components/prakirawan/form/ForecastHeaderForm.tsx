"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Plus,
  Save,
  Download,
  Share2,
  Send,
  ExternalLink,
  ChevronDown,
  Calendar,
  Copy,
  Sparkles,
  MessageSquare,
  Check,
  MapPin,
  Search,
  Loader2,
  ChevronsUpDown,
  X,
  LocateFixed,
  DatabaseZap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { INDONESIA_POPULAR_LOCATIONS, searchOpenMeteoLocations } from "@/lib/forecast/locationPresets";

interface ForecastHeaderFormProps {
  location: string;
  selectedCoords: { lat: number; lon: number };
  forecastSource: string;
  targetDateMode: "today" | "tomorrow" | "dayAfter" | "custom";
  customTargetDate: string;
  targetDateIsoStr: string;
  forecastDisplayDateStr: string;
  notes: string;
  autoNarrative: string;
  copiedNarrative: boolean;
  loadingFetch: boolean;
  saving: boolean;
  isSharing: boolean;
  onLocationSelect: (loc: { name: string; region?: string; lat: number; lon: number }) => void;
  onCustomTypedLocation: (customName: string) => void;
  onUseCurrentGPS: () => void;
  onForecastSourceChange: (source: string) => void;
  onTargetDateModeChange: (mode: "today" | "tomorrow" | "dayAfter" | "custom") => void;
  onCustomTargetDateChange: (date: string) => void;
  onNotesChange: (notes: string) => void;
  onApplyNarrativeToNotes: () => void;
  onCopyNarrative: () => void;
  onAddRow: () => void;
  onFetchConsensus: () => void;
  onSaveAsImage: () => void;
  onShareSocial: (target: "native" | "whatsapp" | "twitter" | "clipboard") => void;
  onSaveForecast: () => void;
}

export function ForecastHeaderForm({
  location,
  selectedCoords,
  forecastSource,
  targetDateMode,
  customTargetDate,
  targetDateIsoStr,
  forecastDisplayDateStr,
  notes,
  autoNarrative,
  copiedNarrative,
  loadingFetch,
  saving,
  isSharing,
  onLocationSelect,
  onCustomTypedLocation,
  onUseCurrentGPS,
  onForecastSourceChange,
  onTargetDateModeChange,
  onCustomTargetDateChange,
  onNotesChange,
  onApplyNarrativeToNotes,
  onCopyNarrative,
  onAddRow,
  onFetchConsensus,
  onSaveAsImage,
  onShareSocial,
  onSaveForecast,
}: ForecastHeaderFormProps) {
  const [isLocationOpen, setIsLocationOpen] = React.useState(false);
  const [searchLocationQuery, setSearchLocationQuery] = React.useState("");
  const [isSearchingLocation, setIsSearchingLocation] = React.useState(false);
  const [locationSuggestions, setLocationSuggestions] = React.useState<any[]>([]);

  React.useEffect(() => {
    const q = searchLocationQuery.trim();
    if (q.length < 2) {
      setLocationSuggestions([]);
      setIsSearchingLocation(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingLocation(true);
      try {
        const results = await searchOpenMeteoLocations(q);
        setLocationSuggestions(results);
      } catch (err) {
        console.error("Geocoding search error:", err);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchLocationQuery]);

  const handleSelectLoc = (loc: { name: string; region?: string; lat: number; lon: number }) => {
    setIsLocationOpen(false);
    setSearchLocationQuery("");
    setLocationSuggestions([]);
    onLocationSelect(loc);
  };

  const handleSelectCustomTyped = (customName: string) => {
    setIsLocationOpen(false);
    setSearchLocationQuery("");
    setLocationSuggestions([]);
    onCustomTypedLocation(customName);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="space-y-4 flex-1">
        <div>
          <h2 className="text-xl font-bold">Input Prakiraan Cuaca</h2>
          <p className="text-muted-foreground">Isi data di bawah untuk menghasilkan tabel outlook grafis.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border">
          {/* DROPDOWN SEARCH LOCATION & KOTA */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-rose-500" />
                Lokasi / Kota
              </label>
              <span className="text-[10px] font-mono text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                {selectedCoords.lat.toFixed(2)}°, {selectedCoords.lon.toFixed(2)}°
              </span>
            </div>

            <Popover open={isLocationOpen} onOpenChange={setIsLocationOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={isLocationOpen}
                  className="w-full justify-between font-normal text-left h-10 px-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80"
                >
                  <div className="flex items-center gap-2 truncate">
                    <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                    <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {location || "Pilih atau cari kota..."}
                    </span>
                  </div>
                  <ChevronsUpDown className="w-4 h-4 shrink-0 opacity-50 ml-1" />
                </Button>
              </PopoverTrigger>

              <PopoverContent className="w-[320px] sm:w-[380px] p-2.5 z-50 shadow-xl" align="start">
                {/* Search Input Box */}
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Cari kota, kabupaten, kecamatan... (e.g. Bandung, Surabaya)"
                    value={searchLocationQuery}
                    onChange={(e) => setSearchLocationQuery(e.target.value)}
                    className="pl-8 pr-8 text-xs h-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    autoFocus
                  />
                  {searchLocationQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchLocationQuery("");
                        setLocationSuggestions([]);
                      }}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* GPS Quick Action */}
                <div className="mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={onUseCurrentGPS}
                    className="h-7 px-2 text-[11px] text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 w-full justify-start font-medium"
                  >
                    <LocateFixed className="w-3.5 h-3.5 mr-1.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    Gunakan Lokasi GPS Saya Saat Ini
                  </Button>
                </div>

                {/* Loading state */}
                {isSearchingLocation && (
                  <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                    Mencari wilayah di Indonesia &amp; dunia...
                  </div>
                )}

                {/* Geocoding Search Results */}
                {!isSearchingLocation && locationSuggestions.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">
                      Hasil Pencarian ({locationSuggestions.length})
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1">
                      {locationSuggestions.map((place, idx) => (
                        <button
                          key={`${place.id || idx}-${place.latitude}`}
                          type="button"
                          onClick={() =>
                            handleSelectLoc({
                              name: place.name,
                              region: [place.admin2, place.admin1, place.country].filter(Boolean).join(", "),
                              lat: place.latitude,
                              lon: place.longitude,
                            })
                          }
                          className="w-full text-left px-2.5 py-1.5 rounded hover:bg-blue-50 dark:hover:bg-slate-800 flex items-center justify-between group transition text-xs"
                        >
                          <div className="truncate pr-2">
                            <div className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                              {place.name}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {[place.admin2, place.admin1, place.country].filter(Boolean).join(", ")}
                            </div>
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 shrink-0 bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded">
                            {place.latitude.toFixed(2)}°, {place.longitude.toFixed(2)}°
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty Search Result Fallback */}
                {!isSearchingLocation && searchLocationQuery.trim().length >= 2 && locationSuggestions.length === 0 && (
                  <div className="text-center py-4 text-xs text-muted-foreground">
                    Lokasi &quot;{searchLocationQuery}&quot; tidak ditemukan.
                    <div className="mt-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => handleSelectCustomTyped(searchLocationQuery)}
                      >
                        Gunakan &quot;{searchLocationQuery}&quot;
                      </Button>
                    </div>
                  </div>
                )}

                {/* Preset List (Default when not searching) */}
                {(!searchLocationQuery || searchLocationQuery.trim().length < 2) && (
                  <div>
                    <div className="text-[10px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider flex items-center justify-between">
                      <span>Kota &amp; Stasiun Populer</span>
                      <span className="text-[9px] text-blue-500">1-Klik Pilih</span>
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1">
                      {INDONESIA_POPULAR_LOCATIONS.map((preset) => {
                        const isSelected = location.toLowerCase() === preset.name.toLowerCase();
                        return (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => handleSelectLoc(preset)}
                            className={cn(
                              "w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between text-xs transition",
                              isSelected
                                ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-medium"
                                : "hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200"
                            )}
                          >
                            <div className="truncate pr-2">
                              <div className="font-semibold">{preset.name}</div>
                              <div className="text-[10px] text-slate-400">{preset.region}</div>
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 shrink-0">
                              {preset.lat.toFixed(2)}°, {preset.lon.toFixed(2)}°
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold">Sumber Prakiraan</label>
            <Select value={forecastSource} onValueChange={onForecastSourceChange}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih Sumber" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Multi-Model Consensus">Multi-Model + Google WeatherNext Consensus</SelectItem>
                <SelectItem value="Google WeatherNext 2">Google WeatherNext 2 (DeepMind AI)</SelectItem>
                <SelectItem value="ECMWF AIFS">ECMWF AIFS (AI Model)</SelectItem>
                <SelectItem value="ECMWF">ECMWF IFS (Eropa)</SelectItem>
                <SelectItem value="GFS">NOAA GFS (AS)</SelectItem>
                <SelectItem value="ICON">DWD ICON (Jerman)</SelectItem>
                <SelectItem value="Manual Analysis">Manual Analysis</SelectItem>
                <SelectItem value="Open-Meteo">Open-Meteo (Single Model)</SelectItem>
                <SelectItem value="Hybrid">Hybrid / Ensemble</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* TARGET TANGGAL PRAKIRAAN */}
          <div className="space-y-1.5 lg:col-span-2">
            <div className="flex flex-wrap justify-between items-center gap-1.5">
              <label className="text-sm font-semibold flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                <Calendar className="w-4 h-4 text-blue-600" /> Target Tanggal Prakiraan
              </label>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                {forecastDisplayDateStr}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant={targetDateMode === "today" ? "default" : "outline"}
                onClick={() => onTargetDateModeChange("today")}
                className={cn("h-8 text-xs font-medium", targetDateMode === "today" ? "bg-blue-600 text-white" : "")}
              >
                Hari Ini
              </Button>
              <Button
                type="button"
                size="sm"
                variant={targetDateMode === "tomorrow" ? "default" : "outline"}
                onClick={() => onTargetDateModeChange("tomorrow")}
                className={cn("h-8 text-xs font-medium", targetDateMode === "tomorrow" ? "bg-blue-600 text-white" : "")}
              >
                Besok
              </Button>
              <Button
                type="button"
                size="sm"
                variant={targetDateMode === "dayAfter" ? "default" : "outline"}
                onClick={() => onTargetDateModeChange("dayAfter")}
                className={cn("h-8 text-xs font-medium", targetDateMode === "dayAfter" ? "bg-blue-600 text-white" : "")}
              >
                Lusa
              </Button>
              <div className="flex items-center gap-1 flex-1 min-w-[140px]">
                <Input
                  type="date"
                  value={customTargetDate || targetDateIsoStr}
                  onChange={(e) => {
                    onCustomTargetDateChange(e.target.value);
                    onTargetDateModeChange("custom");
                  }}
                  className={cn(
                    "h-8 text-xs font-mono",
                    targetDateMode === "custom" ? "border-blue-500 ring-1 ring-blue-500" : ""
                  )}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1 lg:col-span-4">
            <label className="text-sm font-semibold">Catatan / Diskusi Prakirawan</label>
            <Textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Tuliskan analisis cuaca di sini..."
              className="h-10 resize-none"
            />
          </div>

          {/* RINGKASAN PROSPEK CUACA OTOMATIS */}
          <div className="space-y-1.5 lg:col-span-4 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Ringkasan Prospek Cuaca
              </label>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={onApplyNarrativeToNotes}
                  className="h-7 px-2 text-[11px] text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/50"
                >
                  <MessageSquare className="w-3 h-3 mr-1" /> Gunakan di Catatan
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={onCopyNarrative}
                  className="h-7 px-2.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
                >
                  {copiedNarrative ? <Check className="w-3 h-3 mr-1 text-emerald-300" /> : <Copy className="w-3 h-3 mr-1" />}
                  {copiedNarrative ? "Tersalin!" : "Salin Teks"}
                </Button>
              </div>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 p-2.5 rounded border border-slate-200 dark:border-slate-800 font-sans leading-relaxed select-all">
              {autoNarrative}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 md:max-w-[210px]">
        <Button variant="default" size="sm" onClick={onAddRow} className="bg-blue-600 hover:bg-blue-700 w-full">
          <Plus className="w-4 h-4 mr-1" /> Tambah Jam
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={onFetchConsensus}
          className="bg-indigo-600 hover:bg-indigo-700 w-full"
          disabled={loadingFetch}
        >
          <DatabaseZap className="w-4 h-4 mr-1" /> {loadingFetch ? "Mengambil..." : "Ambil Otomatis"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onSaveAsImage}
          className="border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 w-full"
        >
          <Download className="w-4 h-4 mr-1 text-slate-600 dark:text-slate-400" /> Unduh Gambar (PNG)
        </Button>

        {/* TOMBOL BAGIKAN KE MEDSOS & NATIVE SHARE */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="default"
              size="sm"
              disabled={isSharing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white w-full shadow-sm flex items-center justify-between"
            >
              <span className="flex items-center">
                <Share2 className="w-4 h-4 mr-1.5" />
                {isSharing ? "Menyiapkan..." : "Bagikan Medsos"}
              </span>
              <ChevronDown className="w-3.5 h-3.5 opacity-80" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60 shadow-lg border border-slate-200 dark:border-slate-800">
            <DropdownMenuItem onClick={() => onShareSocial("native")} className="cursor-pointer py-2">
              <Share2 className="w-4 h-4 mr-2 text-emerald-600" />
              <div>
                <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">Bagikan Cepat (HP / Medsos)</div>
                <div className="text-[10px] text-muted-foreground">Kirim ke Status WA, IG Stories, dll.</div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onShareSocial("clipboard")} className="cursor-pointer py-2">
              <Copy className="w-4 h-4 mr-2 text-blue-600" />
              <div>
                <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">Salin Gambar (Clipboard)</div>
                <div className="text-[10px] text-muted-foreground">Siap tempel (Ctrl + V) di mana saja</div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onShareSocial("whatsapp")} className="cursor-pointer py-2">
              <Send className="w-4 h-4 mr-2 text-green-600" />
              <div>
                <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">Kirim via WhatsApp Web</div>
                <div className="text-[10px] text-muted-foreground">Buka chat WA + auto-copy gambar</div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onShareSocial("twitter")} className="cursor-pointer py-2">
              <ExternalLink className="w-4 h-4 mr-2 text-sky-500" />
              <div>
                <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">Posting ke X (Twitter)</div>
                <div className="text-[10px] text-muted-foreground">Buka tweet draft + auto-copy gambar</div>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button onClick={onSaveForecast} disabled={saving} className="w-full mt-3 bg-indigo-600 hover:bg-indigo-700">
          <Save className="w-4 h-4 mr-1" /> {saving ? "Menyimpan..." : "Simpan Prakiraan"}
        </Button>
      </div>
    </div>
  );
}
