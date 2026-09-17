// components/ChartComponent.tsx
"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface ChartComponentProps {
  data: any[];
  layout: any;
  style?: React.CSSProperties;
}

const ChartComponent: React.FC<ChartComponentProps> = ({ data, layout, style }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render Plotly on server
  if (!mounted) {
    return (
      <div className="h-[350px] w-full flex items-center justify-center text-muted-foreground animate-pulse">
        Memuat grafik...
      </div>
    );
  }

  return (
    <Plot
      data={data}
      layout={layout}
      config={{ responsive: true, displayModeBar: false }}
      style={{ width: "100%", height: layout?.height ? `${layout.height}px` : "350px", ...style }}
      useResizeHandler={true}
      className="w-full"
    />
  );
};

export default ChartComponent;
