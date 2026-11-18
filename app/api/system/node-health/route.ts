import { NextResponse } from "next/server";
import { db, rtdb } from "@/lib/ConfigFirebase";
import { collection, getDocs, query, Timestamp } from "firebase/firestore";
import { ref, get, set, query as rtdbQuery, orderByKey, limitToLast } from "firebase/database";

export const dynamic = "force-dynamic";

export interface NodeHealthReport {
  deviceId: string;
  deviceName: string;
  location: string;
  status: "online" | "offline";
  lastUpdate: number | null;
  volt: number | null;
  batteryStatus: "normal" | "low" | "critical" | "unknown";
  offlineDurationMinutes: number | null;
  alert?: {
    type: "offline" | "battery_low" | "battery_critical";
    severity: "high" | "medium";
    message: string;
  };
}

export async function POST(request: Request) {
  try {
    let body: { userId?: string } = {};
    try {
      body = await request.json();
    } catch {
      // Body may be empty in some requests
    }

    const { searchParams } = new URL(request.url);
    const userId = body.userId || searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // 1. Fetch registered devices for this user
    const devicesRef = collection(db, "devices");
    const q = query(devicesRef);
    const querySnapshot = await getDocs(q);

    const userDevices = querySnapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || doc.id,
          location: data.location || "Lokasi AWS",
          userId: data.userId,
          authToken: data.authToken,
        };
      })
      .filter((d) => !d.userId || d.userId === userId);

    if (userDevices.length === 0) {
      return NextResponse.json({
        success: true,
        timestamp: Date.now(),
        nodesChecked: 0,
        offlineCount: 0,
        lowBatteryCount: 0,
        criticalBatteryCount: 0,
        reports: [],
      });
    }

    const now = Date.now();
    const threeMinutesMs = 3 * 60 * 1000;

    // 2. Check each device in parallel
    const reports: NodeHealthReport[] = await Promise.all(
      userDevices.map(async (device) => {
        const sensorToken = device.authToken || device.id;
        let latestTimestamp: number | null = null;
        let latestData: any = null;

        try {
          const dataQuery = rtdbQuery(
            ref(rtdb, `auto_weather_stat/${sensorToken}/data`),
            orderByKey(),
            limitToLast(1)
          );
          const dataSnap = await get(dataQuery);

          if (dataSnap.exists()) {
            dataSnap.forEach((child) => {
              latestTimestamp = Number(child.key) * 1000;
              latestData = child.val();
            });
          }
        } catch (err) {
          console.warn(`[NodeHealth] Gagal query RTDB untuk ${sensorToken}:`, err);
        }

        const timeDiff = latestTimestamp ? now - latestTimestamp : null;
        const isOffline = !latestTimestamp || (timeDiff !== null && timeDiff > threeMinutesMs);
        const offlineMin = isOffline && timeDiff ? Math.floor(timeDiff / 60000) : null;

        // Battery Evaluation
        const voltVal = latestData ? latestData.volt : undefined;
        const rawVolt = voltVal != null && Number.isFinite(Number(voltVal)) ? Number(voltVal) : null;
        let batteryStatus: "normal" | "low" | "critical" | "unknown" = "unknown";

        if (rawVolt !== null && rawVolt > 0) {
          if (rawVolt > 6.0) {
            // 12V Battery Bank / Solar System
            if (rawVolt < 11.2) batteryStatus = "critical";
            else if (rawVolt < 11.8) batteryStatus = "low";
            else batteryStatus = "normal";
          } else {
            // 3.7V / 4.2V Li-Ion 18650 System
            if (rawVolt < 3.40) batteryStatus = "critical";
            else if (rawVolt < 3.55) batteryStatus = "low";
            else batteryStatus = "normal";
          }
        }

        // Deduplicated State Check
        let alert: NodeHealthReport["alert"] = undefined;
        try {
          const stateRef = ref(rtdb, `system/node_health_state/${userId}/${device.id}`);
          const stateSnap = await get(stateRef);
          const state = stateSnap.exists() ? stateSnap.val() : {};

          const lastStatus = state.lastStatus || "unknown";
          const lastOfflineAlertTs = state.lastOfflineAlertTs || 0;
          const lastBatteryAlertTs = state.lastBatteryAlertTs || 0;

          // Offline Alert Handling
          if (isOffline) {
            const timeDesc = offlineMin !== null && offlineMin > 0 ? `${offlineMin} menit` : "beberapa waktu";
            const offlineMsg = `Stasiun ${device.name} terputus (Offline). Tidak ada data masuk selama ${timeDesc}.`;
            
            alert = {
              type: "offline",
              severity: "high",
              message: offlineMsg,
            };

            // Trigger log if status changed from online, or reminder every 6 hours
            if (lastStatus !== "offline" || now - lastOfflineAlertTs > 6 * 3600 * 1000) {
              const logRef = ref(rtdb, `logs/${userId}/${now}`);
              await set(logRef, {
                deviceId: device.id,
                type: "disconnection",
                message: offlineMsg,
                severity: "high",
                timestamp: now,
                device: device.name,
                userId,
              });
              state.lastOfflineAlertTs = now;
            }
            state.lastStatus = "offline";
          } else {
            // Online Recovery
            if (lastStatus === "offline") {
              const recoveryRef = ref(rtdb, `logs/${userId}/${now}`);
              await set(recoveryRef, {
                deviceId: device.id,
                type: "connection",
                message: `Stasiun ${device.name} kembali terhubung (Online).`,
                severity: "low",
                timestamp: now,
                device: device.name,
                userId,
              });
            }
            state.lastStatus = "online";
          }

          // Battery Alert Handling
          if (batteryStatus === "critical") {
            const critMsg = `Tegangan baterai ${device.name} kritis (${rawVolt!.toFixed(2)} V). Risiko stasiun padam segera!`;
            if (!alert) {
              alert = {
                type: "battery_critical",
                severity: "high",
                message: critMsg,
              };
            }
            if (now - lastBatteryAlertTs > 3 * 3600 * 1000) {
              const logRef = ref(rtdb, `logs/${userId}/${now + 1}`);
              await set(logRef, {
                deviceId: device.id,
                type: "threshold",
                message: critMsg,
                severity: "high",
                timestamp: now,
                device: device.name,
                userId,
              });
              state.lastBatteryAlertTs = now;
            }
          } else if (batteryStatus === "low") {
            const lowMsg = `Tegangan baterai ${device.name} rendah (${rawVolt!.toFixed(2)} V). Harap periksa pengisian solar cell.`;
            if (!alert) {
              alert = {
                type: "battery_low",
                severity: "medium",
                message: lowMsg,
              };
            }
            if (now - lastBatteryAlertTs > 6 * 3600 * 1000) {
              const logRef = ref(rtdb, `logs/${userId}/${now + 1}`);
              await set(logRef, {
                deviceId: device.id,
                type: "threshold",
                message: lowMsg,
                severity: "medium",
                timestamp: now,
                device: device.name,
                userId,
              });
              state.lastBatteryAlertTs = now;
            }
          }

          state.lastCheckedTs = now;
          await set(stateRef, state);
        } catch (err) {
          console.warn(`[NodeHealth] Gagal memproses deduplikasi log untuk ${device.id}:`, err);
        }

        return {
          deviceId: device.id,
          deviceName: device.name,
          location: device.location,
          status: isOffline ? "offline" : "online",
          lastUpdate: latestTimestamp,
          volt: rawVolt,
          batteryStatus,
          offlineDurationMinutes: offlineMin,
          alert,
        };
      })
    );

    const offlineCount = reports.filter((r) => r.status === "offline").length;
    const lowBatteryCount = reports.filter((r) => r.batteryStatus === "low").length;
    const criticalBatteryCount = reports.filter((r) => r.batteryStatus === "critical").length;

    return NextResponse.json({
      success: true,
      timestamp: now,
      nodesChecked: reports.length,
      offlineCount,
      lowBatteryCount,
      criticalBatteryCount,
      reports,
    });
  } catch (error: any) {
    console.error("[NodeHealth] Error running health check:", error);
    return NextResponse.json(
      { error: "Gagal memeriksa kesehatan node", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
