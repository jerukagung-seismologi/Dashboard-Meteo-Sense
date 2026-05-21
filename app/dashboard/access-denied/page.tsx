"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AccessDeniedPage() {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center h-full">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto bg-red-100 p-3 rounded-full w-fit">
            <ShieldAlert className="h-10 w-10 text-red-600" />
          </div>
          <CardTitle className="mt-4 text-2xl font-bold">Akses Ditolak</CardTitle>
          <CardDescription>
            Anda tidak memiliki izin untuk mengakses halaman ini. Silakan hubungi administrator jika Anda merasa ini adalah kesalahan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.back()}>
            Kembali ke Halaman Sebelumnya
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
