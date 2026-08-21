import { NextResponse } from "next/server";
import { parseMjoHistory } from "@/lib/climate-drivers/officialClimateParser";

export const revalidate = 3600; // Cache 1 hour

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const yearsStr = searchParams.get("years");
  const daysStr = searchParams.get("days");
  
  let days = 1825; // 5 years default
  if (daysStr) {
    days = Math.max(30, parseInt(daysStr, 10));
  } else if (yearsStr) {
    days = Math.max(1, parseInt(yearsStr, 10)) * 365;
  }

  try {
    const result = await parseMjoHistory(days);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch MJO history" }, { status: 500 });
  }
}
