"use client"

import React from "react";
import { cn } from "@/lib/utils";
import { formatIdDateShort } from "@/lib/weatherUtils";

interface PrintLayoutProps {
  id: string;
  title: string;
  sensorName: string;
  periodLabel: string;
  generatedBy: string;
  orientation?: "portrait" | "landscape";
  children: React.ReactNode;
}

export function PrintLayout({
  id,
  title,
  sensorName,
  periodLabel,
  generatedBy,
  orientation = "portrait",
  children
}: PrintLayoutProps) {
  // A4 size references:
  // Portrait: 210mm x 297mm (~794px x 1123px at 96 DPI, let's use 1000px width for better scaling)
  // We use a fixed pixel width so charts render predictably before canvas snapshot.
  const widthClass = orientation === "portrait" ? "w-[1000px]" : "w-[1414px]";

  return (
    <div className="w-full overflow-x-auto overflow-y-hidden pb-4">
      <div 
        id={id}
        className={cn(
          "bg-white text-slate-900 mx-auto relative",
          widthClass
        )}
        style={{ minHeight: orientation === "portrait" ? "1414px" : "1000px" }}
      >
        {/* We use padding natively in the div instead of @page margin so html2canvas captures it */}
        <div className="p-10 space-y-8 flex flex-col h-full min-h-[inherit]">
          
          {/* Header */}
          <header className="border-b-4 border-slate-800 pb-6 flex justify-between items-start shrink-0">
            <div className="flex items-center gap-4">
              <img 
                src="/img/logo.webp" 
                alt="Logo" 
                className="h-16 w-16 object-contain"
                crossOrigin="anonymous"
              />
              <div>
                <h1 className="text-3xl font-bold uppercase text-slate-800 tracking-tight">{title}</h1>
                <div className="text-slate-600 mt-2 font-medium flex flex-col gap-1">
                  <span className="text-lg text-slate-700 font-semibold">{sensorName}</span>
                  <span className="text-base text-slate-500">{periodLabel}</span>
                </div>
              </div>
            </div>
            <div className="text-right flex flex-col items-end gap-1">
              <p className="text-sm text-slate-500 mt-2">Dicetak: {formatIdDateShort(new Date())}</p>
              <p className="text-sm font-semibold text-slate-700">Oleh: {generatedBy}</p>
            </div>
          </header>

          {/* Body Content */}
          <main className="flex-grow">
            {children}
          </main>

          {/* Footer */}
          <footer className="mt-8 border-t-2 border-slate-200 pt-6 text-center shrink-0 break-inside-avoid">
            <p className="text-slate-600 font-medium text-sm">
              Dokumen ini dihasilkan secara otomatis oleh sistem <strong className="text-slate-800">MeteoSense Dashboard</strong>
            </p>
            <p className="text-slate-400 text-xs mt-1">
              Tanda tangan digital tidak diperlukan. Validitas data dijamin oleh sistem.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
