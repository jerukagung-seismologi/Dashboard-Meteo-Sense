// components/climate-drivers/EducationalPanel.tsx
"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Info, CheckCircle2, HelpCircle, MapPin, Sparkles } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface EducationalPanelProps {
  title: string;
  whatIsIt: string;
  indonesiaImpact: string;
  phaseComparison?: string;
  phaseMeanings?: Array<{ phase: number; name: string; impact: string }>;
  positiveIod?: string;
  negativeIod?: string;
  currentAssessment: string;
}

export const EducationalPanel: React.FC<EducationalPanelProps> = ({
  title,
  whatIsIt,
  indonesiaImpact,
  phaseComparison,
  phaseMeanings,
  positiveIod,
  negativeIod,
  currentAssessment,
}) => {
  return (
    <div className="space-y-6">
      {/* 1. Current Assessment Card */}
      <Card className="border-l-4 border-l-indigo-500 border-none shadow-sm dark:bg-slate-900 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
            <Sparkles className="h-5 w-5 text-indigo-500" /> Interpretasi Kondisi Iklim Terkini
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
            Ringkasan dampak langsung fenomena {title} terhadap cuaca Indonesia saat ini
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
            {currentAssessment}
          </p>
        </CardContent>
      </Card>

      {/* 2. Scientific & Impact FAQ Accordion */}
      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
        <CardHeader className="pb-2 border-b dark:border-slate-800">
          <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <BookOpen className="h-5 w-5 text-indigo-500" /> Panduan Edukasi & Penjelasan Ilmiah
          </CardTitle>
          <CardDescription>
            Memahami mekanika fenomena {title} tanpa istilah akademis yang rumit
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
            {/* Apa itu? */}
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-sm font-bold text-slate-900 dark:text-slate-100 hover:no-underline">
                <span className="flex items-center gap-2 text-left">
                  <HelpCircle className="h-4 w-4 text-indigo-500 shrink-0" />
                  Apa itu {title}?
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {whatIsIt}
              </AccordionContent>
            </AccordionItem>

            {/* Pengaruh terhadap Indonesia */}
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-sm font-bold text-slate-900 dark:text-slate-100 hover:no-underline">
                <span className="flex items-center gap-2 text-left">
                  <MapPin className="h-4 w-4 text-indigo-500 shrink-0" />
                  Mengapa {title} Memengaruhi Curah Hujan Indonesia?
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {indonesiaImpact}
              </AccordionContent>
            </AccordionItem>

            {/* Variasi Fase / Karakteristik */}
            {(phaseComparison || (positiveIod && negativeIod)) && (
              <AccordionItem value="item-3">
                <AccordionTrigger className="text-sm font-bold text-slate-900 dark:text-slate-100 hover:no-underline">
                  <span className="flex items-center gap-2 text-left">
                    <Info className="h-4 w-4 text-indigo-500 shrink-0" />
                    Perbedaan Fase & Perubahan Karakteristik Cuaca
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">
                  {phaseComparison && (
                    <div className="whitespace-pre-line">{phaseComparison}</div>
                  )}
                  {positiveIod && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg text-amber-900 dark:text-amber-200">
                      {positiveIod}
                    </div>
                  )}
                  {negativeIod && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg text-blue-900 dark:text-blue-200">
                      {negativeIod}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Matriks 8 Fase MJO jika ada */}
            {phaseMeanings && (
              <AccordionItem value="item-4">
                <AccordionTrigger className="text-sm font-bold text-slate-900 dark:text-slate-100 hover:no-underline">
                  <span className="flex items-center gap-2 text-left">
                    <CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0" />
                    Detail Makna 8 Fase MJO Terhadap Hujan Indonesia
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {phaseMeanings.map((p) => (
                      <div
                        key={p.phase}
                        className={`p-3 rounded-lg border text-xs space-y-1 ${
                          p.phase === 4 || p.phase === 5
                            ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800"
                            : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-slate-900 dark:text-slate-100">Fase {p.phase}</span>
                          <span className="text-slate-500 dark:text-slate-400 font-normal">{p.name}</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 leading-snug">
                          {p.impact}
                        </p>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
};
