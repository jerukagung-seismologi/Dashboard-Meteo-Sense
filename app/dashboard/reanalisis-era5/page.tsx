// app/dashboard/reanalisis-era5/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function ReanalysisRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/klimatologi?tab=era5");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
      <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      <p className="text-sm text-slate-500 font-medium">Mengalihkan ke Analisis Klimatologi &amp; Reanalisis ERA5 Terpadu...</p>
    </div>
  );
}
