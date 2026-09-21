"use client"

import ForecastForm from "@/components/prakirawan/ForecastFunction"
import { Toaster } from "@/components/ui/toaster"
import BMKGNowcasting from "@/components/prakirawan/FetchBMKGData"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { CloudSun, Calendar } from "lucide-react"
import { PageHeaderBanner } from "@/components/ui/PageHeaderBanner"

export default function Page() {
    const printedAt = new Date()

    return (
        <div className="space-y-6 text-slate-900 dark:text-slate-100 pb-12">
            {/* Unified Single Header Banner */}
            <PageHeaderBanner
                gradient="sky"
                icon={CloudSun}
                title="Prakiraan Cuaca & Outlook"
                subtitle="Prakiraan cuaca resolusi tinggi BMKG Nowcasting dan penyusunan template laporan outlook cuaca resmi"
                actions={
                    <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60 text-xs text-slate-300 font-medium">
                        <Calendar className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                        <span>
                            {printedAt.toLocaleDateString("id-ID", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                timeZone: "Asia/Jakarta",
                            })}
                        </span>
                    </div>
                }
            />

            {/* Main Content Area */}
            <main className="mx-auto my-0 mb-6 min-h-[500px] w-full max-w-7xl rounded-2xl overflow-hidden border border-gray-100 bg-white text-gray-900 shadow-md shadow-slate-200/70 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:shadow-black/40 print:border-0 print:bg-white print:text-black">

                <div className="p-3 sm:p-6 lg:p-8 print:p-2 dark:bg-slate-900">
                    <Tabs defaultValue="prakiraan_bmkg" className="w-full">
                        <TabsList className="mb-4">
                            <TabsTrigger value="prakiraan_bmkg">Prakiraan Cuaca BMKG</TabsTrigger>
                            <TabsTrigger value="outlook">Form Prakiraan Cuaca</TabsTrigger>
                        </TabsList>

                        <TabsContent value="prakiraan_bmkg" className="mt-0">
                            <BMKGNowcasting className="w-full" limit={12} />
                        </TabsContent>

                        <TabsContent value="outlook" className="mt-0">
                            <ForecastForm />
                        </TabsContent>
                    </Tabs>
                </div>
            </main>

            <Toaster />
        </div>
    )
}