"use client"
import React, { useState } from "react"

export default function PerangkatPage() {
  const [showModal, setShowModal] = useState(true)

  return (
    <div>
      {/* Modal Awal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
            <h2 className="text-xl font-bold mb-2">Selamat Datang</h2>
            <p className="mb-4">Ini adalah halaman perangkat. Silakan lanjutkan untuk mengelola perangkat Anda.</p>
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              onClick={() => setShowModal(false)}
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Konten halaman perangkat */}
      <div className="p-4">
        {/* ...existing code... */}
        <h1 className="text-2xl font-semibold">Daftar Perangkat</h1>
        {/* ...existing code... */}
      </div>
    </div>
  )
}