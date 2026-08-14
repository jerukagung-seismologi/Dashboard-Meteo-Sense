"use client"

import React, { useState } from "react"
import { Copy, Check, FileText } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

interface ReportPublicationCardProps {
  title?: string
  text: string
  subtitle?: string
}

export function ReportPublicationCard({
  title = "Teks Ringkasan Publikasi",
  subtitle = "Format teks ringkas siap salin untuk media sosial atau kanal informasi.",
  text,
}: ReportPublicationCardProps) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast({
      title: "Teks Tersalin",
      description: "Ringkasan laporan berhasil disalin ke clipboard.",
    })
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 shadow-xs">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-slate-200/70 dark:border-slate-800">
        <div>
          <CardTitle className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            {title}
          </CardTitle>
          {subtitle && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCopy}
          className="h-7 px-2.5 text-xs font-medium bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 mr-1 text-emerald-600" />
              Tersalin
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 mr-1 text-slate-600 dark:text-slate-300" />
              Salin Teks
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent className="p-3">
        <pre className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed select-all">
          {text}
        </pre>
      </CardContent>
    </Card>
  )
}
