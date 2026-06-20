// app/api/reanalysis/geocode/route.ts
import { NextResponse } from "next/server";

export const revalidate = 3600; // Cache city search results for 1 hour

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");

  if (!name) {
    return NextResponse.json({ error: "name parameter is required" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=10&language=id&format=json`
    );

    if (!response.ok) {
      throw new Error(`Open-Meteo Geocoding responded with ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error in GET /api/reanalysis/geocode:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
