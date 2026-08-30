// components/climate-drivers/ClimateGlossary.tsx
"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Search, Sparkles, HelpCircle, Layers, Wind, Compass, Waves } from "lucide-react";

export interface GlossaryTerm {
  term: string;
  abbreviation?: string;
  category: "enso" | "mjo" | "iod" | "cams" | "era5";
  categoryLabel: string;
  definition: string;
  impactOrUse: string;
}

export const GLOSSARY_DATA: GlossaryTerm[] = [
  {
    term: "Oceanic Niño Index",
    abbreviation: "ONI",
    category: "enso",
    categoryLabel: "ENSO & Pasifik",
    definition: "Indeks utama NOAA untuk mengukur fase ENSO berbasis rata-rata berjalan 3 bulanan (3-month running mean) anomali suhu permukaan laut di wilayah Niño 3.4.",
    impactOrUse: "Kriteria resmi: ONI >= +0.5°C selama 5 periode berturut-turut diklasifikasikan sebagai El Niño; ONI <= -0.5°C diklasifikasikan sebagai La Niña."
  },
  {
    term: "Southern Oscillation Index",
    abbreviation: "SOI",
    category: "enso",
    categoryLabel: "ENSO & Pasifik",
    definition: "Indeks berbasis fluktuasi selisih tekanan udara permukaan laut antara Tahiti (Pasifik Tengah) dan Darwin (Australia Utara).",
    impactOrUse: "Nilai SOI negatif tajam (< -7) mengindikasikan El Niño (tekanan tinggi di Indonesia). Nilai SOI positif tajam (> +7) mengindikasikan La Niña."
  },
  {
    term: "SST Anomaly (Anomali Suhu Laut)",
    abbreviation: "SSTA",
    category: "enso",
    categoryLabel: "ENSO & Pasifik",
    definition: "Deviasi atau selisih antara suhu permukaan laut (Sea Surface Temperature) rata-rata terkini dibandingkan dengan iklim normal historis (1991–2020).",
    impactOrUse: "SST Anomali positif menandakan laut lebih hangat dari biasanya, meningkatkan penguapan dan potensi pembentukan awan hujan di wilayah tersebut."
  },
  {
    term: "Wilayah Niño (Niño 1+2, 3, 3.4, 4)",
    category: "enso",
    categoryLabel: "ENSO & Pasifik",
    definition: "Empat zona pemantauan suhu permukaan laut di sepanjang Pasifik Ekuatorial. Niño 1+2 (Amerika Selatan), Niño 3 (Pasifik Timur), Niño 3.4 (Pasifik Tengah-Timur), Niño 4 (Pasifik Tengah-Barat).",
    impactOrUse: "Niño 3.4 adalah indikator paling representatif untuk dampak ENSO global dan Indonesia."
  },
  {
    term: "Real-time Multivariate MJO Index",
    abbreviation: "RMM",
    category: "mjo",
    categoryLabel: "MJO & Gelombang Tropis",
    definition: "Indeks statistik berdimensi dua (RMM1 dan RMM2) berbasis kombinasi OLR dan angin zonal troposfer (850 hPa & 200 hPa) untuk mengacak pergerakan MJO.",
    impactOrUse: "Amplitudo RMM > 1.0 menandakan sinyal MJO aktif. Lokasi MJO dipetakan ke dalam 8 fase geografis."
  },
  {
    term: "Fase 4 & 5 MJO (Maritime Continent)",
    category: "mjo",
    categoryLabel: "MJO & Gelombang Tropis",
    definition: "Kondisi di mana pusat gugus awan konvektif aktif MJO melintas tepat di atas wilayah Benua Maritim Indonesia (Maritime Continent).",
    impactOrUse: "Meningkatkan pembentukan awan Cumulonimbus, curah hujan ekstrem, dan risiko banjir/tanah longsor di wilayah Indonesia."
  },
  {
    term: "Outgoing Longwave Radiation",
    abbreviation: "OLR",
    category: "mjo",
    categoryLabel: "MJO & Gelombang Tropis",
    definition: "Radiasi gelombang panjang infra merah yang dipancarkan puncak awan atau bumi ke angkasa luar.",
    impactOrUse: "Anomali OLR negatif (rendah) menandakan puncak awan konvektif yang sangat tinggi dan tebal (indikator hujan lebat)."
  },
  {
    term: "Dipole Mode Index",
    abbreviation: "DMI",
    category: "iod",
    categoryLabel: "IOD & Samudra Hindia",
    definition: "Indeks selisih anomali suhu permukaan laut antara Samudra Hindia Barat Tropis (50°E-70°E) dan Samudra Hindia Tenggara (90°E-110°E, dekat Jawa/Sumatra).",
    impactOrUse: "DMI > +0.4°C = IOD Positif (Indonesia lebih kering); DMI < -0.4°C = IOD Negatif (Indonesia lebih basah)."
  },
  {
    term: "IOD Positif vs IOD Negatif",
    category: "iod",
    categoryLabel: "IOD & Samudra Hindia",
    definition: "Fenomena dipol iklim Samudra Hindia. IOD Positif terjadi saat perairan barat hangat & timur dingin. IOD Negatif terjadi saat perairan selatan Jawa/Sumatra jauh lebih hangat.",
    impactOrUse: "IOD Positif memicu kemarau panjang di Indonesia. IOD Negatif memicu musim hujan basah dan peningkatan konveksi laut Samudra Hindia."
  },
  {
    term: "Aerosol Optical Depth",
    abbreviation: "AOD",
    category: "cams",
    categoryLabel: "Kualitas Udara / CAMS",
    definition: "Ukuran kuantitatif seberapa banyak sinar matahari yang terserap atau terhamburkan oleh partikel aerosol (debu, asap, polutan, garam laut) di seluruh kolom atmosfer.",
    impactOrUse: "AOD < 0.10 = Udara sangat bersih; AOD 0.25–0.50 = Sedang/Tercemar; AOD > 0.50 = Kabut asap / polusi udara pekat berbahaya."
  },
  {
    term: "Dust Aerosol Optical Depth",
    category: "cams",
    categoryLabel: "Kualitas Udara / CAMS",
    definition: "Komponen AOD khusus yang mengukur ketebalan optik partikel debu mineral tanah yang terangkat oleh angin kencang.",
    impactOrUse: "Penting untuk memantau pasokan debu gurun atau abu vulkanik yang memengaruhi visibilitas penerbangan dan pernapasan."
  },
  {
    term: "Copernicus Atmosphere Monitoring Service",
    abbreviation: "CAMS",
    category: "cams",
    categoryLabel: "Kualitas Udara / CAMS",
    definition: "Layanan analisis dan prakiraan atmosfer global Uni Eropa berbasis ECMWF yang menyediakan data real-time kualitas udara, ozon, aerosol, dan gas rumah kaca.",
    impactOrUse: "Memberikan prediksi 5 hari ke depan untuk distribusi debu, polusi udara, dan ketebalan aerosol di seluruh wilayah Asia Tenggara."
  },
  {
    term: "Reanalisis Atmosfer (Atmospheric Reanalysis)",
    category: "era5",
    categoryLabel: "ERA5 & Klimatologi",
    definition: "Metode sains iklim yang menggabungkan model prediksi cuaca numerik (NWP) dengan miliaran data pengamatan historis nyata (satelit, stasiun, radar, balon cuaca) menggunakan algoritma asimilasi data 4D-Var.",
    impactOrUse: "Menghasilkan rekam jejak iklim masa lalu yang konsisten tanpa celah data spasial atau temporal."
  },
  {
    term: "ERA5 Reanalysis",
    category: "era5",
    categoryLabel: "ERA5 & Klimatologi",
    definition: "Dataset reanalisis atmosfer global generasi kelima besutan ECMWF (European Centre for Medium-Range Weather Forecasts) dari tahun 1940 hingga sekarang.",
    impactOrUse: "Menyediakan data observasi iklim jam-jaman (hourly) beresolusi tinggi (~31 km) untuk parameter angin, curah hujan, suhu, dan kelembapan."
  }
];

