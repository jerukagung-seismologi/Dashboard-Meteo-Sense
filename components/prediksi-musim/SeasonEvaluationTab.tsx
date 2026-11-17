"use client";

import React from "react";
import {
  SeasonId,
  HujanRecord,
  KemarauRecord,
} from "@/lib/seasonalPredictionTypes";

interface SeasonEvaluationTabProps {
  record: HujanRecord | KemarauRecord;
  season: SeasonId;
  isDarkMode?: boolean;
  climateDesc?: string;
  year?: number;
}

export default function SeasonEvaluationTab({
  record,
  season,
  isDarkMode = false,
  climateDesc,
  year,
}: SeasonEvaluationTabProps) {
  const isHujan = season === "hujan";
  const hRec = record as HujanRecord;
  const kRec = record as KemarauRecord;

  // Nilai Prediksi & Realisasi
  const predLabel = isHujan ? hRec.prakiraan_amh_label : kRec.prakiraan_amk_label;
  const realLabel = isHujan ? hRec.realisasi_amh_label : kRec.realisasi_amk_label;
  const predNormal = record.perbandingan_terhadap_normal;
  const realNormal = isHujan ? hRec.realisasi_perbandingan_terhadap_normal : kRec.realisasi_perbandingan_terhadap_normal;

  const predSifat = isHujan ? hRec.prakiraan_sifat_hujan : kRec.prakiraan_sifat_hujan_mk;
  const realSifat = isHujan
    ? hRec.realisasi_sifat_hujan
    : (kRec.realisasi_sifat_hujan || (kRec as unknown as Record<string, unknown>).realisasi_sifat_hujan_mk as string | undefined);
  const statusSifat = isHujan ? hRec.status_evaluasi_sifat : kRec.status_evaluasi_sifat;

  const selisihDasarian = record.selisih_dasarian_eval ?? 0;
  const statusAwal = isHujan ? hRec.status_evaluasi_amh : kRec.status_evaluasi_amk;

  const predPuncak = isHujan ? hRec.prakiraan_puncak_bulan : kRec.prakiraan_pmk_bulan;
  const normPuncak = isHujan ? hRec.normal_puncak_bulan : kRec.normal_pmk_bulan;

  // Warna badge selisih
  const isExact = Math.abs(selisihDasarian) < 0.1;
  const isNear = Math.abs(selisihDasarian) <= 1.0;
  const diffBadgeColor = isExact
    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
    : isNear
    ? "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30"
    : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";

  // Warna badge sifat
  const isSifatTepat = statusSifat === "Tepat";
  const sifatBadgeColor = isSifatTepat
    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
    : "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";

  return (
    <div className="space-y-4 text-xs sm:text-sm">
      {/* Banner Ringkasan Kinerja */}
      <div
        className={`p-3.5 rounded-xl border transition-colors ${
          isDarkMode
            ? "bg-slate-800/80 border-slate-700"
            : "bg-slate-50 border-slate-200"
        }`}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100">
            <span>🎯</span>
            <span>Evaluasi Model Prediksi vs Realisasi Lapangan</span>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-medium border ${diffBadgeColor}`}
          >
            {isExact
              ? "Akurasi Sempurna (0 Dasarian)"
              : `${Math.abs(selisihDasarian)} Dasarian (~${Math.round(
                  Math.abs(selisihDasarian) * 10
                )} Hari)`}
          </span>
        </div>
        <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed">
          Verifikasi hasil inferensi model <em>Leave-One-Year-Out</em> (LOYO)
          terhadap data realisasi aktual observasi iklim tahun{" "}
          <strong>{year ?? ""}</strong> untuk wilayah {record.desa ? `Desa ${record.desa}, ` : ""}Kecamatan{" "}
          <strong>{record.kecamatan}</strong>.
        </p>
      </div>

      {/* Grid 2 Kolom Komparasi */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Kartu 1: Awal Musim */}
        <div
          className={`p-3 rounded-xl border flex flex-col justify-between ${
            isDarkMode
              ? "bg-slate-800/50 border-slate-700"
              : "bg-white border-slate-200 shadow-sm"
          }`}
        >
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              {isHujan ? "Awal Musim Hujan (AMH)" : "Awal Musim Kemarau (AMK)"}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 text-xs">
                  Prediksi Model:
                </span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {predLabel ?? "-"} ({predNormal ?? "-"})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 text-xs">
                  Realisasi Lapangan:
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {realLabel ?? "-"} ({realNormal ?? "-"})
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Keterangan:{" "}
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {statusAwal ?? "Sesuai"}
              </span>
            </div>
          </div>
        </div>

        {/* Kartu 2: Sifat Hujan */}
        <div
          className={`p-3 rounded-xl border flex flex-col justify-between ${
            isDarkMode
              ? "bg-slate-800/50 border-slate-700"
              : "bg-white border-slate-200 shadow-sm"
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Sifat Hujan Musim
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${sifatBadgeColor}`}
              >
                {statusSifat ?? (isSifatTepat ? "Tepat" : "Meleset")}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 text-xs">
                  Prediksi Model:
                </span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {predSifat ?? "-"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 text-xs">
                  Realisasi Lapangan:
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {realSifat ?? "-"}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Evaluasi Akumulasi:{" "}
              <span
                className={`font-medium ${
                  isSifatTepat
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {isSifatTepat
                  ? "Kategori volume curah hujan cocok"
                  : `Model prediksi ${predSifat}, lapangan ${realSifat}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Baris Bawah: Puncak Musim & Konteks Iklim */}
      <div
        className={`p-3.5 rounded-xl border ${
          isDarkMode
            ? "bg-slate-800/40 border-slate-700"
            : "bg-slate-50/70 border-slate-200"
        }`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Puncak Musim
            </div>
            <div className="text-xs text-slate-700 dark:text-slate-200">
              Prediksi Puncak: <strong>{predPuncak ?? "-"}</strong>
              <br />
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                Normal Rata-rata: {normPuncak ?? "-"}
              </span>
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Dinamika Atmosfer & Iklim Global
            </div>
            <div className="text-xs text-slate-700 dark:text-slate-200">
              <strong>{climateDesc ?? "Kondisi Netral"}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

