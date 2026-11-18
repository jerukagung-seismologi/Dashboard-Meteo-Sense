"use client";

import React, { createContext, useContext } from "react";
import { useNodeHealthSupervisor } from "@/hooks/useNodeHealthSupervisor";
import type { NodeHealthReport } from "@/app/api/system/node-health/route";

export interface NodeHealthContextValue {
  reports: NodeHealthReport[];
  offlineNodes: NodeHealthReport[];
  lowBatteryNodes: NodeHealthReport[];
  criticalBatteryNodes: NodeHealthReport[];
  abnormalTempNodes: NodeHealthReport[];
  rapidRiseNodes: NodeHealthReport[];
  extremeTempNodes: NodeHealthReport[];
  lastChecked: Date | null;
  isChecking: boolean;
  error: string | null;
  triggerCheck: () => Promise<void>;
}

const NodeHealthContext = createContext<NodeHealthContextValue | null>(null);

export function NodeHealthProvider({ children }: { children: React.ReactNode }) {
  const supervisor = useNodeHealthSupervisor({
    enabled: true,
    intervalMs: 120000, // Tiap 2 menit
    notifyToast: true,
  });

  return (
    <NodeHealthContext.Provider value={supervisor}>
      {children}
    </NodeHealthContext.Provider>
  );
}

export function useNodeHealth(): NodeHealthContextValue {
  const context = useContext(NodeHealthContext);
  if (!context) {
    return {
      reports: [],
      offlineNodes: [],
      lowBatteryNodes: [],
      criticalBatteryNodes: [],
      abnormalTempNodes: [],
      rapidRiseNodes: [],
      extremeTempNodes: [],
      lastChecked: null,
      isChecking: false,
      error: null,
      triggerCheck: async () => {},
    };
  }
  return context;
}
