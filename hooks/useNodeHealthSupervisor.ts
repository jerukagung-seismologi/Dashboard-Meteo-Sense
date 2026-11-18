"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { NodeHealthReport } from "@/app/api/system/node-health/route";

interface UseNodeHealthSupervisorOptions {
  enabled?: boolean;
  intervalMs?: number; // default: 120,000 (2 minutes)
  notifyToast?: boolean;
}

export function useNodeHealthSupervisor(options: UseNodeHealthSupervisorOptions = {}) {
  const { enabled = true, intervalMs = 120000, notifyToast = true } = options;
  const { user } = useAuth();
  const { toast } = useToast();

  const [reports, setReports] = useState<NodeHealthReport[]>([]);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Track already notified alert keys to avoid spamming the user on every interval tick
  const notifiedKeysRef = useRef<Set<string>>(new Set());
  const lastCheckTimeRef = useRef<number>(0);

  const runHealthCheck = useCallback(async () => {
    if (!user?.uid || !enabled) return;

    // Skip if page is hidden in background
    if (typeof document !== "undefined" && document.visibilityState !== "visible") {
      return;
    }

    setIsChecking(true);
    setError(null);

    try {
      const res = await fetch("/api/system/node-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Gagal memuat status kesehatan node`);
      }

      const data = await res.json();
      const fetchedReports: NodeHealthReport[] = Array.isArray(data.reports) ? data.reports : [];

      setReports(fetchedReports);
      const now = new Date();
      setLastChecked(now);
      lastCheckTimeRef.current = now.getTime();

      // Trigger user-facing Toast for new alerts
      if (notifyToast) {
        fetchedReports.forEach((item) => {
          if (!item.alert) return;

          const alertKey = `${item.deviceId}_${item.alert.type}`;
          if (!notifiedKeysRef.current.has(alertKey)) {
            notifiedKeysRef.current.add(alertKey);

            if (item.alert.type === "offline") {
              toast({
                title: `⚠️ Stasiun Offline: ${item.deviceName}`,
                description: item.alert.message,
                variant: "destructive",
              });
            } else if (item.alert.type === "battery_critical") {
              toast({
                title: `🔴 Baterai Kritis: ${item.deviceName}`,
                description: item.alert.message,
                variant: "destructive",
              });
            } else if (item.alert.type === "battery_low") {
              toast({
                title: `🟡 Baterai Lemah: ${item.deviceName}`,
                description: item.alert.message,
              });
            }
          }
        });

        // Clean up resolved alerts from notified set
        fetchedReports.forEach((item) => {
          if (item.status === "online") {
            notifiedKeysRef.current.delete(`${item.deviceId}_offline`);
          }
          if (item.batteryStatus === "normal") {
            notifiedKeysRef.current.delete(`${item.deviceId}_battery_low`);
            notifiedKeysRef.current.delete(`${item.deviceId}_battery_critical`);
          }
        });
      }
    } catch (err: any) {
      console.warn("[NodeHealthSupervisor] Error checking health:", err);
      setError(err.message || "Gagal memeriksa kesehatan stasiun");
    } finally {
      setIsChecking(false);
    }
  }, [user?.uid, enabled, notifyToast, toast]);

  // Initial check and periodic interval
  useEffect(() => {
    if (!user?.uid || !enabled) return;

    // Initial check on mount
    runHealthCheck();

    // Periodic runner interval
    const intervalId = setInterval(runHealthCheck, intervalMs);

    // Listen to tab visibility: if user returns to tab after > intervalMs, run immediately
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const timeSinceLast = Date.now() - lastCheckTimeRef.current;
        if (timeSinceLast >= intervalMs * 0.75) {
          runHealthCheck();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user?.uid, enabled, intervalMs, runHealthCheck]);

  const offlineNodes = reports.filter((r) => r.status === "offline");
  const lowBatteryNodes = reports.filter((r) => r.batteryStatus === "low" || r.batteryStatus === "critical");
  const criticalBatteryNodes = reports.filter((r) => r.batteryStatus === "critical");

  return {
    reports,
    offlineNodes,
    lowBatteryNodes,
    criticalBatteryNodes,
    lastChecked,
    isChecking,
    error,
    triggerCheck: runHealthCheck,
  };
}
