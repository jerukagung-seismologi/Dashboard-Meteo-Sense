"use client"
import React, { useEffect, useState } from "react"
import { fetchDevices, addDevice, updateDevice, deleteDevice, generateDeviceToken, Device } from "@/lib/FetchingDevice"
import { fetchDeviceLocation } from "@/lib/FetchingLocation"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import {
  MapPin, Wifi, WifiOff, Calendar, TrendingUp, TrendingDown, Minus, Key, Edit, Trash2, AlertTriangle, Copy, Plus
} from "lucide-react"
import { auth } from "@/lib/ConfigFirebase"

// DeviceCard Component
function DeviceCard({ device, onEdit, onDelete, onGenerateToken }: {
  device: Device,
  onEdit: (device: Device) => void,
  onDelete: (device: { id: string; name: string }) => void,
  onGenerateToken: (id: string) => void
}) {
  return (
    <Card key={device.id} className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500 bg-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-gray-800">{device.name}</CardTitle>
          <Badge
            variant={device.status === "online" ? "default" : "destructive"}
            className={device.status === "online" ? "bg-green-500" : "bg-red-500"}
          >
            {device.status === "online" ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
            {device.status === "online" ? "Online" : "Offline"}
          </Badge>
        </div>
        <CardDescription className="flex items-center text-gray-600">
          <MapPin className="h-4 w-4 mr-1 text-blue-500" />
          {device.location}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center text-sm">
            <Calendar className="h-4 w-4 mr-2 text-purple-600" />
            <div>
              <div className="font-medium text-gray-800">Tanggal Registrasi</div>
              <div className="text-xs text-gray-600">{device.registrationDate}</div>
            </div>
          </div>
          <div className="col-span-2 flex items-center text-sm">
            <MapPin className="h-4 w-4 mr-2 text-blue-600" />
            <div>
              <div className="font-medium text-gray-800">Koordinat</div>
              <div className="text-xs text-gray-600">
                {device.coordinates.lat.toFixed(4)}, {device.coordinates.lng.toFixed(4)}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 bg-blue-50 hover:bg-blue-100 border-blue-200" onClick={() => onEdit(device)}>
            <Edit className="h-3 w-3 mr-1 text-blue-600" /> Edit
          </Button>
          <Button variant="outline" size="sm" className="flex-1 bg-green-50 hover:bg-green-100 border-green-200" onClick={() => onGenerateToken(device.id)}>
            <Key className="h-3 w-3 mr-1 text-green-600" /> Token
          </Button>
          <Button variant="outline" size="sm" className="bg-red-50 hover:bg-red-100 border-red-200" onClick={() => onDelete({ id: device.id, name: device.name })}>
            <Trash2 className="h-3 w-3 mr-1 text-red-600" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// AddDeviceDialog Component
function AddDeviceDialog({ open, onOpenChange, onAddDevice, onTokenGenerated, trigger }: {
  open: boolean,
  onOpenChange: (open: boolean) => void,
  onAddDevice: (newDevice: Omit<Device, "id" | "authToken" | "registrationDate" | "userId"> & { authToken?: string, customId?: string }) => Promise<Device>,
  onTokenGenerated: (token: string) => void,
  trigger?: React.ReactNode
}) {
  const [newDevice, setNewDevice] = useState({
    name: "",
    location: "",
    latitude: "",
    longitude: "",
    threshold: "2.0",
    tokenMode: "auto", // "auto" | "manual"
    manualToken: "",
    idMode: "auto", // "auto" | "manual"
    manualId: "",
  })
  const handleAdd = async () => {
    const deviceToAdd: any = {
      name: newDevice.name,
      location: newDevice.location,
      coordinates: {
        lat: parseFloat(newDevice.latitude) || 0,
        lng: parseFloat(newDevice.longitude) || 0,
      },
      threshold: parseFloat(newDevice.threshold) || 2.0,
    }
    if (newDevice.tokenMode === "manual" && newDevice.manualToken) {
      deviceToAdd.authToken = newDevice.manualToken
    }
    if (newDevice.idMode === "manual" && newDevice.manualId) {
      deviceToAdd.customId = newDevice.manualId
    }
    const addedDevice = await onAddDevice(deviceToAdd)
    if (addedDevice && addedDevice.authToken) {
      onTokenGenerated(addedDevice.authToken)
    }
  }
  const handleDetectLocation = async () => {
    try {
      const coords = await fetchDeviceLocation()
      setNewDevice({
        ...newDevice,
        latitude: coords.lat.toString(),
        longitude: coords.lng.toString(),
      })
    } catch (err) {
      alert("Gagal mengambil lokasi perangkat: " + (err as Error).message)
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Stasiun Cuaca Baru</DialogTitle>
          <DialogDescription>Tambahkan stasiun monitoring baru ke jaringan Anda</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name" className="text-gray-800">Nama Stasiun</Label>
            <Input id="name" placeholder="Nama Stasiun" className="placeholder:text-gray-400" value={newDevice.name} onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="location" className="text-gray-800">Lokasi</Label>
            <Input id="location" placeholder="Lokasi Stasiun" className="placeholder:text-gray-400" value={newDevice.location} onChange={(e) => setNewDevice({ ...newDevice, location: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="latitude" className="text-gray-800">Latitude</Label>
              <Input id="latitude" placeholder="-6.2088" type="number" className="placeholder:text-gray-400" value={newDevice.latitude} onChange={(e) => setNewDevice({ ...newDevice, latitude: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="longitude" className="text-gray-800">Longitude</Label>
              <Input id="longitude" placeholder="106.8456" type="number" className="placeholder:text-gray-400" value={newDevice.longitude} onChange={(e) => setNewDevice({ ...newDevice, longitude: e.target.value })} />
            </div>
          </div>
          <Button type="button" variant="secondary" className="w-full mb-2 bg-yellow-100 text-yellow-800 hover:bg-yellow-200" onClick={handleDetectLocation}>
            Deteksi Lokasi Otomatis
          </Button>
          {/* DeviceRef mode selection */}
          <div className="grid gap-2">
            <Label className="text-gray-800">ID Perangkat (deviceRef)</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="idMode"
                  value="auto"
                  checked={newDevice.idMode === "auto"}
                  onChange={() => setNewDevice({ ...newDevice, idMode: "auto" })}
                />
                <span>Otomatis</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="idMode"
                  value="manual"
                  checked={newDevice.idMode === "manual"}
                  onChange={() => setNewDevice({ ...newDevice, idMode: "manual" })}
                />
                <span>Manual</span>
              </label>
            </div>
            {newDevice.idMode === "manual" && (
              <Input
                id="manualId"
                placeholder="Masukkan ID perangkat"
                className="placeholder:text-gray-400 mt-2"
                value={newDevice.manualId}
                onChange={(e) => setNewDevice({ ...newDevice, manualId: e.target.value })}
              />
            )}
          </div>
          {/* Token mode selection */}
          <div className="grid gap-2">
            <Label className="text-gray-800">Token Perangkat</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="tokenMode"
                  value="auto"
                  checked={newDevice.tokenMode === "auto"}
                  onChange={() => setNewDevice({ ...newDevice, tokenMode: "auto" })}
                />
                <span>Otomatis</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="tokenMode"
                  value="manual"
                  checked={newDevice.tokenMode === "manual"}
                  onChange={() => setNewDevice({ ...newDevice, tokenMode: "manual" })}
                />
                <span>Manual</span>
              </label>
            </div>
            {newDevice.tokenMode === "manual" && (
              <Input
                id="manualToken"
                placeholder="Masukkan token perangkat"
                className="placeholder:text-gray-400 mt-2"
                value={newDevice.manualToken}
                onChange={(e) => setNewDevice({ ...newDevice, manualToken: e.target.value })}
              />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="text-gray-600 border-gray-400" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={handleAdd}>Tambah Perangkat</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// EditDeviceDialog Component
function EditDeviceDialog({ open, onOpenChange, device, onEditDevice, setEditingDevice }: {
  open: boolean,
  onOpenChange: (open: boolean) => void,
  device: Device | null,
  onEditDevice: () => Promise<void>,
  setEditingDevice: (device: Device | null) => void
}) {
  if (!device) return null
  const handleDetectLocation = async () => {
    try {
      const coords = await fetchDeviceLocation()
      setEditingDevice({
        ...device,
        coordinates: {
          ...device.coordinates,
          lat: coords.lat,
          lng: coords.lng,
        },
      })
    } catch (err) {
      alert("Gagal mengambil lokasi perangkat: " + (err as Error).message)
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Perangkat</DialogTitle>
          <DialogDescription>Perbarui informasi perangkat, pengaturan, dan metadata</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-name" className="text-gray-800">Nama Stasiun</Label>
            <Input id="edit-name" className="placeholder:text-gray-400" value={device.name} onChange={(e) => setEditingDevice({ ...device, name: e.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-location" className="text-gray-800">Lokasi</Label>
            <Input id="edit-location" className="placeholder:text-gray-400" value={device.location} onChange={(e) => setEditingDevice({ ...device, location: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-lat" className="text-gray-800">Latitude</Label>
              <Input id="edit-lat" type="number" step="0.0001" className="placeholder:text-gray-400" value={device.coordinates.lat} onChange={(e) => setEditingDevice({ ...device, coordinates: { ...device.coordinates, lat: Number.parseFloat(e.target.value) } })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-lng" className="text-gray-800">Longitude</Label>
              <Input id="edit-lng" type="number" step="0.0001" className="placeholder:text-gray-400" value={device.coordinates.lng} onChange={(e) => setEditingDevice({ ...device, coordinates: { ...device.coordinates, lng: Number.parseFloat(e.target.value) } })} />
            </div>
          </div>
          <Button type="button" variant="secondary" className="w-full mb-2 bg-yellow-100 text-yellow-800 hover:bg-yellow-200" onClick={handleDetectLocation}>
            Deteksi Lokasi Otomatis
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" className="text-gray-600 border-gray-400" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={onEditDevice}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// DeleteConfirmationDialog Component
function DeleteConfirmationDialog({ open, onOpenChange, onConfirm, deviceName }: {
  open: boolean,
  onOpenChange: (open: boolean) => void,
  onConfirm: () => void,
  deviceName?: string | null
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            <DialogTitle>Konfirmasi Penghapusan</DialogTitle>
          </div>
          <DialogDescription>
            Apakah Anda yakin ingin menghapus perangkat <strong>{deviceName || "ini"}</strong>? Tindakan ini tidak dapat dibatalkan.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button variant="destructive" onClick={() => { onConfirm(); onOpenChange(false) }}>Hapus</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// DeviceTokenDialog Component
function DeviceTokenDialog({ open, onOpenChange, token }: {
  open: boolean,
  onOpenChange: (open: boolean) => void,
  token: string
}) {
  const { toast } = useToast()
  const copyTokenToClipboard = () => {
    navigator.clipboard.writeText(token)
    toast({
      title: "Disalin",
      description: "Token perangkat disalin ke clipboard!",
    })
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Token Perangkat</DialogTitle>
          <DialogDescription>Gunakan token ini untuk mengautentikasi perangkat IoT Anda</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <code className="text-sm font-mono break-all text-blue-700">{token}</code>
              <Button variant="outline" size="sm" onClick={copyTokenToClipboard} className="ml-2 bg-blue-100 text-blue-700 hover:bg-blue-200">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="text-sm text-blue-500">
            <p>Simpan token ini dengan aman. Token ini tidak akan kedaluwarsa.</p>
          </div>
        </div>
        <DialogFooter>
          <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => onOpenChange(false)}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Main Page Component
export default function PerangkatPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showTokenDialog, setShowTokenDialog] = useState(false)
  const [editingDevice, setEditingDevice] = useState<Device | null>(null)
  const [deletingDevice, setDeletingDevice] = useState<{ id: string; name: string } | null>(null)
  const [token, setToken] = useState<string>("")
  const [uid, setUid] = useState<string | null>(null)

  // Replace with actual userId from auth/session
  // const userId = "demo-user-id"

  useEffect(() => {
    // Ambil uid dari Firebase Auth
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUid(user ? user.uid : null)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const loadDevices = async () => {
      if (!uid) return
      setLoading(true)
      const fetched = await fetchDevices(uid)
      setDevices(fetched as Device[])
      setLoading(false)
    }
    loadDevices()
  }, [uid])

  const handleAddDevice = async (newDevice: Omit<Device, "id" | "authToken" | "registrationDate" | "userId">) => {
    if (!uid) return
    const added = await addDevice({ ...newDevice, userId: uid })
    setDevices((prev) => [...prev, added as Device])
    setShowAddDialog(false)
    return added
  }

  const handleEditDevice = async () => {
    if (!editingDevice) return
    const updated = await updateDevice(editingDevice.id, editingDevice)
    if (updated) {
      setDevices((prev) =>
        prev.map((d) => (d.id === updated.id ? { ...d, ...updated } : d))
      )
    }
    setShowEditDialog(false)
    setEditingDevice(null)
  }

  const handleDeleteDevice = async () => {
    if (!deletingDevice) return
    const success = await deleteDevice(deletingDevice.id)
    if (success) {
      setDevices((prev) => prev.filter((d) => d.id !== deletingDevice.id))
    }
    setShowDeleteDialog(false)
    setDeletingDevice(null)
  }

  const handleGenerateToken = async (id: string) => {
    const result = await generateDeviceToken(id)
    if (result) {
      setToken(result.token)
      setShowTokenDialog(true)
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Daftar Perangkat</h1>
        <AddDeviceDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onAddDevice={handleAddDevice}
          onTokenGenerated={(token) => { setToken(token); setShowTokenDialog(true) }}
          trigger={
            <Button
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              onClick={() => setShowAddDialog(true)}
            >
              Tambah Perangkat
            </Button>
          }
        />
      </div>
      {loading ? (
        <div>Memuat perangkat...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {devices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              onEdit={(d) => { setEditingDevice(d); setShowEditDialog(true) }}
              onDelete={(d) => { setDeletingDevice(d); setShowDeleteDialog(true) }}
              onGenerateToken={handleGenerateToken}
            />
          ))}
        </div>
      )}

      <EditDeviceDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        device={editingDevice}
        onEditDevice={handleEditDevice}
        setEditingDevice={setEditingDevice}
      />

      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDeleteDevice}
        deviceName={deletingDevice?.name}
      />

      <DeviceTokenDialog
        open={showTokenDialog}
        onOpenChange={setShowTokenDialog}
        token={token}
      />
    </div>
  )
}