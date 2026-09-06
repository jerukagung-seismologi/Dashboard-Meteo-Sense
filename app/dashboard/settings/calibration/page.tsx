// app/dashboard/settings/calibration/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function SettingsCalibrationRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/kalibrasi?tab=sensor-settings");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      <p className="text-sm text-slate-500 font-medium">
        Mengalihkan ke modul terpadu Kalibrasi & Validasi Bias (Pengaturan Sensor)...
      </p>
    </div>
  );
}
