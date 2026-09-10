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

        <div className="space-y-2.5">
          <CardTitle className="text-2xl font-extrabold tracking-tight text-white">
            Fitur Analisis Monsun &amp; Agrometeorologi
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed font-normal">
            Untuk mendukung riset dinamika atmosfer dan pengambilan keputusan pertanian, analisis <strong>9 Indeks Monsun &amp; Trajektori BSISO</strong> tersedia di menu <strong>Indeks Monsun</strong>, sedangkan visualisasi kalender pola tanam (AMH/AMK) terpusat di <strong>Agrometeorologi</strong>.
          </CardDescription>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild size="default" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm gap-2 px-5 shadow-sm">
            <Link href="/dashboard/indeks-monsun">
              <Wind className="h-4 w-4" />
              <span>Buka 9 Indeks Monsun &amp; BSISO</span>
            </Link>
          </Button>
          <Button asChild size="default" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm gap-2 px-5 shadow-sm">
            <Link href="/dashboard/agromet">
              <span>Buka Kalender Pola Tanam Agromet</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}

