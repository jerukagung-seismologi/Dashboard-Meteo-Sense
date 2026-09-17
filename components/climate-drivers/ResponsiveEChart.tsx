// components/climate-drivers/ResponsiveEChart.tsx
"use client";

import React, { useRef, useEffect } from "react";
import dynamic from "next/dynamic";

const ReactEChartsCore = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground animate-pulse">
      Memuat grafik...
    </div>
  ),
});

interface ResponsiveEChartProps {
  option: any;
  style?: React.CSSProperties;
  className?: string;
  theme?: string;
  chartKey?: string;
  onEvents?: Record<string, Function>;
}

export const ResponsiveEChart: React.FC<ResponsiveEChartProps> = ({
  option,
  style = { height: "100%", width: "100%" },
  className = "w-full h-full",
  theme,
  chartKey,
  onEvents,
}) => {
  const chartInstanceRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const handleResize = () => {
      const instance = chartInstanceRef.current;
      if (instance && typeof instance.resize === "function" && !instance.isDisposed?.()) {
        instance.resize();
      }
    };

    const observer = new ResizeObserver(() => {
      handleResize();
    });

    observer.observe(containerRef.current);
    window.addEventListener("resize", handleResize);

    // Initial slight delay to ensure container dimensions are calculated
    const timer = setTimeout(handleResize, 150);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div ref={containerRef} className={className}>
      <ReactEChartsCore
        key={chartKey}
        option={option}
        notMerge={true}
        lazyUpdate={true}
        style={style}
        theme={theme}
        onEvents={onEvents}
        onChartReady={(instance: any) => {
          chartInstanceRef.current = instance;
          if (instance && typeof instance.resize === "function") {
            setTimeout(() => instance.resize(), 50);
          }
        }}
      />
    </div>
  );
};
