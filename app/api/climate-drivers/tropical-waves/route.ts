// app/api/climate-drivers/tropical-waves/route.ts
import { NextResponse } from "next/server";

export const revalidate = 3600; // Cache for 1 hour

const BOM_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": "https://www.bom.gov.au/climate/mjo/",
  "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // 1. Fetch available daily dates
    if (action === "dates") {
      try {
        const res = await fetch("https://www.bom.gov.au/clim_data/IDCK000080/plot_dates.txt", {
          headers: BOM_HEADERS,
          next: { revalidate: 1800 },
        });

        if (res.ok) {
          const text = await res.text();
          const dates = text
            .trim()
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => /^\d{4}-\d{2}-\d{2}$/.test(line));

          if (dates.length > 0) {
            return NextResponse.json({ dates });
          }
        }
      } catch (err) {
        console.warn("Failed to fetch plot_dates.txt from BOM, generating fallback dates:", err);
      }

      // Fallback: generate last 14 dates up to today
      const fallbackDates: string[] = [];
      const now = new Date();
      for (let i = 0; i < 14; i++) {
        const d = new Date(now.getTime() - i * 86400000);
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, "0");
        const day = String(d.getUTCDate()).padStart(2, "0");
        fallbackDates.push(`${y}-${m}-${day}`);
      }
      return NextResponse.json({ dates: fallbackDates.reverse() });
    }

    // 2. Proxy image requests
    const wave = searchParams.get("wave") || "mjo";
    const type = searchParams.get("type") || "map";
    const dateParam = searchParams.get("date");
    const days = searchParams.get("days") || "40";

    let targetUrl = "";
    let contentType = "image/png";

    if (type === "schematic") {
      if (wave === "kelvin") {
        targetUrl = "https://www.bom.gov.au/climate/mjo/about/eq_kelvin_wave.png";
      } else if (wave === "eq_rossby") {
        targetUrl = "https://www.bom.gov.au/climate/mjo/about/eq_rossby_wave.png";
      } else if (wave === "gravity" || wave === "mrg") {
        targetUrl = "https://www.bom.gov.au/climate/mjo/about/mixed_rossby_gravity.png";
      } else {
        // Fallback for MJO schematic or default
        targetUrl = "https://www.bom.gov.au/climate/mjo/about/eq_kelvin_wave.png";
      }
    } else if (type === "phase_diagram") {
      contentType = "image/gif";
      if (days === "90") {
        targetUrl = "https://www.bom.gov.au/clim_data/IDCKGEM000/rmm.phase.Last90days.gif";
      } else {
        targetUrl = "https://www.bom.gov.au/clim_data/IDCKGEM000/rmm.phase.Last40days.gif";
      }
    } else {
      // type === "map"
      let cleanDate = "20261025";
      if (dateParam) {
        cleanDate = dateParam.replace(/-/g, "");
      } else {
        const now = new Date();
        const y = now.getUTCFullYear();
        const m = String(now.getUTCMonth() + 1).padStart(2, "0");
        const d = String(now.getUTCDate()).padStart(2, "0");
        cleanDate = `${y}${m}${d}`;
      }

      const validWave = ["mjo", "kelvin", "eq_rossby", "gravity"].includes(wave) ? wave : "mjo";
      targetUrl = `https://www.bom.gov.au/clim_data/IDCK000080/${validWave}.tropical_waves.daily.glb_tropics.${cleanDate}.hr.png`;
    }

    const imgRes = await fetch(targetUrl, {
      headers: BOM_HEADERS,
      next: { revalidate: 3600 },
    });

    if (!imgRes.ok) {
      // If today's date not yet published, try previous day
      if (type === "map" && dateParam) {
        const prevDateObj = new Date(
          parseInt(dateParam.slice(0, 4), 10),
          parseInt(dateParam.slice(4, 6), 10) - 1,
          parseInt(dateParam.slice(6, 8), 10) - 1
        );
        const prevClean = `${prevDateObj.getFullYear()}${String(prevDateObj.getMonth() + 1).padStart(2, "0")}${String(prevDateObj.getDate()).padStart(2, "0")}`;
        const retryUrl = `https://www.bom.gov.au/clim_data/IDCK000080/${wave}.tropical_waves.daily.glb_tropics.${prevClean}.hr.png`;
        const retryRes = await fetch(retryUrl, { headers: BOM_HEADERS });
        if (retryRes.ok) {
          const arrayBuffer = await retryRes.arrayBuffer();
          return new NextResponse(arrayBuffer, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=3600, s-maxage=86400",
            },
          });
        }
      }

      return NextResponse.json(
        { error: `Failed to fetch image from BOM (Status: ${imgRes.status})`, targetUrl },
        { status: imgRes.status }
      );
    }

    const arrayBuffer = await imgRes.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch (error: any) {
    console.error("Error in /api/climate-drivers/tropical-waves:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
