"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ThermometerIcon,
  CloudRainIcon,
  WindIcon,
  GaugeIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  WifiIcon,
  WifiOffIcon,
  BatteryIcon,
  RefreshCwIcon,
} from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import LoadingSpinner from "@/components/LoadingSpinner"
import { useAuth } from "@/hooks/useAuth"

// Dummy data
const dummyDevices = [
  {
    id: "1",
    name: "Stasiun A",
    location: "Jerukagung Barat",
    status: "online",
    waterLevel: { value: 2.3, trend: "up", change: 0.2 },
    batteryLevel: 85,
    lastUpdate: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Stasiun B",
    location: "Jerukagung Timur",
    status: "offline",
    waterLevel: { value: 1.7, trend: "down", change: -0.1 },
    batteryLevel: 25,
    lastUpdate: new Date(Date.now() - 3600 * 1000).toISOString(),
  },
  {
    id: "3",
    name: "Stasiun C",
    location: "Jerukagung Selatan",
    status: "online",
    waterLevel: { value: 2.9, trend: "up", change: 0.3 },
    batteryLevel: 60,
    lastUpdate: new Date(Date.now() - 1800 * 1000).toISOString(),
  },
]
const dummyDeviceStats = {
  totalDevices: 3,
  onlineDevices: 2,
  alertDevices: 1,
  avgBatteryLevel: 56,
}
const dummyRecentAlerts = [
  {
    id: "a1",
    message: "Tinggi air melebihi ambang batas!",
    timestamp: new Date().toISOString(),
    device: "Stasiun A",
    severity: "tinggi",
  },
]
const dummyWeatherStats = {
  averageTemperature: 28.5,
  totalRainfall: 12,
  activeAlerts: 1,
  extremeEvents: 0,
}

