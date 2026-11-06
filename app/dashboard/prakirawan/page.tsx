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
                    <Tabs defaultValue="prakiraan_bmkg" className="w-full space-y-6">
                        <div className="flex items-center justify-start border-b border-slate-200 dark:border-slate-800 w-full overflow-x-auto">
                            <TabsList className="bg-transparent gap-2 h-auto p-0 border-none flex justify-start -mb-px">
                                <TabsTrigger
                                    value="prakiraan_bmkg"
                                    className="px-4 py-2.5 rounded-t-lg rounded-b-none border border-transparent border-b-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 data-[state=active]:border-slate-200 dark:data-[state=active]:border-slate-800 data-[state=active]:border-b-orange-500 dark:data-[state=active]:border-b-orange-500 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400 data-[state=active]:font-bold data-[state=active]:shadow-xs transition-all cursor-pointer flex items-center gap-2"
                                >
                                    Prakiraan Cuaca BMKG
                                </TabsTrigger>
                                <TabsTrigger
                                    value="outlook"
                                    className="px-4 py-2.5 rounded-t-lg rounded-b-none border border-transparent border-b-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 data-[state=active]:border-slate-200 dark:data-[state=active]:border-slate-800 data-[state=active]:border-b-orange-500 dark:data-[state=active]:border-b-orange-500 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400 data-[state=active]:font-bold data-[state=active]:shadow-xs transition-all cursor-pointer flex items-center gap-2"
                                >
                                    Form Prakiraan Cuaca
                                </TabsTrigger>
                            </TabsList>
                        </div>

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