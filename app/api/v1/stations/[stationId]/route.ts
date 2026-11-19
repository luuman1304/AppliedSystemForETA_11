import snapshot from "@/data/research-snapshot.json";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{ stationId: string }> }) {
  const { stationId } = await context.params;
  const station = snapshot.stations.find((item) => item.id === stationId);
  if (!station) return Response.json({ error: "STATION_NOT_FOUND", stationId }, { status: 404 });
  return Response.json({ station, policy: snapshot.policy });
}
