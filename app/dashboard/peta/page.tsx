"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";

export default function PetaPage() {
  // Gunakan dynamic import untuk komponen Peta untuk memastikan hanya dimuat di sisi klien.
  // react-simple-maps memerlukan environment browser.
  const Map = useMemo(
    () =>
      dynamic(() => import("@/components/Map"), {
        loading: () => <p>Memuat peta...</p>,
        ssr: false,
      }),
    []
  );

  return (
    <div className="h-full w-full p-4">
      <h1 className="text-2xl font-bold mb-4">Peta Sensor</h1>
      <div className="h-[calc(100vh-150px)] w-full rounded-lg border border-gray-300 overflow-hidden">
        <Map />
      </div>
    </div>
  );
}