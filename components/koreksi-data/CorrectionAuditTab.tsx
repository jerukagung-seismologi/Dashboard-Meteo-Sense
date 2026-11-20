"use client";

import React from "react";
import { History, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SensorCorrectionAuditLog } from "@/lib/FetchingSensorData";

export interface CorrectionAuditTabProps {
  selectedStationName: string;
  sensorId: string;
  loadAuditTrail: (targetSensorId?: string) => Promise<void>;
  loadingAudit: boolean;
  auditLogs: SensorCorrectionAuditLog[];
}

export function CorrectionAuditTab({
  selectedStationName,
  sensorId,
  loadAuditTrail,
  loadingAudit,
  auditLogs,
}: CorrectionAuditTabProps) {
  return (
    <div className="space-y-4 mt-4">
      <Card className="border shadow-sm">
        <CardHeader className="py-4 px-5 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <History className="h-4 w-4 text-indigo-500" />
              Riwayat Audit Koreksi ({selectedStationName})
            </CardTitle>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => loadAuditTrail(sensorId)}
            disabled={loadingAudit}
            className="text-xs h-8"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 mr-1 ${loadingAudit ? "animate-spin" : ""}`}
            />
            Segarkan Histori
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {auditLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">
                Belum ada riwayat koreksi batch yang tercatat pada stasiun ini.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {auditLogs.map((log, idx) => (
                <div
                  key={log.id || idx}
                  className="p-4 hover:bg-slate-50 dark:hover:bg-slate-900/40 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-indigo-400 text-indigo-600 dark:text-indigo-300 font-mono text-[10px]"
                      >
                        {log.method.toUpperCase()}
                      </Badge>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Parameter:{" "}
                        <span className="font-mono text-indigo-600 dark:text-indigo-400">
                          {log.field}
                        </span>
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-600 dark:text-slate-400">
                        {log.pointCount} Titik Data Terkoreksi
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {log.appliedAt} oleh <strong>{log.appliedBy}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
                    <div>
                      <strong>Rentang Waktu:</strong> {log.range.startDateFormatted} s/d{" "}
                      {log.range.endDateFormatted}
                    </div>
                    <div>
                      <strong>Parameter Operasi:</strong> {JSON.stringify(log.parameters)}
                    </div>
                    {log.notes && (
                      <div className="col-span-full pt-1 text-slate-700 dark:text-slate-300 italic">
                        &quot;{log.notes}&quot;
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
