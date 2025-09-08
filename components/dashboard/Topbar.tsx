import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ThemeSwitch } from "@/components/theme-switch"
import { Settings, LogOut, Menu, User } from "lucide-react"
import type { User as FirebaseUser } from "firebase/auth"
import type { UserProfile } from "@/hooks/useAuth"

interface TopbarProps {
  user: FirebaseUser
  profile: UserProfile | null
  setSidebarOpen: (open: boolean) => void
  handleLogout: () => void
}

export function Topbar({ user, profile, setSidebarOpen, handleLogout }: TopbarProps) {
  return (
    <div className="sticky top-0 z-40 w-full bg-gray-200 dark:bg-slate-900 backdrop-blur-sm">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex h-16 items-center gap-x-4 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-md px-4 sm:gap-x-6 sm:px-6">
          <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5 dark:text-gray-200" />
          </Button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1 items-center">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Selamat Datang, {profile?.displayName || user.email?.split("@")[0]}
              </h1>
            </div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-x-2 rounded-xl">
                    <User className="h-5 w-5 text-gray-600 dark:text-gray-200" />
                    <span className="hidden md:inline dark:text-gray-100">{profile?.displayName || user.email?.split("@")[0]}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 dark:bg-gray-900 dark:text-gray-100 rounded-xl border dark:border-gray-700">
                  <DropdownMenuLabel className="dark:text-gray-100">Akun Saya</DropdownMenuLabel>
                  <DropdownMenuSeparator className="dark:bg-gray-700" />
                  <DropdownMenuItem asChild className="dark:hover:bg-gray-800 rounded-lg my-0.5">
                    <Link href="/dashboard/profil">
                      <User className="mr-2 h-4 w-4 dark:text-gray-200" />
                      <span className="dark:text-gray-100">Profil</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="dark:hover:bg-gray-800 rounded-lg my-0.5">
                    <Link href="/dashboard/settings">
                      <Settings className="mr-2 h-4 w-4 dark:text-gray-200" />
                      <span className="dark:text-gray-100">Pengaturan</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="dark:bg-gray-700" />
                  <DropdownMenuItem onClick={handleLogout} className="dark:hover:bg-gray-800 rounded-lg my-0.5">
                    <LogOut className="mr-2 h-4 w-4 dark:text-gray-200" />
                    <span className="dark:text-gray-100">Keluar</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="flex items-center justify-center h-full">
                <ThemeSwitch />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
