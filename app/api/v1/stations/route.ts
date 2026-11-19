import snapshot from "@/data/research-snapshot.json";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status");
  const cohort = request.nextUrl.searchParams.get("cohort");
  const stations = snapshot.stations.filter((station) => (!status || station.status === status) && (!cohort || station.cohort === cohort));
  return Response.json({ total: stations.length, filters: { status, cohort }, stations });
}
