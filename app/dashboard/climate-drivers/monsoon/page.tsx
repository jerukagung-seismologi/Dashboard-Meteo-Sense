// app/dashboard/climate-drivers/monsoon/page.tsx
import React from "react";
import Link from "next/link";
import { SubpageHeader } from "@/components/climate-drivers/SubpageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sprout, ArrowRight, Wind, Calendar } from "lucide-react";

export default function MonsoonSubpage() {
  return (
    <div className="space-y-6 pb-12">
      <SubpageHeader
        title="Monsun &amp; Agrometeorologi Indonesia"
        subtitle="Analisis sirkulasi monsun dan kalender pola tanam telah dipusatkan di menu Agrometeorologi"
      />

      <Card className="border-none shadow-md bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 text-white overflow-hidden p-8 text-center space-y-6 max-w-3xl mx-auto rounded-3xl">
        <div className="mx-auto p-4 bg-emerald-500/20 text-emerald-400 rounded-2xl w-fit">
          <Sprout className="h-10 w-10" />
        </div>

        <div className="space-y-2">
          <CardTitle className="text-2xl font-black text-white">
            Fitur Analisis Monsun Kini Hadir di Menu Agrometeorologi
          </CardTitle>
          <CardDescription className="text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            Untuk mendukung pengambilan keputusan pertanian dan penentuan awal musim tanam (AMH / AMK), visualisasi deret waktu angin zonal, proyeksi transisi 7 bulan SEAS5, dan rekomendasi komoditas telah diintegrasikan ke halaman <strong>Agrometeorologi &amp; Indeks Pertanian</strong>.
          </CardDescription>
        </div>

        <div className="pt-2">
          <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 px-6">
            <Link href="/dashboard/agromet">
              <span>Buka Menu Agrometeorologi &amp; Kalender Tanam</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}