interface ClimateGlossaryProps {
  initialCategory?: "all" | "enso" | "mjo" | "iod" | "cams" | "era5";
}

export const ClimateGlossary: React.FC<ClimateGlossaryProps> = ({
  initialCategory = "all",
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);

  const categories = [
    { id: "all", label: "Semua Istilah", icon: Layers },
    { id: "enso", label: "ENSO", icon: Waves },
    { id: "mjo", label: "MJO", icon: Wind },
    { id: "iod", label: "IOD", icon: Compass },
    { id: "cams", label: "Air Quality / CAMS", icon: Sparkles },
    { id: "era5", label: "ERA5", icon: BookOpen },
  ];

  const filteredTerms = useMemo(() => {
    return GLOSSARY_DATA.filter((item) => {
      const matchCategory = selectedCategory === "all" || item.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !searchQuery ||
        item.term.toLowerCase().includes(q) ||
        (item.abbreviation && item.abbreviation.toLowerCase().includes(q)) ||
        item.definition.toLowerCase().includes(q) ||
        item.impactOrUse.toLowerCase().includes(q);
      return matchCategory && matchSearch;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
      <CardHeader className="pb-3 border-b dark:border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <BookOpen className="h-5 w-5 text-indigo-500" /> Glosarium &amp; Ensiklopedia Iklim
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Kamus sains meteorologi &amp; klimatologi lengkap untuk memahami parameter dan indeks resmi
            </CardDescription>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Cari istilah (e.g. ONI, MJO, AOD)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 pt-3 overflow-x-auto no-scrollbar">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {filteredTerms.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            <HelpCircle className="h-8 w-8 text-slate-400 mx-auto mb-2 opacity-50" />
            Tidak ditemukan istilah yang sesuai dengan pencarian &quot;{searchQuery}&quot;.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTerms.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 space-y-2 hover:border-indigo-300 dark:hover:border-indigo-800 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {item.term}
                    </h4>
                    {item.abbreviation && (
                      <Badge variant="outline" className="text-[10px] font-mono bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                        {item.abbreviation}
                      </Badge>
                    )}
                  </div>
                  <Badge className="text-[9px] uppercase font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                    {item.categoryLabel}
                  </Badge>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {item.definition}
                </p>

                <div className="p-2.5 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-[11px] text-indigo-900 dark:text-indigo-200">
                  <span className="font-bold">Dampak &amp; Kegunaan:</span> {item.impactOrUse}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
