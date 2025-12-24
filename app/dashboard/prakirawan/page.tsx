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

			{/* Printable main area with laporan-style header */}
			<main className="mx-auto my-0 mb-6 min-h-[calc(297mm-24mm)] max-w-[210mm] bg-white text-gray-900 shadow-md print:shadow-none">
				<header className="mb-2 border-b border-gray-300 px-5 py-4 print:pb-2">
					<div className="flex items-center gap-3">
						<img
							src="/img/logo.webp"
							alt="Logo Meteorologi Jerukagung"
							className="h-16 w-16 object-contain"
						/>
						<div>
							<div className="text-sm font-medium text-gray-500">
								Departemen Penelitian Sains Atmosfer
							</div>
							<div className="text-xl font-bold">JERUKAGUNG METEOROLOGI</div>
						</div>
					</div>

					<div className="mt-4 flex items-start justify-between">
						<div>
							<h1 className="text-lg font-bold">Template Prakirawan</h1>
							<p className="text-sm text-gray-500">
								Penyusunan template laporan prakiraan cuaca
							</p>
						</div>
						<div className="text-right text-xs text-gray-500">
							<div>
								<strong>Tanggal Cetak:</strong>{" "}
								{printedAt.toLocaleDateString("id-ID", {
									timeZone: "Asia/Jakarta",
								})}
							</div>
						</div>
					</div>
				</header>

				<div className="p-5 print:p-2">
					<ForecastForm />
				</div>
			</main>

			<Toaster />
		</div>
	)
}
