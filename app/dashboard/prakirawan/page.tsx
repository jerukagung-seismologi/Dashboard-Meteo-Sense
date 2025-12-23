import ForecastForm from "@/components/dashboard/ForecastForm"
import { Toaster } from "@/components/ui/toaster"

export default function Page() {
	return (
		<main className="p-4 space-y-6">
			<div className="space-y-1">
				<h1 className="text-2xl font-bold">Prakirawan</h1>
				<p className="text-sm text-muted-foreground">
					Buat template laporan prakiraan cuaca dalam bentuk tabel.
				</p>
			</div>
			<ForecastForm />
			<Toaster />
		</main>
	)
}
