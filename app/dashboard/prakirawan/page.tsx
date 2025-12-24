"use client"

import ForecastForm from "@/components/prakirawan/ForecastFunction"
import { Toaster } from "@/components/ui/toaster"

export default function Page() {
    const printedAt = new Date()

    return (
        <div className="space-y-6">
            {/* Header title section */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
                        Prakirawan
                    </h2>
                    <p className="text-muted-foreground dark:text-gray-50">
                        Buat template laporan prakiraan cuaca dalam bentuk tabel.
                    </p>
                </div>
            </div>

            {/* Main Area: DIPERLEBAR (Hapus max-w-210mm, ganti max-w-full atau container-2xl) */}
            <main className="mx-auto my-0 mb-6 min-h-[500px] w-full max-w-7xl bg-white text-gray-900 shadow-md print:shadow-none rounded-lg overflow-hidden">
                <header className="mb-2 border-b border-gray-300 px-8 py-6 print:pb-2 bg-gray-50">
                    <div className="flex items-center gap-4">
                        <img
                            src="/img/logo.webp"
                            alt="Logo Meteorologi Jerukagung"
                            className="h-16 w-16 object-contain"
                        />
                        <div>
                            <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                                Departemen Penelitian Sains Atmosfer
                            </div>
                            <div className="text-2xl font-bold text-gray-800">JERUKAGUNG METEOROLOGI</div>
                        </div>
                    </div>

                    <div className="mt-6 flex items-end justify-between border-t border-gray-200 pt-4">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Generator Prakiraan Cuaca</h1>
                            <p className="text-sm text-gray-500">
                                Silakan isi data di bawah untuk menghasilkan gambar outlook.
                            </p>
                        </div>
                        <div className="text-right text-sm text-gray-500">
                            <div>
                                <strong>Tanggal Akses:</strong>{" "}
                                {printedAt.toLocaleDateString("id-ID", {
                                    weekday: "long",
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                    timeZone: "Asia/Jakarta",
                                })}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-8 print:p-2">
                    <ForecastForm />
                </div>
            </main>

            <Toaster />
        </div>
    )
}