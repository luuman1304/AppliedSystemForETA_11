import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const snapshot = JSON.parse(await readFile(new URL("../data/research-snapshot.json", import.meta.url)));
const evidence = JSON.parse(await readFile(new URL("../research_inputs/analysis.json", import.meta.url)));
const pilot = evidence.pilot_hypothesis_generating;
const confirmation = evidence.confirmatory_primary;
const combined = evidence.combined_supportive;

test("snapshot preserves complete research cohort", () => {
  assert.equal(snapshot.overview.stations, 17); assert.equal(snapshot.overview.routes, 204); assert.equal(snapshot.stations.length, 17);
  assert.equal(new Set(snapshot.stations.map((item) => item.id)).size, 17);
  assert.ok(snapshot.stations.every((item) => item.routes === 12));
});
test("weighted network means match source artifacts", () => {
  const routes = pilot.routes + confirmation.routes;
  const expectedKnown = (pilot.random_oof_jpt_mean * pilot.routes + confirmation.random_oof_jpt_mean * confirmation.routes) / routes;
  const expectedCold = (pilot.cold_start_jpt_mean * pilot.routes + confirmation.cold_start_jpt_mean * confirmation.routes) / routes;
  assert.ok(Math.abs(snapshot.overview.knownStationScore - expectedKnown) < 1e-12);
  assert.ok(Math.abs(snapshot.overview.coldStartScore - expectedCold) < 1e-12);
  assert.ok(Math.abs(snapshot.overview.relativeDegradation - combined.relative_degradation) < 1e-12);
});
test("confirmation evidence is copied without reinterpretation", () => {
  assert.equal(snapshot.confirmation.relativeDegradation, confirmation.relative_degradation);
  assert.deepEqual(snapshot.confirmation.deltaCi95, confirmation.station_cluster_bootstrap_ci95);
  assert.equal(snapshot.confirmation.routes, 144); assert.equal(snapshot.confirmation.stations, 12);
});
test("prototype statuses are deterministic and exhaustive", () => {
  const counts = snapshot.stations.reduce((acc, station) => ({ ...acc, [station.status]: acc[station.status] + 1 }), { stable: 0, watch: 0, critical: 0 });
  assert.deepEqual(counts, snapshot.overview.statusCounts);
  for (const station of snapshot.stations) {
    const expected = station.gap <= 0.001 ? "stable" : station.gap >= 0.008 || station.relativeGap >= 0.35 ? "critical" : "watch";
    assert.equal(station.status, expected);
  }
});
