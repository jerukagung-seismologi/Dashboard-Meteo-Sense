"use client"

import { useEffect, useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/hooks/useAuth"
import { ToastProvider, ToastViewport } from "@/components/ui/toast"
import { fetchAllDevices } from "@/lib/FetchingDevice"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import LaporanBulanan from "@/components/pelaporan/LaporanBulanan"
import LaporanCurahHujan from "@/components/pelaporan/LaporanCurahHujan"
import LaporanMeteorologi from "@/components/pelaporan/LaporanMeteorologi"
import LaporanKlimatologi from "@/components/pelaporan/LaporanKlimatologi"
import LaporanHarian from "@/components/pelaporan/LaporanHarian"
import ExportWOWMetOffice from "@/components/pelaporan/ExportWOWMetOffice"
import { FileText } from "lucide-react"
import { PageHeaderBanner } from "@/components/ui/PageHeaderBanner"

// --- MAIN PAGE COMPONENT ---
export default function PelaporanPage() {
  const { user, profile } = useAuth();
  const displayName = profile?.displayName || user?.displayName || "Pengamat Cuaca";

  const [sensorOptions, setSensorOptions] = useState<{ label: string; value: string; lat?: number; lng?: number }[]>([]);
  const [sensorId, setSensorId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's devices from Firestore
  useEffect(() => {
    if (user?.uid) {
      const loadUserDevices = async () => {
        setLoading(true);
        try {
          const devices = await fetchAllDevices(user.uid);
          if (devices.length > 0) {
            const options = devices
              .filter((device) => device.authToken)
              .map((device) => ({
                label: device.name,
                value: device.authToken!,
                lat: device.coordinates?.lat || -7.67,
                lng: device.coordinates?.lng || 109.65,
              }));

            if (options.length > 0) {
              setSensorOptions(options);
              setSensorId(options[0].value);
              setError(null);
            } else {
              setError("Tidak ada sensor yang dapat ditampilkan. Pastikan perangkat Anda memiliki authToken.");
              setSensorOptions([]);
              setSensorId("");
            }
          } else {
            setError("Tidak ada perangkat yang terhubung dengan akun Anda.");
            setSensorOptions([]);
            setSensorId("");
          }
        } catch (err) {
          setError("Gagal memuat daftar perangkat.");
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      loadUserDevices();
    }
  }, [user]);

  const selectedSensor = sensorOptions.find(opt => opt.value === sensorId);
  const selectedSensorName = selectedSensor?.label || "Tidak Diketahui";
  const selectedLat = selectedSensor?.lat ?? -7.67;
  const selectedLng = selectedSensor?.lng ?? 109.65;

  return (
    <ToastProvider>
      <div className="space-y-6">
        {/* Unified Single Header Banner */}
        <PageHeaderBanner
          gradient="blue"
          icon={FileText}
          title="Pelaporan & Ekspor Data"
          subtitle="Buat dan cetak laporan data sensor harian, bulanan, klimatologi, serta ekspor observasi global WOW Met Office."
          actions={
            <div className="flex items-center gap-2">
              <Select value={sensorId} onValueChange={setSensorId} disabled={loading || sensorOptions.length === 0}>
                <SelectTrigger className="w-full sm:w-[220px] bg-slate-900/80 border-slate-700 text-white text-xs h-8">
                  <SelectValue placeholder={loading ? "Memuat sensor..." : "Pilih Sensor"} />
                </SelectTrigger>
                <SelectContent>
                  {sensorOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-xs">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        />

        {error && <div className="p-4 text-center text-red-600 bg-red-100 rounded-md">{error}</div>}

        {!loading && !error && sensorId && (
          <Tabs defaultValue="harian" className="w-full">
            <div className="overflow-x-auto pb-1">
              <TabsList className="flex w-max min-w-full sm:grid sm:grid-cols-6 max-w-5xl">
                <TabsTrigger value="harian" className="text-xs">Laporan Harian</TabsTrigger>
                <TabsTrigger value="bulanan" className="text-xs">Ringkasan Bulanan</TabsTrigger>
                <TabsTrigger value="hujan" className="text-xs">Curah Hujan Harian</TabsTrigger>
                <TabsTrigger value="meteorologi" className="text-xs">Analisis Meteorologi</TabsTrigger>
                <TabsTrigger value="klimatologi" className="text-xs">Analisis Klimatologi</TabsTrigger>
                <TabsTrigger value="wow" className="text-xs font-semibold text-blue-600 dark:text-blue-400">WOW Met Office</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="harian" className="pt-4">
              <LaporanHarian sensorId={sensorId} sensorName={selectedSensorName} displayName={displayName} />
            </TabsContent>
            <TabsContent value="bulanan" className="pt-4">
              <LaporanBulanan
                sensorId={sensorId}
                sensorName={selectedSensorName}
                displayName={displayName}
                lat={selectedLat}
                lng={selectedLng}
              />
            </TabsContent>
            <TabsContent value="hujan" className="pt-4">
              <LaporanCurahHujan sensorId={sensorId} sensorName={selectedSensorName} displayName={displayName} />
            </TabsContent>
            <TabsContent value="meteorologi" className="pt-4">
              <LaporanMeteorologi sensorId={sensorId} sensorName={selectedSensorName} displayName={displayName} />
            </TabsContent>
            <TabsContent value="klimatologi" className="pt-4">
              <LaporanKlimatologi
                sensorId={sensorId}
                sensorName={selectedSensorName}
                displayName={displayName}
                lat={selectedLat}
                lng={selectedLng}
              />
            </TabsContent>
            <TabsContent value="wow" className="pt-4">
              <ExportWOWMetOffice sensorId={sensorId} sensorName={selectedSensorName} displayName={displayName} />
            </TabsContent>
          </Tabs>
        )}

      </div>
      <ToastViewport />
    </ToastProvider>
  )
}