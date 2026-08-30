// components/indeks-monsun/MonsoonScientificGuide.tsx
"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  ArrowRightLeft,
  CheckCircle2,
  Wind,
  Compass,
  Activity,
  ShieldAlert,
  Globe,
  CloudRain,
  Waves,
  Sparkles,
  Layers,
} from "lucide-react";

export const MonsoonScientificGuide: React.FC = () => {
  const guideItems = [
    {
      id: "ausmi",
      number: "1",
      name: "AUSMI (Australian Monsoon Index)",
      author: "Wang & Fan (2001)",
      formula: "U850 pada koordinat 5°S–15°S, 110°E–130°E (selatan Jawa–Bali–Nusa Tenggara–Laut Timor)",
      icon: Wind,
      badgeText: "Belahan Bumi Selatan",
      positiveState: {
        title: "KONDISI POSITIF: Saat U > +2.0 m/s (Aliran Angin Baratan Aktif Kuat)",
        badge: "Positif",
        badgeColor: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-bold",
        points: [
          "Massa udara basah dari Samudra Hindia dan Asia ditarik kuat melintasi Laut Jawa dan kepulauan Nusa Tenggara.",
          "Menandai Puncak Musim Hujan di Jawa, Bali, NTB, dan NTT pada periode Desember–Februari (DJF).",
          "Meningkatkan risiko bencana hidrometeorologi basah (banjir, tanah longsor) dan gelombang tinggi di perairan selatan Indonesia.",
        ],
      },
      negativeState: {
        title: "KONDISI NEGATIF: Saat U < -2.0 m/s (Aliran Angin Pasat Timuran)",
        badge: "Negatif",
        badgeColor: "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-bold",
        points: [
          "Monsun Australia berganti menjadi aliran angin pasat timuran dari daratan benua Australia yang kering dan dingin.",
          "Memicu Musim Kemarau di Jawa hingga Nusa Tenggara pada periode Juni–September (JJA).",
          "Pembentukan awan hujan tertekan drastis, kelembapan udara turun tajam, dan suhu malam hari terasa dingin menyengat (fenomena bediding).",
        ],
      },
    },
    {
      id: "wnpmi",
      number: "2",
      name: "WNPMI (Western North Pacific Monsoon Index)",
      author: "Wang & Fan (2001)",
      formula: "U850 (5°N–15°N, 100°E–130°E) dikurangi U850 (20°N–30°N, 110°E–140°E)",
      icon: Compass,
      badgeText: "Pasifik Barat Laut & Filipina",
      positiveState: {
        title: "KONDISI POSITIF: Saat Nilai > +2.0 m/s (Palung Monsun Aktif Kuat)",
        badge: "Positif",
        badgeColor: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-bold",
        points: [
          "Sirkulasi siklonik raksasa terbentuk di Laut Filipina dan Pasifik Barat Laut (periode puncak Juli–September).",
          "Bertindak sebagai 'pompa raksasa' yang menarik massa udara dari selatan ekuator ke utara, memperkuat angin timuran kering di Indonesia selatan.",
          "Sering memicu pembentukan bibit siklon tropis di utara Filipina yang menimbulkan angin kencang di Sulawesi Utara dan Maluku Utara.",
        ],
      },
      negativeState: {
        title: "KONDISI NEGATIF: Saat Nilai < -2.0 m/s (Palung Melemah / Sirkulasi Tenang)",
        badge: "Negatif",
        badgeColor: "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-bold",
        points: [
          "Palung monsun Pasifik Barat Laut melemah atau menghilang (periode musim dingin belahan utara).",
          "Tarikan udara ke utara mereda, memungkinkan sabuk awan konvektif dan ITCZ bergeser turun kembali ke wilayah kepulauan Indonesia.",
        ],
      },
    },
    {
      id: "scsmi",
      number: "3",
      name: "SCSMI (South China Sea Monsoon Index)",
      author: "Wang et al. (2004)",
      formula: "U850 pada koordinat 5°N–15°N, 110°E–120°E (Laut Cina Selatan)",
      icon: Activity,
      badgeText: "Laut Cina Selatan",
      positiveState: {
        title: "KONDISI POSITIF: Saat U > +2.0 m/s (Aliran Angin Baratan LCS)",
        badge: "Positif",
        badgeColor: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-bold",
        points: [
          "Pembalikan arah angin dari timuran menjadi baratan di Laut Cina Selatan menandai Onset Resmi Monsun Musim Panas Asia Tenggara (pertengahan Mei).",
          "Pasokan uap air meningkat pesat di wilayah Natuna, Selat Karimata, dan Kalimantan Barat.",
        ],
      },
      negativeState: {
        title: "KONDISI NEGATIF: Saat U < -2.0 m/s (Aliran Angin Timuran LCS)",
        badge: "Negatif",
        badgeColor: "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-bold",
        points: [
          "Didominasi aliran angin timuran stabil dari wilayah antisiklon subtropis Pasifik.",
          "Menandakan periode musim dingin belahan utara atau fase pra-onset dengan kondisi cuaca relatif kering di wilayah Laut Cina Selatan.",
        ],
      },
    },
    {
      id: "csi",
      number: "4",
      name: "CSI (Cold Surge Index)",
      author: "Chang et al. (2005) / Standar BMKG",
      formula: "Komponen angin meridional V925 pada 10°N–15°N, 110°E–115°E (Laut Cina Selatan)",
      icon: ShieldAlert,
      badgeText: "Peringatan Banjir Pantura",
      positiveState: {
        title: "KONDISI POSITIF / AKTIF EKSTREM: Saat Terjadi Seruakan Dingin (V ≤ -8.0 m/s)",
        badge: "Positif",
        badgeColor: "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-500 font-bold animate-pulse",
        points: [
          "Aliran massa udara beku bertekanan tinggi dari daratan Siberia meluncur cepat menyeberangi ekuator menuju Laut Jawa.",
          "Memicu tabrakan massa udara (konvergensi masif) di atas Jawa bagian barat dan tengah.",
          "Pemicu utama hujan lebat berhari-hari dan banjir besar di Jabodetabek dan Pantura Jawa pada Januari–Februari.",
        ],
      },
      negativeState: {
        title: "KONDISI NETRAL / TENANG: Saat V > -5.0 m/s (Aliran Normal)",
        badge: "Netral",
        badgeColor: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700",
        points: [
          "Aliran angin dari belahan bumi utara stabil pada kecepatan normal tanpa adanya dorongan massa udara beku.",
          "Risiko cuaca ekstrem berskala luas akibat faktor eksternal Siberia berada pada level rendah.",
        ],
      },
    },
    {
      id: "wyi",
      number: "5",
      name: "WYI (Webster-Yang Monsoon Index)",
      author: "Webster & Yang (1992)",
      formula: "Geser angin vertikal zonal U850 - U200 pada 0°–20°N, 40°E–110°E (Asia Selatan–Samudra Hindia)",
      icon: Globe,
      badgeText: "Sirkulasi Makro Asia",
      positiveState: {
        title: "KONDISI POSITIF: Saat Geser Vertikal Zonal Kuat (U850 - U200 > 0)",
        badge: "Positif",
        badgeColor: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-bold",
        points: [
          "Pemanasan termal daratan benua Asia sangat intensif dibandingkan Samudra Hindia tropis.",
          "Sirkulasi monsun musim panas Asia secara makro berjalan dengan kapasitas penuh mendukung pasokan sirkulasi regional.",
        ],
      },
      negativeState: {
        title: "KONDISI NEGATIF: Saat Geser Vertikal Zonal Lemah",
        badge: "Negatif",
        badgeColor: "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-bold",
        points: [
          "Gradien termal daratan-samudra melemah, menandakan sirkulasi musiman transisi atau tertekan.",
        ],
      },
    },
    {
      id: "sasmi",
      number: "6",
      name: "SASMI (South Asian Summer Monsoon Index)",
      author: "Goswami et al. (1999)",
      formula: "Geser angin meridional V850 - V200 pada 10°N–30°N, 70°E–110°E (Teluk Benggala–India)",
      icon: CloudRain,
      badgeText: "Teluk Benggala & Sumatra Utara",
      positiveState: {
        title: "KONDISI POSITIF: Saat Sirkulasi Meridional V Aktif Kuat",
        badge: "Positif",
        badgeColor: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-bold",
        points: [
          "Pelepasan panas laten dan sirkulasi lokal Hadley sangat aktif di Teluk Benggala.",
          "Meningkatkan suplai uap air dan curah hujan konvektif di wilayah Sumatra bagian utara, Selat Malaka, dan Aceh.",
        ],
      },
      negativeState: {
        title: "KONDISI NEGATIF: Saat Sirkulasi Meridional Lemah",
        badge: "Negatif",
        badgeColor: "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-bold",
        points: [
          "Konveksi di Teluk Benggala tertekan, curah hujan di Sumatra bagian utara cenderung normal atau menurun.",
        ],
      },
    },
    {
      id: "easmi",
      number: "7",
      name: "EASMI (East Asian Summer Monsoon Index)",
      author: "Zhang et al. (2003) / Wang et al. (2008)",
      formula: "Geser angin musiman di Laut Cina Timur pada 20°N–40°N, 110°E–130°E",
      icon: Waves,
      badgeText: "Asia Timur & Sabuk Meiyu",
      positiveState: {
        title: "KONDISI POSITIF: Saat Monsun Musim Panas Asia Timur Kuat",
        badge: "Positif",
        badgeColor: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-bold",
        points: [
          "Aliran angin selatan membawa kelembapan dari Pasifik menuju daratan Tiongkok timur dan Jepang.",
          "Sabuk konvergensi stasioner (Meiyu di Tiongkok, Baiu di Jepang) aktif menghasilkan hujan lebat musiman.",
        ],
      },
      negativeState: {
        title: "KONDISI NEGATIF: Saat Monsun Melemah",
        badge: "Negatif",
        badgeColor: "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-bold",
        points: [
          "Sabuk hujan subtropis tertahan di lintang selatan atau menghilang.",
        ],
      },
    },
    {
      id: "bsiso1",
      number: "8",
      name: "BSISO1 (Boreal Summer Intraseasonal Oscillation 1)",
      author: "Lee et al. (2013) / APCC",
      formula: "Komponen EOF1-2 anomali OLR dan U850 (Siklus 30–60 hari, perambatan utara)",
      icon: Layers,
      badgeText: "Osilasi Intraseasonal 30–60 Hari",
      positiveState: {
        title: "KONDISI POSITIF: Saat Amplitudo BSISO1 ≥ 1.0 (Propagasi Monsun ke Utara Aktif)",
        badge: "Positif",
        badgeColor: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-bold",
        points: [
          "Sabuk awan konvektif monsun merambat teratur ke arah utara (northward propagation) dari Samudra Hindia melintasi Selat Malaka, Laut Cina Selatan, dan Filipina.",
          "Fase 1–3: Peningkatan curah hujan signifikan di barat Sumatra, Riau, dan Kalimantan Barat.",
          "Fase 4–5: Puncak curah hujan monsun di Laut Cina Selatan, Kalimantan Utara, dan Sulawesi Utara.",
        ],
      },
      negativeState: {
        title: "KONDISI NETRAL: Saat Amplitudo BSISO1 < 1.0 (Inaktif)",
        badge: "Netral",
        badgeColor: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700",
        points: [
          "Osilasi intraseasonal 30–60 hari berada di dalam lingkaran batas netral (tidak ada gelombang propagasi yang terorganisir).",
          "Variabilitas cuaca harian lebih banyak dikendalikan oleh dinamika lokal dan angin darat-laut.",
        ],
      },
    },
    {
      id: "bsiso2",
      number: "9",
      name: "BSISO2 (Boreal Summer Intraseasonal Oscillation 2)",
      author: "Lee et al. (2013) / APCC",
      formula: "Komponen EOF3-4 anomali OLR dan U850 (Siklus kuasi dua-mingguan 10–23 hari)",
      icon: Sparkles,
      badgeText: "Osilasi Kuasi 2-Mingguan / Onset",
      positiveState: {
        title: "KONDISI POSITIF: Saat Amplitudo BSISO2 ≥ 1.0 (Pemicu Onset & Fluktuasi Sub-Musiman)",
        badge: "Positif",
        badgeColor: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-bold",
        points: [
          "Gelombang atmosfer berosilasi cepat dalam rentang 10–23 hari melintasi Laut Arab, Teluk Benggala, dan Laut Cina Selatan.",
          "Berperan sebagai 'pemicu detonator' (trigger) yang mempercepat tibanya awal musim hujan (Onset) di kawasan monsun Asia Tenggara.",
          "Memicu episode hujan lebat berdurasi pendek (short-duration heavy rainfall surges) di kepulauan Indonesia bagian utara.",
        ],
      },
      negativeState: {
        title: "KONDISI NETRAL: Saat Amplitudo BSISO2 < 1.0 (Inaktif)",
        badge: "Netral",
        badgeColor: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700",
        points: [
          "Gelombang osilasi kuasi dua-mingguan dalam kondisi tenang.",
          "Tidak ada dorongan trigger sub-musiman jangka pendek.",
        ],
      },
    },
  ];

  return (
    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
      <CardHeader className="pb-3 border-b dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-teal-500" /> Panduan &amp; Penjelasan Ilmiah 7 Indeks Monsun + 2 BSISO
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Format terstruktur per indeks dengan tata letak atas-bawah (Atas: Kondisi Positif vs Bawah: Kondisi Negatif / Netral)
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs font-bold text-teal-600 dark:text-teal-400 border-teal-300 dark:border-teal-800 self-start sm:self-auto">
            <ArrowRightLeft className="h-3 w-3 mr-1" /> Analisis Dual-Polaritas Atas-Bawah
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {guideItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-4 hover:border-teal-300 dark:hover:border-teal-800 transition duration-200"
            >
              {/* Header Title Bar per Indeks */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 font-black text-sm">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span>{item.number}.</span> {item.name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Rujukan Ilmiah: <strong>{item.author}</strong> | Wilayah: {item.formula}
                    </p>
                  </div>
                </div>
                <Badge className="text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 self-start sm:self-auto shrink-0">
                  {item.badgeText}
                </Badge>
              </div>

              {/* SUSUNAN ATAS - BAWAH */}
              <div className="space-y-3">
                {/* 1. BAGIAN ATAS: KONDISI POSITIF */}
                <div className="p-4 rounded-xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/40 dark:bg-teal-950/20 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <span className="text-xs font-black text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                      <span className="p-1 bg-teal-600 text-white rounded-md text-[10px] font-black leading-none">ATAS</span>
                      <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
                      {item.positiveState.title}
                    </span>
                    <Badge variant="outline" className={`text-[10px] font-bold self-start sm:self-auto shrink-0 ${item.positiveState.badgeColor}`}>
                      {item.positiveState.badge}
                    </Badge>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 pl-1">
                    {item.positiveState.points.map((pt, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-2 leading-relaxed">
                        <span className="text-teal-600 font-bold shrink-0 mt-0.5">•</span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 2. BAGIAN BAWAH: KONDISI NEGATIF / BERKEBALIKAN */}
                <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <span className="text-xs font-black text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <span className="p-1 bg-amber-600 text-white rounded-md text-[10px] font-black leading-none">BAWAH</span>
                      <ArrowRightLeft className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      {item.negativeState.title}
                    </span>
                    <Badge variant="outline" className={`text-[10px] font-bold self-start sm:self-auto shrink-0 ${item.negativeState.badgeColor}`}>
                      {item.negativeState.badge}
                    </Badge>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 pl-1">
                    {item.negativeState.points.map((pt, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-2 leading-relaxed">
                        <span className="text-amber-600 font-bold shrink-0 mt-0.5">•</span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
