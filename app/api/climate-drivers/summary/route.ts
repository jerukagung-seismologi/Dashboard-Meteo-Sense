// app/api/climate-drivers/summary/route.ts
import { NextResponse } from "next/server";
import { fetchLiveEnsoData, fetchLiveMjoData, fetchLiveIodData } from "@/lib/climate-drivers/liveClimateFetcher";

export const revalidate = 3600; // Cache for 1 hour

export async function GET() {
  try {
    const [enso, mjo, iod] = await Promise.all([
      fetchLiveEnsoData(),
      fetchLiveMjoData(),
      fetchLiveIodData(),
    ]);

    const summary = {
      enso: {
        status: enso.status,
        oni: enso.oni,
        description: enso.summary,
        dataSource: enso.dataSource,
      },
      mjo: {
        phase: mjo.phase,
        amplitude: mjo.amplitude,
        status: mjo.status,
        convectionOverMC: mjo.convectionOverMC,
        description: mjo.summary,
        dataSource: mjo.dataSource,
      },
      iod: {
        dmi: iod.dmi,
        status: iod.status,
        description: iod.summary,
        dataSource: iod.dataSource,
      },
      lastUpdated: enso.lastUpdated || mjo.lastUpdated || iod.lastUpdated || "Agustus 2026",
    };

    return NextResponse.json(summary);
  } catch (error: any) {
    console.error("Error in GET /api/climate-drivers/summary:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch climate summary" },
      { status: 500 }
    );
  }
}
