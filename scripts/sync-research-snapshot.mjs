import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sources = {
  analysis: join(appRoot, "research_inputs/analysis.json"),
  stations: join(appRoot, "research_inputs/station_effects.csv"),
};
const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const sha256 = async (path) => createHash("sha256").update(await readFile(path)).digest("hex");

const analysis = await readJson(sources.analysis);
const [header, ...rows] = (await readFile(sources.stations, "utf8")).trim().split(/\r?\n/).map((line) => line.split(","));
const index = Object.fromEntries(header.map((name, position) => [name, position]));
const pilot = analysis.pilot_hypothesis_generating;
const confirmation = analysis.confirmatory_primary;
const combined = analysis.combined_supportive;
if (!pilot || !confirmation || !combined) throw new Error("Missing paper evidence summaries");
if (pilot.routes !== 60 || pilot.stations !== 5) throw new Error("Pilot contract changed: expected 60 routes / 5 stations");
if (confirmation.routes !== 144 || confirmation.stations !== 12) throw new Error("Confirmation contract changed: expected 144 routes / 12 stations");
if (rows.length !== 17) throw new Error("Station evidence changed: expected 17 rows");

const statusFor = (gap, relativeGap) => {
  if (gap <= 0.001) return "stable";
  if (gap >= 0.008 || relativeGap >= 0.35) return "critical";
  return "watch";
};
const stations = rows.map((row) => {
  const knownStationScore = Number(row[index.random_oof_jpt]);
  const coldStartScore = Number(row[index.cold_start_jpt]);
  const gap = Number(row[index.mean_delta]);
  const relativeGap = gap / knownStationScore;
  return { id: row[index.station], routes: Number(row[index.routes]), cohort: row[index.phase], knownStationScore, coldStartScore, gap, relativeGap, status: statusFor(gap, relativeGap) };
});
const routes = stations.reduce((sum, station) => sum + station.routes, 0);
const weightedMean = (field) => stations.reduce((sum, station) => sum + station[field] * station.routes, 0) / routes;
const knownStationScore = weightedMean("knownStationScore");
const coldStartScore = weightedMean("coldStartScore");
const gap = coldStartScore - knownStationScore;

const snapshot = {
  schemaVersion: "1.0.0",
  generatedAt: new Date(Math.max((await stat(sources.analysis)).mtimeMs, (await stat(sources.stations)).mtimeMs)).toISOString(),
  provenance: {
    mode: "read-only research snapshot",
    sources: await Promise.all(Object.entries(sources).map(async ([name, path]) => ({ name, path: path.replace(`${appRoot}/`, ""), sha256: await sha256(path) }))),
    note: "Operational statuses are prototype decision rules; route scores are reproduced research evidence.",
  },
  policy: { lowerScoreIsBetter: true, stable: "gap <= 0.001", watch: "gap > 0.001 and gap < 0.008 and relative gap < 35%", critical: "gap >= 0.008 or relative gap >= 35%" },
  overview: {
    routes, stations: stations.length, knownStationScore, coldStartScore, gap,
    relativeDegradation: gap / knownStationScore,
    degradedStations: stations.filter((station) => station.gap > 0).length,
    statusCounts: { stable: stations.filter((station) => station.status === "stable").length, watch: stations.filter((station) => station.status === "watch").length, critical: stations.filter((station) => station.status === "critical").length },
  },
  confirmation: { routes: confirmation.routes, stations: confirmation.stations, knownStationScore: confirmation.random_oof_jpt_mean, coldStartScore: confirmation.cold_start_jpt_mean, relativeDegradation: confirmation.relative_degradation, deltaCi95: confirmation.station_cluster_bootstrap_ci95, degradedStations: confirmation.stations_worse_tied_better[0] },
  stations: stations.sort((a, b) => b.gap - a.gap),
};

const output = join(appRoot, "data/research-snapshot.json");
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Wrote ${output} (${snapshot.overview.stations} stations)`);
