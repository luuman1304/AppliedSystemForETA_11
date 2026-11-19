import snapshot from "@/data/research-snapshot.json";
export const dynamic = "force-static";
export async function GET() {
  return Response.json({ schemaVersion: snapshot.schemaVersion, generatedAt: snapshot.generatedAt, provenance: snapshot.provenance, policy: snapshot.policy, overview: snapshot.overview, confirmation: snapshot.confirmation });
}
