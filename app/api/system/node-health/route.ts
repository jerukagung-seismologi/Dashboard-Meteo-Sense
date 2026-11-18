import { NextResponse } from "next/server";
import { db, rtdb } from "@/lib/ConfigFirebase";
import { collection, getDocs, query, Timestamp } from "firebase/firestore";
import { ref, get, set, query as rtdbQuery, orderByKey, limitToLast } from "firebase/database";

export const dynamic = "force-dynamic";

export type NodeAlertType =
  | "offline"
  | "battery_low"
  | "battery_critical"
  | "temp_rapid_rise"
  | "temp_high_warning"
  | "temp_extreme_high"
  | "temp_extreme_low"
  | "temp_sensor_error";

export interface NodeHealthReport {
  deviceId: string;
  deviceName: string;
  location: string;
  status: "online" | "offline";
  lastUpdate: number | null;
  volt: number | null;
  batteryStatus: "normal" | "low" | "critical" | "unknown";
  offlineDurationMinutes: number | null;
  // Fitur Deteksi Suhu & Laju Perubahan
  temperature: number | null;
  tempRiseDelta: number | null;
  tempRiseIntervalMinutes: number | null;
  tempStatus: "normal" | "rapid_rise" | "high_warning" | "extreme_high" | "extreme_low" | "sensor_error";
  alert?: {
    type: NodeAlertType;
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
        const sortedPoints: Array<{ ts: number; data: any }> = [];

        try {
          const dataQuery = rtdbQuery(
            ref(rtdb, `auto_weather_stat/${sensorToken}/data`),
            orderByKey(),
            limitToLast(3)
          );
          const dataSnap = await get(dataQuery);

          if (dataSnap.exists()) {
            dataSnap.forEach((child) => {
              sortedPoints.push({
                ts: Number(child.key) * 1000,
                data: child.val(),
              });
            });
          }
        } catch (err) {
          console.warn(`[NodeHealth] Gagal query RTDB untuk ${sensorToken}:`, err);
        }

        sortedPoints.sort((a, b) => a.ts - b.ts);
        const latestPoint = sortedPoints.length > 0 ? sortedPoints[sortedPoints.length - 1] : null;
        const prevPoint = sortedPoints.length > 1 ? sortedPoints[sortedPoints.length - 2] : null;

        const latestTimestamp = latestPoint ? latestPoint.ts : null;
        const latestData = latestPoint ? latestPoint.data : null;

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

        // Temperature & Rapid Rise Evaluation
        const rawTemp =
          latestData && Number.isFinite(Number(latestData.temperature))
            ? Number(latestData.temperature)
            : null;
        const prevTemp =
          prevPoint && Number.isFinite(Number(prevPoint.data?.temperature))
            ? Number(prevPoint.data.temperature)
            : null;

        let tempRiseDelta: number | null = null;
        let tempRiseIntervalMinutes: number | null = null;
        let tempStatus: NodeHealthReport["tempStatus"] = "normal";

        if (rawTemp !== null) {
          // 1. Cek Anomali Batas Fisik Sensor (Error / Rusak / Korsleting)
          if (rawTemp > 50.0 || rawTemp < 5.0) {
            tempStatus = "sensor_error";
          }
          // 2. Cek Panas Ekstrem (WMO / Standar Iklim Tropis BMKG)
          else if (rawTemp >= 37.0) {
            tempStatus = "extreme_high";
          } else if (rawTemp >= 35.0) {
            tempStatus = "high_warning";
          }
          // 3. Cek Anomali Dingin Tropis (Bediding)
          else if (rawTemp <= 18.0) {
            tempStatus = "extreme_low";
          }

          // 4. Cek Laju Kenaikan Suhu Cepat (Rapid Rise) terhadap titik sebelumnya
          if (prevTemp !== null && latestTimestamp && prevPoint) {
            const dtMin = Math.max(0.5, (latestTimestamp - prevPoint.ts) / 60000);
            const deltaT = rawTemp - prevTemp;
            // Jika lonjakan suhu >= 2.0°C dalam rentang waktu <= 15 menit
            if (dtMin <= 15 && deltaT >= 2.0) {
              tempRiseDelta = Number(deltaT.toFixed(2));
              tempRiseIntervalMinutes = Number(dtMin.toFixed(0));
              if (tempStatus === "normal") {
                tempStatus = "rapid_rise";
              }
            }
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
          const lastTempAlertTs = state.lastTempAlertTs || 0;
          const lastTempAlertType = state.lastTempAlertType || "normal";

          // 1. Offline Alert Handling
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

          // 2. Battery Alert Handling
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

          // 3. Temperature & Rapid Rise Alert Handling
          let tempAlertMsg: string | null = null;
          let tempAlertSev: "high" | "medium" = "medium";
          let tempAlertTyp: NodeAlertType | null = null;

          if (tempStatus === "sensor_error" && rawTemp !== null) {
            tempAlertTyp = "temp_sensor_error";
            tempAlertSev = "high";
            tempAlertMsg = `Anomali Sensor Suhu: Pembacaan ${rawTemp.toFixed(1)}°C pada ${device.name} melampaui batas fisik instrumen!`;
          } else if (tempStatus === "extreme_high" && rawTemp !== null) {
            tempAlertTyp = "temp_extreme_high";
            tempAlertSev = "high";
            tempAlertMsg = `Bahaya Panas Ekstrem: Suhu stasiun ${device.name} mencapai ${rawTemp.toFixed(1)}°C (Melampaui batas aman BMKG)!`;
          } else if (tempStatus === "rapid_rise" && rawTemp !== null && tempRiseDelta !== null) {
            tempAlertTyp = "temp_rapid_rise";
            tempAlertSev = tempRiseDelta >= 3.0 ? "high" : "medium";
            tempAlertMsg = `Lonjakan Suhu Cepat: Stasiun ${device.name} naik +${tempRiseDelta.toFixed(1)}°C dalam ${tempRiseIntervalMinutes || 5} menit (Suhu: ${rawTemp.toFixed(1)}°C).`;
          } else if (tempStatus === "high_warning" && rawTemp !== null) {
            tempAlertTyp = "temp_high_warning";
            tempAlertSev = "medium";
            tempAlertMsg = `Waspada Suhu Tinggi: Suhu stasiun ${device.name} sangat panas (${rawTemp.toFixed(1)}°C).`;
          } else if (tempStatus === "extreme_low" && rawTemp !== null) {
            tempAlertTyp = "temp_extreme_low";
            tempAlertSev = "medium";
            tempAlertMsg = `Peringatan Anomali Dingin: Suhu stasiun ${device.name} drop ke ${rawTemp.toFixed(1)}°C (di bawah normal iklim tropis).`;
          }

          if (tempAlertMsg && tempAlertTyp) {
            // Priority: if no alert yet, or if temp alert is high severity
            if (!alert || tempAlertSev === "high") {
              alert = {
                type: tempAlertTyp,
                severity: tempAlertSev,
                message: tempAlertMsg,
              };
            }

            // Deduplication log in RTDB: log once per alert type or every 2 hours
            if (lastTempAlertType !== tempAlertTyp || now - lastTempAlertTs > 2 * 3600 * 1000) {
              const logRef = ref(rtdb, `logs/${userId}/${now + 2}`);
              await set(logRef, {
                deviceId: device.id,
                type: "threshold",
                message: tempAlertMsg,
                severity: tempAlertSev,
                timestamp: now,
                device: device.name,
                userId,
              });
              state.lastTempAlertTs = now;
              state.lastTempAlertType = tempAlertTyp;
            }
          } else {
            state.lastTempAlertType = "normal";
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
          temperature: rawTemp,
          tempRiseDelta,
          tempRiseIntervalMinutes,
          tempStatus,
          alert,
        };
      })
    );

    const offlineCount = reports.filter((r) => r.status === "offline").length;
    const lowBatteryCount = reports.filter((r) => r.batteryStatus === "low").length;
    const criticalBatteryCount = reports.filter((r) => r.batteryStatus === "critical").length;
    const abnormalTempCount = reports.filter((r) => r.tempStatus && r.tempStatus !== "normal").length;
    const rapidRiseCount = reports.filter((r) => r.tempStatus === "rapid_rise").length;
    const extremeHeatCount = reports.filter((r) => r.tempStatus === "extreme_high" || r.tempStatus === "high_warning").length;

    return NextResponse.json({
      success: true,
      timestamp: now,
      nodesChecked: reports.length,
      offlineCount,
      lowBatteryCount,
      criticalBatteryCount,
      abnormalTempCount,
      rapidRiseCount,
      extremeHeatCount,
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
