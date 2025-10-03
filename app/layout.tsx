import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    template: "%s | Meteo Sense",
    default: "Meteo Sense",
  },
  description: "Penelitian dan Pengembangan Pemantauan Sains Atmosfer",
  keywords: [
    "Pemantauan",
    "Sains Atmosfer",
    "Penelitian",
    "Pengembangan",
    "Teknologi",
    "Sensor",
    "Aktuator",
    "Meteorologi",
    "Atmosfer",
    "Data",
    "IoT",
    "Cuaca",
    "Kualitas Udara",
    "Lingkungan",
  ],
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      {
        url: "/img/logo.png",
        href: "/img/logo.png",
        sizes: "any",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/img/logo.png",
        href: "/img/logo.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
