// components/peta/LocationPickerMap.tsx
"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation, Crosshair, Layers, Check, Search, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// Fix default leaflet icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

// Custom sleek Pin Marker Icon
const createPickerDivIcon = () => {
  return L.divIcon({
    className: "custom-location-picker-marker",
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; transform: translate(-50%, -100%);">
        <div style="
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          border: 2.5px solid #ffffff;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 14px rgba(79, 70, 229, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="transform: rotate(45deg); width: 10px; height: 10px; background-color: #ffffff; border-radius: 50%;"></div>
        </div>
        <div style="
          width: 10px;
          height: 3px;
          background: rgba(0,0,0,0.3);
          border-radius: 50%;
          margin-top: -1px;
          filter: blur(1px);
        "></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

interface LocationPickerMapProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
  height?: string;
  zoom?: number;
}

// Controller for clicking on map and dragging marker
function MapEventController({
  position,
  onChange,
  onManualSelect,
}: {
  position: [number, number];
  onChange: (lat: number, lng: number) => void;
  onManualSelect?: () => void;
}) {
  const map = useMap();
  const markerRef = useRef<L.Marker>(null);

  // Map Click Event
  useMapEvents({
    click(e) {
      const newLat = Number(e.latlng.lat.toFixed(5));
      const newLng = Number(e.latlng.lng.toFixed(5));
      onChange(newLat, newLng);
      map.panTo([newLat, newLng]);
      if (onManualSelect) onManualSelect();
    },
  });

  // Marker Drag Event
  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latLng = marker.getLatLng();
          const newLat = Number(latLng.lat.toFixed(5));
          const newLng = Number(latLng.lng.toFixed(5));
          onChange(newLat, newLng);
          if (onManualSelect) onManualSelect();
        }
      },
    }),
    [onChange, onManualSelect]
  );

  const markerIcon = useMemo(() => createPickerDivIcon(), []);

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={markerIcon}
    />
  );
}

// Controller to smoothly pan/fly map when coordinates change externally
function MapPanController({ targetPos }: { targetPos: [number, number] }) {
  const map = useMap();
  const prevPos = useRef<[number, number]>(targetPos);

  useEffect(() => {
    const dist = Math.hypot(
      targetPos[0] - prevPos.current[0],
      targetPos[1] - prevPos.current[1]
    );
    // Pan only if difference is noticeable (> ~10 meters)
    if (dist > 0.0001) {
      map.flyTo(targetPos, map.getZoom() < 13 ? 14 : map.getZoom(), { animate: true, duration: 0.8 });
      prevPos.current = targetPos;
    }
  }, [targetPos, map]);

  return null;
}

