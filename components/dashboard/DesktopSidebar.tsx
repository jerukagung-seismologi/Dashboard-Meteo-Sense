import Link from "next/link"
import type { NavigationItem } from "./types"
import Image from "next/image";

interface DesktopSidebarProps {
  navigation: NavigationItem[]
}

export function DesktopSidebar({ navigation }: DesktopSidebarProps) {
  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
      <div className="flex flex-col flex-grow bg-gradient-to-b from-white to-blue-50 border-r border-gray-200">
        <div className="flex items-center h-16 px-4 bg-emerald-700">
            <Image
              src="/img/logo.png"
              alt="logo"
              width={40}
              height={40}
              className="rounded-full"
            />
          <span className="ml-2 text-lg font-bold text-white">Tenki Sensei</span>
        </div>
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-blue-200 hover:text-blue-800 transition-all duration-200"
            >
              <item.icon className="mr-3 h-5 w-5 group-hover:text-blue-700" />
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}
