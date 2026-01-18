"use client";

import { useState, useEffect, FormEvent } from "react";
import { ArrowLeft, Send, MapPin, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // Pastikan component ini ada
import { Checkbox } from "@/components/ui/checkbox"; // Pastikan component ini ada
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { createReport, CitizenReportInput } from "@/lib/sendObservation"; // Import service baru
import { Input } from "@/components/ui/input";

// --- OPSI PILIHAN (Citizen Science Friendly) ---
const WEATHER_OPTIONS = ["Cerah", "Berawan", "Hujan Ringan", "Hujan Lebat", "Badai"];
const ANGIN_OPTIONS = ["Tenang", "Sepoi-sepoi","Sedang", "Kencang", "Ekstrem"];
const DAMPAK_OPTIONS = [
  "Aman Terkendali",
  "Jalan Tergenang",
  "Selokan Meluap",
  "Banjir Masuk Rumah",
  "Pohon Tumbang",
  "Atap Rusak",
  "Longsor",
  "Banjir Bandang"
];

export default function ObservationPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  
  // State Form
  const [intensitas, setIntensitas] = useState<string>("");
  const [angin, setAngin] = useState<string>("");
  const [dampakSelected, setDampakSelected] = useState<string[]>([]);
  const [catatan, setCatatan] = useState("");
  const [lokasi, setLokasi] = useState<{ latitude: number; longitude: number } | null>(null);
  const [alamat, setAlamat] = useState("");

  // Ambil Lokasi saat halaman dimuat
  useEffect(() => {
    getLocation();
  }, []);

  // Redirect setelah sukses
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        router.push('/');
      }, 3000); // Redirect setelah 3 detik
      return () => clearTimeout(timer);
    }
  }, [isSuccess, router]);

  const getLocation = () => {
    setLocationStatus("loading");
    if (!navigator.geolocation) {
      toast({ variant: "destructive", title: "Error", description: "Browser tidak mendukung Geolocation." });
      setLocationStatus("error");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLokasi({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationStatus("success");
      },
      () => {
        toast({ variant: "destructive", title: "Gagal Lokasi", description: "Gagal mengambil lokasi GPS. Pastikan GPS aktif." });
        setLocationStatus("error");
      }
    );
  };

  const handleDampakChange = (dampak: string) => {
    setDampakSelected((prev) =>
      prev.includes(dampak) ? prev.filter((item) => item !== dampak) : [...prev, dampak]
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validasi
    if (!intensitas || !angin) {
      toast({ variant: "destructive", title: "Data Kurang", description: "Mohon isi Intensitas Hujan dan Kondisi Angin." });
      return;
    }
    if (!lokasi) {
      toast({ variant: "destructive", title: "Lokasi Kosong", description: "Mohon izinkan akses lokasi GPS." });
      return;
    }

    setIsLoading(true);

    try {
      const payload: CitizenReportInput = {
        waktu: new Date(),
        alamat: alamat,
        intensitasHujan: intensitas as any,
        kondisiAngin: angin as any,
        dampak: dampakSelected,
        lokasi: lokasi,
        catatan: catatan,
      };

      await createReport(payload);
      setIsSuccess(true);
      
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Gagal", description: "Terjadi kesalahan saat mengirim data." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
        <Toaster />
        {isSuccess ? (
          <Card className="w-full max-w-lg shadow-lg border-0 bg-blue/90 dark:bg-gray-800/90 backdrop-blur">
            <CardContent className="p-8 text-center flex flex-col items-center justify-center space-y-4">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Laporan Terkirim!</h2>
              <p className="text-gray-600 dark:text-gray-300">
                Terima kasih atas kontribusi Anda. Anda akan diarahkan kembali ke halaman utama.
              </p>
              <Loader2 className="mt-4 h-6 w-6 animate-spin text-primary-600" />
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full max-w-lg shadow-lg border-0 bg-white/100 dark:bg-gray-800/90 backdrop-blur">
            <CardHeader>
              <Button variant="ghost" size="sm" className="self-start mb-2 pl-0 hover:bg-transparent" asChild>
                <Link href="/" className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
                  <ArrowLeft className="w-4 h-4" /> Kembali
                </Link>
              </Button>
              <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-white">Lapor Cuaca Warga</CardTitle>
              <CardDescription className="pt-8 text-gray-700 dark:text-white" > Bantu kami meningkatkan model prakiraan cuaca</CardDescription>
              <p className="text-xs text-yellow-600 dark:text-yellow-400 pt-5">
                Disclaimer: Data yang Anda kirimkan HANYA akan digunakan untuk tujuan penelitian dan pengembangan model perkiraan cuaca lokal. Jika anda membutuhkan data survei ini silahkan hubungi email jerukagunglabs@gmail.com atau kontak 0882-2541-8750
              </p>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* 1. Lokasi GPS */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex items-center justify-between border border-blue-100 dark:border-blue-800">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${locationStatus === 'success' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Lokasi Anda</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {locationStatus === 'loading' && "Mencari koordinat..."}
                        {locationStatus === 'success' && `${lokasi?.latitude.toFixed(4)}, ${lokasi?.longitude.toFixed(4)}`}
                        {locationStatus === 'error' && "Lokasi tidak ditemukan"}
                      </p>
                    </div>
                  </div>
                  {locationStatus === 'error' && (
                    <Button type="button" variant="outline" size="sm" onClick={getLocation}>Coba Lagi</Button>
                  )}
                </div>

                {/* Alamat */}
                <div className="space-y-3">
                  <Label htmlFor="alamat">Alamat (Opsional)</Label>
                  <Input 
                    id="alamat" 
                    placeholder="Contoh: Jl. Merdeka No. 10, Kelurahan, Kecamatan" 
                    value={alamat}
                    onChange={(e) => setAlamat(e.target.value)}
                  />
                </div>

                {/* 2. Intensitas Hujan */}
                <div className="space-y-3">
                  <Label>Bagaimana keadaan cuaca di sana?</Label>
                  <Select onValueChange={setIntensitas} value={intensitas}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih Cuaca saat ini..." />
                    </SelectTrigger>
                    <SelectContent>
                      {WEATHER_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 3. Kondisi Angin */}
                <div className="space-y-3">
                  <Label>Bagaimana anginnya?</Label>
                  <Select onValueChange={setAngin} value={angin}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih kondisi angin..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ANGIN_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 4. Dampak (Checklist) */}
                <div className="space-y-3">
                  <Label>Apa yang terjadi di sekitar? (Boleh pilih lebih dari satu)</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    {DAMPAK_OPTIONS.map((dampak) => (
                      <div key={dampak} className="flex items-center space-x-2 border p-3 rounded-md hover:bg-gray-50 cursor-pointer dark:hover:bg-gray-700 dark:border-gray-700 transition-colors">
                        <Checkbox 
                          id={dampak} 
                          checked={dampakSelected.includes(dampak)}
                          onCheckedChange={() => handleDampakChange(dampak)}
                        />
                        <label
                          htmlFor={dampak}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-grow"
                        >
                          {dampak}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. Catatan Tambahan */}
                <div className="space-y-3">
                  <Label htmlFor="catatan">Catatan Tambahan (Opsional)</Label>
                  <Textarea 
                    id="catatan" 
                    placeholder="Misal: Air mulai masuk teras setinggi mata kaki..." 
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                  />
                </div>

                <Button type="submit" size="lg" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading || locationStatus !== 'success'}>
                  {isLoading ? (
                    <>Mengirim <Loader2 className="ml-2 h-4 w-4 animate-spin" /></>
                  ) : (
                    <>Kirim Laporan <Send className="ml-2 h-4 w-4" /></>
                  )}
                </Button>

              </form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}