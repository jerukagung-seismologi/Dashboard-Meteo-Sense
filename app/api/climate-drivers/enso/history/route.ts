import { NextResponse } from "next/server";
import { parseEnsoHistory } from "@/lib/climate-drivers/officialClimateParser";

export const revalidate = 3600; // Cache 1 hour

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const yearsStr = searchParams.get("years");
  const years = yearsStr ? Math.max(1, parseInt(yearsStr, 10)) : 5;

  try {
    const result = await parseEnsoHistory(years);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch ENSO history" }, { status: 500 });
  }
}
