"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Copy } from "lucide-react"

interface DeviceTokenDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  token: string
}

export function DeviceTokenDialog({ open, onOpenChange, token }: DeviceTokenDialogProps) {
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
