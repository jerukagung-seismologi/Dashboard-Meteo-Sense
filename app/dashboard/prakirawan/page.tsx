"use client"

import ForecastForm from "@/components/prakirawan/ForecastFunction"
import { Toaster } from "@/components/ui/toaster"
import BMKGNowcasting from "@/components/prakirawan/FetchBMKGData"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

export default function Page() {
    const printedAt = new Date()

    return (
        <div className="space-y-6 text-slate-900 dark:text-slate-100">
            {/* Header title section */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
                        Prakirawan
                    </h2>
                    <p className="text-muted-foreground text-gray-600 dark:text-slate-300">
                        Buat template laporan prakiraan cuaca dalam bentuk tabel.
                    </p>
                </div>
            </div>

            {/* Main Area: DIPERLEBAR (Hapus max-w-210mm, ganti max-w-full atau container-2xl) */}
            <main className="mx-auto my-0 mb-6 min-h-[500px] w-full max-w-7xl rounded-lg overflow-hidden border border-gray-100 bg-white text-gray-900 shadow-md shadow-slate-200/70 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:shadow-black/40 print:border-0 print:bg-white print:text-black">
                <header className="mb-2 border-b border-gray-300 px-8 py-6 bg-gray-50 dark:bg-slate-800/70 dark:border-slate-700 print:bg-white">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                                Form Prakiraan Cuaca
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-slate-300">
                                Silakan isi data di bawah untuk menghasilkan gambar outlook.
                            </p>
                        </div>
                        <div className="text-right text-sm text-gray-500 dark:text-slate-300">
                            <div>
                                <strong className="text-gray-700 dark:text-slate-100">Tanggal Akses:</strong>{" "}
                                {printedAt.toLocaleDateString("id-ID", {
                                    weekday: "long",
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                    timeZone: "Asia/Jakarta",
                                })}
                            </div>
                        </div>
                </header>

                <div className="p-8 print:p-2 dark:bg-slate-900">
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