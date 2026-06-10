"use client";

import { useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/hooks/useAuth";
import { fetchAllDevices } from "@/lib/FetchingDevice";
import { fetchSensorData } from "@/lib/FetchingSensorData";

export default function PetaPage() {
  const { user } = useAuth();
  const [deviceData, setDeviceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const loadData = async () => {
      setLoading(true);
      try {
        const devices = await fetchAllDevices(user.uid);
        
        const mapDataPromises = devices.map(async (device) => {
          let temp, hum, lastUpdate;
          if (device.authToken) {
            try {
              // Ambil 1 record terakhir untuk popup peta
              const sensorData = await fetchSensorData(device.authToken, 1);
              if (sensorData && sensorData.length > 0) {
                temp = sensorData[0].temperature;
                hum = sensorData[0].humidity;
                lastUpdate = sensorData[0].timeFormatted;
              }
            } catch (e) {
              console.error("Error fetching sensor data for", device.name, e);
            }
          }
          
          return {
            id: device.id,
            name: device.name,
            lat: device.coordinates?.lat || 0,
            lng: device.coordinates?.lng || 0,
            temp,
            hum,
            lastUpdate
          };
        });
        
        const results = await Promise.all(mapDataPromises);
        // Filter perangkat yang tidak memiliki koordinat yang valid
        setDeviceData(results.filter(r => r.lat !== 0 && r.lng !== 0));
      } catch (err) {
        console.error("Error loading map data", err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user]);

  // Gunakan dynamic import untuk komponen Peta untuk memastikan hanya dimuat di sisi klien.
  // react-leaflet memerlukan environment browser.
  const Map = useMemo(
    () =>
      dynamic(() => import("@/components/peta/Map"), {
        loading: () => <p className="text-center p-4">Memuat komponen peta...</p>,
        ssr: false,
      }),
    []
  );

  return (
    <div className="h-full w-full p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Peta Persebaran Sensor</h1>
        <p className="text-muted-foreground text-sm">Titik lokasi seluruh perangkat Meteo-Sense Anda di lapangan.</p>
      </div>
      <div className="h-[calc(100vh-160px)] w-full rounded-xl border shadow-sm overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/70 backdrop-blur-sm">
             <div className="flex flex-col items-center">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
               <p className="text-sm font-medium text-slate-600">Memuat data sensor waktu nyata...</p>
             </div>
          </div>
        )}
        <Map devices={deviceData} />
      </div>
    </div>
  );
}