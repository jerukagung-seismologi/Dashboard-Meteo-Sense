"use client"

import { useEffect, useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/hooks/useAuth"
import { ToastProvider, ToastViewport } from "@/components/ui/toast"
import { fetchAllDevices } from "@/lib/FetchingDevice"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import LaporanBulanan from "@/components/pelaporan/LaporanBulanan"
import LaporanCurahHujan from "@/components/pelaporan/LaporanCurahHujan"

// --- MAIN PAGE COMPONENT ---
export default function PelaporanPage() {
  const { user, profile } = useAuth();
  const displayName = profile?.displayName || user?.displayName || "Pengamat Cuaca";

  const [sensorOptions, setSensorOptions] = useState<{ label: string; value: string; }[]>([]);
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

  const selectedSensorName = sensorOptions.find(opt => opt.value === sensorId)?.label || "Tidak Diketahui";

  return (
    <ToastProvider>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">Pelaporan</h2>
            <p className="text-muted-foreground dark:text-gray-50">Buat dan cetak laporan data sensor.</p>
          </div>
          <div className="flex flex-col gap-1.5 w-full sm:w-auto">
            <label className="text-sm font-medium">Pilih Sensor</label>
            <Select value={sensorId} onValueChange={setSensorId} disabled={loading || sensorOptions.length === 0}>
              <SelectTrigger className="w-full sm:w-[240px]">
                <SelectValue placeholder={loading ? "Memuat sensor..." : "Pilih Sensor"} />
              </SelectTrigger>
              <SelectContent>
                {sensorOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && <div className="p-4 text-center text-red-600 bg-red-100 rounded-md">{error}</div>}

        {!loading && !error && sensorId && (
          <Tabs defaultValue="bulanan" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="bulanan">Laporan Bulanan</TabsTrigger>
              <TabsTrigger value="hujan">Curah Hujan Harian</TabsTrigger>
            </TabsList>
            <TabsContent value="bulanan" className="pt-4">
              <LaporanBulanan sensorId={sensorId} sensorName={selectedSensorName} displayName={displayName} />
            </TabsContent>
            <TabsContent value="hujan" className="pt-4">
              <LaporanCurahHujan sensorId={sensorId} sensorName={selectedSensorName} displayName={displayName} />
            </TabsContent>
          </Tabs>
        )}

      </div>
      <ToastViewport />
    </ToastProvider>
  )
}