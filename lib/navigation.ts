import { 
  LayoutDashboard, 
  Network, 
  FileText, 
  Database, 
  Earth, 
  Sprout, 
  ChartNoAxesCombined, 
  User,
  UsersRound,
  CloudRain,
  TrendingUp,
  Compass,
  LucideIcon
} from "lucide-react"

export interface NavigationItem {
  name: string
  href: string
  icon: LucideIcon
  badge?: string
  requiredRole?: string[]
  roles?: ('Admin' | 'User')[] // Add roles property
}

export const dashboardNavigation: NavigationItem[] = [
  { name: "Beranda", href: "/dashboard", icon: LayoutDashboard, roles: ['Admin', 'User'] },
  { name: "Perangkat", href: "/dashboard/perangkat", icon: Network, roles: ['Admin'] },
  { name: "Sistem Geografis", href: "/dashboard/peta", icon: Earth, roles: ['Admin'] },
  { name: "Agrometeorologi", href: "/dashboard/agromet", icon: Sprout, roles: ['Admin', 'User'] },
  { name: "Analisis Prediksi", href: "/dashboard/analisis", icon: ChartNoAxesCombined, roles: ['Admin'] },
  { name: "Analisis Klimatologi", href: "/dashboard/klimatologi", icon: TrendingUp, roles: ['Admin', 'User'] },
  { name: "Reanalisis ERA5", href: "/dashboard/reanalisis-era5", icon: Compass, roles: ['Admin', 'User'] },
  { name: "Basis Data", href: "/dashboard/data", icon: Database, roles: ['Admin'] },
  { name: "Laporan Cuaca", href: "/dashboard/laporan", icon: FileText, badge: "Warga", roles: ['Admin'] },
  { name: "Prakirawan Cuaca", href: "/dashboard/prakirawan", icon: CloudRain, roles: ['Admin'] },
  { name: "Profil", href: "/dashboard/profil", icon: User, roles: ['Admin', 'User'] },
  { name: "Manajemen", href: "/dashboard/manager", icon: UsersRound, roles: ['Admin'] },
]
