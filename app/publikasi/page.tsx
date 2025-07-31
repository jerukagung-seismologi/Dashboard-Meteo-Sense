import { CloudSun, LineChart, FlaskRoundIcon as Flask, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function Home() {
  return (
    <>
{/* News and Updates Section */}
<section className="bg-primary-50 dark:bg-gray-900 py-8">
<div className="container mx-auto px-4">
  <div className="flex items-center justify-between mb-6">
    <h2 className="text-2xl font-medium text-primary-700 dark:text-primary-300">Publikasi</h2>
  </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    {[
      {
      date: "5 Mei 2025",
      title: "Laporan Cuaca Bulanan: April 2025",
      summary:
        "Ringkasan kondisi cuaca dan iklim selama bulan April 2025 di wilayah Jerukagung dan sekitarnya.",
      thumbnail: "/img/beritaiklim.jpg",
      },
      {
      date: "7 April 2025",
      title: "Laporan Cuaca Bulanan: Maret 2025",
      summary:
        "Ringkasan kondisi cuaca dan iklim selama bulan Maret 2025 di wilayah Jerukagung dan sekitarnya.",
      thumbnail: "/img/beritaiklim.jpg",
      },
      {
      date: "10 Maret 2025",
      title: "Laporan Cuaca Bulanan: Februari 2025",
      summary:
        "Ringkasan kondisi cuaca dan iklim selama bulan Februari 2025 di wilayah Jerukagung dan sekitarnya.",
      thumbnail: "/img/beritaiklim.jpg",
      },
      {
        date: "10 Februari 2025",
        title: "Laporan Cuaca Bulanan: Januari 2025",
        summary:
          "Ringkasan kondisi cuaca dan iklim selama bulan Januari 2025 di wilayah Jerukagung dan sekitarnya.",
        thumbnail: "/img/beritaiklim.jpg",
        },
      
    ].map((item, i) => (
      <div key={i} className="bg-white dark:bg-gray-800 rounded-md shadow-sm overflow-hidden">
      <div className="h-48 bg-gray-200 dark:bg-gray-700">
        <img
        src={item.thumbnail}
        alt={item.title}
        className="h-full w-full object-cover"
        />
      </div>
      <div className="p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{item.date}</p>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{item.title}</h3>
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">{item.summary}</p>
        <Link
        href="#"
        className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-medium"
        >
        Baca Selengkapnya
        </Link>
      </div>
      </div>
    ))}
    </div>
</div>
</section>
</>
)
}