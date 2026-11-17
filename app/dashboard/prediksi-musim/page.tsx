// app/dashboard/prediksi-musim/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sprout } from "lucide-react";

export default function PrediksiMusimRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/agromet?tab=musim");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-600 dark:text-emerald-400" />
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
        <Sprout className="h-4 w-4 text-emerald-500" />
        <span>Mengalihkan ke Tab Prakiraan Musim di Menu Agrometeorologi...</span>
      </div>
      <p className="text-xs text-slate-400">
        Modul Prakiraan Musim &amp; KATAM kini terintegrasi langsung di Pusat Layanan Agrometeorologi
      </p>
    </div>
  );
}