export default function DashboardPage() {
  const { user } = useAuth()
  // Dummy state
  const [devices] = useState(dummyDevices)
  const [deviceStats] = useState(dummyDeviceStats)
  const [recentAlerts] = useState(dummyRecentAlerts)
  const [weatherStats] = useState(dummyWeatherStats)
  const [loading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 1000)
  }

  const getTrendIcon = (trend: string, size = "h-4 w-4") => {
    switch (trend) {
      case "up":
        return <TrendingUpIcon className={`${size} text-green-600`} />
      case "down":
        return <TrendingDownIcon className={`${size} text-red-600`} />
      default:
        return <MinusIcon className={`${size} text-gray-600`} />
    }
  }

  const getStatusColor = (status: string) => {
    return status === "online" ? "text-green-600" : "text-red-600"
  }

  if (loading) {
    return <LoadingSpinner />
  }

  if (!loading && (!devices || devices.length === 0)) {
    return <EmptyState type="dashboard" />
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Beranda</h2>
          <p className="text-muted-foreground">Ringkasan sistem monitoring cuaca dan hidrologi</p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          className="bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100"
        >
          <RefreshCwIcon className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Total Perangkat</CardTitle>
            <GaugeIcon className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{deviceStats?.totalDevices || 0}</div>
            <p className="text-xs text-blue-600">Stasiun terhubung</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Perangkat Online</CardTitle>
            <WifiIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{deviceStats?.onlineDevices || 0}</div>
            <p className="text-xs text-green-600">Aktif sekarang</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-800">Peringatan</CardTitle>
            <AlertTriangleIcon className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">{deviceStats?.alertDevices || 0}</div>
            <p className="text-xs text-orange-600">Perlu perhatian</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">Rata-rata Baterai</CardTitle>
            <BatteryIcon className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">{deviceStats?.avgBatteryLevel || 0}%</div>
            <p className="text-xs text-purple-600">Level baterai</p>
          </CardContent>
        </Card>
      </div>

      {/* Device Status Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Active Devices */}
        <Card className="shadow-lg border-l-4 border-l-blue-500">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
            <CardTitle className="flex items-center text-blue-800">
              <WifiIcon className="h-5 w-5 mr-2 text-blue-600" />
              Perangkat Aktif
            </CardTitle>
            <CardDescription className="text-blue-600">Monitoring real-time</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {devices.filter((d) => d.status === "online").length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">Tidak ada perangkat aktif</div>
            ) : (
              devices
                .filter((d) => d.status === "online")
                .slice(0, 3)
                .map((device) => (
                  <div
                    key={device.id}
                    className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg"
                  >
                    <div>
                      <h4 className="font-medium text-gray-800">{device.name}</h4>
                      <p className="text-sm text-gray-600">{device.location}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="default" className="bg-gradient-to-r from-green-500 to-emerald-500">
                        <WifiIcon className="h-3 w-3 mr-1" />
                        Online
                      </Badge>
                      <div className="text-right">
                        <div className="text-sm font-medium">{device.waterLevel?.value.toFixed(1)}m</div>
                        <div className="flex items-center">
                          {getTrendIcon(device.waterLevel?.trend, "h-3 w-3")}
                          <span className="text-xs ml-1">
                            {device.waterLevel?.change > 0 ? "+" : ""}
                            {device.waterLevel?.change.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card className="shadow-lg border-l-4 border-l-red-500">
          <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50">
            <CardTitle className="flex items-center text-red-800">
              <AlertTriangleIcon className="h-5 w-5 mr-2 text-red-600" />
              Peringatan Terbaru
            </CardTitle>
            <CardDescription className="text-red-600">Notifikasi sistem</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {recentAlerts.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <CheckCircleIcon className="h-8 w-8 mx-auto mb-2 text-green-500" />
                Tidak ada peringatan terbaru
              </div>
            ) : (
              recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start space-x-3 p-3 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg"
                >
                  <AlertTriangleIcon className="h-4 w-4 text-red-600 mt-1" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{alert.message}</p>
                    <p className="text-xs text-gray-600">
                      {new Date(alert.timestamp).toLocaleString()} • {alert.device}
                    </p>
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    {alert.severity}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weather Overview */}
      {weatherStats && (
        <Card className="shadow-lg border-l-4 border-l-green-500">
          <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
            <CardTitle className="flex items-center text-green-800">
              <CloudRainIcon className="h-5 w-5 mr-2 text-green-600" />
              Ringkasan Cuaca
            </CardTitle>
            <CardDescription className="text-green-600">Kondisi saat ini</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg">
                <ThermometerIcon className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                <div className="text-lg font-bold text-blue-800">{weatherStats.averageTemperature}°C</div>
                <div className="text-xs text-blue-600">Suhu Rata-rata</div>
              </div>
              <div className="text-center p-3 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg">
                <CloudRainIcon className="h-6 w-6 mx-auto mb-2 text-green-600" />
                <div className="text-lg font-bold text-green-800">{weatherStats.totalRainfall}mm</div>
                <div className="text-xs text-green-600">Total Hujan</div>
              </div>
              <div className="text-center p-3 bg-gradient-to-br from-orange-100 to-red-100 rounded-lg">
                <AlertTriangleIcon className="h-6 w-6 mx-auto mb-2 text-orange-600" />
                <div className="text-lg font-bold text-orange-800">{weatherStats.activeAlerts}</div>
                <div className="text-xs text-orange-600">Peringatan Aktif</div>
              </div>
              <div className="text-center p-3 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg">
                <WindIcon className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                <div className="text-lg font-bold text-purple-800">{weatherStats.extremeEvents}</div>
                <div className="text-xs text-purple-600">Kejadian Ekstrem</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Device Performance Summary */}
      <Card className="shadow-lg border-l-4 border-l-indigo-500">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
          <CardTitle className="flex items-center text-indigo-800">
            <GaugeIcon className="h-5 w-5 mr-2 text-indigo-600" />
            Status Sistem
          </CardTitle>
          <CardDescription className="text-indigo-600">Kesehatan keseluruhan</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {devices.map((device) => (
              <div key={device.id} className="p-4 bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-800 truncate">{device.name}</h4>
                  <div className={`flex items-center ${getStatusColor(device.status)}`}>
                    {device.status === "online" ? (
                      <WifiIcon className="h-4 w-4" />
                    ) : (
                      <WifiOffIcon className="h-4 w-4" />
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tinggi Air:</span>
                    <div className="flex items-center">
                      <span className="font-medium">{device.waterLevel?.value.toFixed(1)}m</span>
                      {getTrendIcon(device.waterLevel?.trend, "h-3 w-3 ml-1")}
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Baterai:</span>
                    <span
                      className={`font-medium ${device.batteryLevel < 30 ? "text-red-600" : "text-green-600"}`}
                    >
                      {device.batteryLevel}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Update terakhir:</span>
                    <span className="text-xs text-gray-500">{new Date(device.lastUpdate).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}