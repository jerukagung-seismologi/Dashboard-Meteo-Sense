"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icon issue with webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

interface DeviceMapData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  temp?: number;
  hum?: number;
  lastUpdate?: string;
}

interface MapProps {
  devices: DeviceMapData[];
}

const Map = ({ devices = [] }: MapProps) => {
  // If there are devices, center map to the first device, otherwise default Jakarta
  const centerPosition: L.LatLngExpression = devices.length > 0 
    ? [devices[0].lat, devices[0].lng] 
    : [-6.2088, 106.8456];

  return (
    <MapContainer
      center={centerPosition}
      zoom={11}
      scrollWheelZoom={true}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {devices.map((device, idx) => (
        <Marker key={device.id || idx} position={[device.lat, device.lng]}>
          <Popup>
            <div className="text-center min-w-[150px]">
              <strong className="text-lg text-slate-800">{device.name}</strong>
              <div className="w-full h-px bg-slate-200 my-2"></div>
              {device.temp !== undefined ? (
                <>
                  <div className="flex justify-around gap-2 my-2 text-sm">
                    <div className="flex flex-col items-center">
                      <span className="text-red-500 font-bold text-lg">{device.temp}°C</span>
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Suhu</span>
                    </div>
                    <div className="w-px h-8 bg-slate-200 self-center"></div>
                    <div className="flex flex-col items-center">
                      <span className="text-blue-500 font-bold text-lg">{device.hum}%</span>
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Kelembapan</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-3 bg-slate-50 py-1 rounded">
                    Update: {device.lastUpdate}
                  </div>
                </>
              ) : (
                <div className="text-sm text-slate-500 italic mt-2 py-2">Data belum tersedia</div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default Map;