export default function LocationPickerMap({
  lat,
  lng,
  onChange,
  height = "h-64",
  zoom = 13,
}: LocationPickerMapProps) {
  // Valid fallback to Kebumen Center if 0 or undefined
  const safeLat = typeof lat === "number" && !isNaN(lat) && lat !== 0 ? lat : -7.6723;
  const safeLng = typeof lng === "number" && !isNaN(lng) && lng !== 0 ? lng : 109.6533;
  const currentPos: [number, number] = [safeLat, safeLng];

  const [mapLayer, setMapLayer] = useState<"streets" | "satellite">("streets");
  const [geoLoading, setGeoLoading] = useState(false);
  const [selectedPlaceName, setSelectedPlaceName] = useState<string>("");

  // Geocoding Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Debounce search geocoding
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        let results: any[] = [];
        try {
          const res = await fetch(`/api/reanalysis/geocode?name=${encodeURIComponent(q)}`);
          if (res.ok) {
            const data = await res.json();
            results = data.results || [];
          }
        } catch {
          // fallback
        }

        if (results.length === 0) {
          const directRes = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=id&format=json`
          );
          if (directRes.ok) {
            const data = await directRes.json();
            results = data.results || [];
          }
        }
        setSuggestions(results);
      } catch (err) {
        console.error("LocationPickerMap geocode error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle selection from dropdown
  const handleSelectPlace = (place: any) => {
    const newLat = Number(place.latitude.toFixed(5));
    const newLng = Number(place.longitude.toFixed(5));
    onChange(newLat, newLng);
    setSearchQuery("");
    setSuggestions([]);
    setSelectedPlaceName(place.name + (place.admin1 ? `, ${place.admin1}` : ""));
  };

  // Set Kebumen Center
  const handleResetKebumen = () => {
    setSelectedPlaceName("Pusat Kebumen");
    onChange(-7.6723, 109.6533);
  };

  // Get User Current Location
  const handleGeolocate = () => {
    if ("geolocation" in navigator) {
      setGeoLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeoLoading(false);
          setSelectedPlaceName("Lokasi GPS Saya");
          onChange(
            Number(pos.coords.latitude.toFixed(5)),
            Number(pos.coords.longitude.toFixed(5))
          );
        },
        (err) => {
          setGeoLoading(false);
          console.warn("Geolocation denied or error:", err);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  return (
    <div className="space-y-2 w-full">
      {/* Geocoding Search Bar */}
      <div className="relative w-full">
        <div className="relative flex items-center">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          <Input
            type="text"
            placeholder="Cari kota/kabupaten/kecamatan... (e.g. Bandung, Surabaya, Gombong)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-8 text-xs h-7.5 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm"
          />
          {isSearching && (
            <Loader2 className="absolute right-2.5 top-2 h-3.5 w-3.5 animate-spin text-indigo-500" />
          )}
          {searchQuery && !isSearching && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSuggestions([]);
              }}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Suggestions dropdown */}
        {suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 z-[1100] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {suggestions.map((place, idx) => (
              <button
                key={`${place.id || idx}-${place.latitude}`}
                type="button"
                onClick={() => handleSelectPlace(place)}
                className="w-full text-left p-2.5 hover:bg-indigo-50/50 dark:hover:bg-slate-900 flex justify-between items-center transition"
              >
                <div className="truncate pr-2">
                  <div className="font-bold text-slate-800 dark:text-slate-100">{place.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {[place.admin2, place.admin1, place.country].filter(Boolean).join(", ")}
                  </div>
                </div>
                <div className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 shrink-0 flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                  <MapPin className="h-3 w-3" /> {place.latitude.toFixed(3)}°, {place.longitude.toFixed(3)}°
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Top Toolbar: Instructions & Quick Actions */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 min-w-0">
          <MapPin className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
          <span className="font-medium text-[11px] truncate">
            {selectedPlaceName ? `Terpilih: ${selectedPlaceName}` : "Klik peta atau geser pin koordinat:"}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetKebumen}
            className="h-6 px-2 text-[10px] rounded-lg border-slate-200 dark:border-slate-700"
          >
            Pusat Kebumen
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGeolocate}
            disabled={geoLoading}
            className="h-6 px-2 text-[10px] rounded-lg border-slate-200 dark:border-slate-700 gap-1"
          >
            <Crosshair className={`h-3 w-3 ${geoLoading ? "animate-spin" : ""}`} />
            <span>GPS Saya</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMapLayer(mapLayer === "streets" ? "satellite" : "streets")}
            className="h-6 px-2 text-[10px] rounded-lg border-slate-200 dark:border-slate-700 gap-1"
            title="Ganti Lapisan Peta"
          >
            <Layers className="h-3 w-3" />
            <span>{mapLayer === "streets" ? "Satelit" : "Jalan"}</span>
          </Button>
        </div>
      </div>

      {/* Map Container */}
      <div
        className={`${height} w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 relative shadow-inner bg-slate-100 dark:bg-slate-900`}
      >
        <MapContainer
          center={currentPos}
          zoom={zoom}
          scrollWheelZoom={true}
          className="h-full w-full z-0"
        >
          {mapLayer === "streets" ? (
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
          ) : (
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS"
            />
          )}

          <MapEventController
            position={currentPos}
            onChange={onChange}
            onManualSelect={() => setSelectedPlaceName("")}
          />
          <MapPanController targetPos={currentPos} />
        </MapContainer>

        {/* Floating Active Coordinate Pill */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 z-[1000] pointer-events-none flex items-center justify-between">
          <Badge
            variant="secondary"
            className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-700 text-[11px] font-mono shadow-md px-2.5 py-1 text-slate-800 dark:text-slate-200 pointer-events-auto"
          >
            <span className="text-indigo-600 dark:text-indigo-400 font-bold mr-1">📍 Titik:</span>
            {safeLat.toFixed(5)}, {safeLng.toFixed(5)}
          </Badge>

          <span className="text-[10px] bg-slate-900/80 text-white dark:bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-md font-sans shadow-sm">
            Drag pin untuk atur presisi
          </span>
        </div>
      </div>
    </div>
  );
}

