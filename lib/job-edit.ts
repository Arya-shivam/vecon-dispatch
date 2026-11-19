import { randomUUID } from "node:crypto";
import type { Job, State } from "./domain";

export type JobEditInput = {
  id: string;
  wo: string;
  customer: string;
  product: string;
  origin: string;
  destination: string;
  target: number;
  wt: number;
  trucks: { truckId: string; planned: number }[];
};

/** Mutates state in place. Throws on invalid edits. */
export function applyJobEdit(state: State, v: JobEditInput) {
  const job = state.jobs.find((j) => j.id === v.id);
  if (!job) throw new Error("Job not found.");
  for (const [kind, id] of [
    ["customers", v.customer],
    ["products", v.product],
    ["origins", v.origin],
    ["destinations", v.destination],
  ] as const)
    if (!state.masters.some((m) => m.id === id && m.kind === kind))
      throw new Error("Select valid master records.");
  if (new Set(v.trucks.map((t) => t.truckId)).size !== v.trucks.length)
    throw new Error("A truck can only be assigned once.");
  if (v.trucks.length < 1) throw new Error("Assign at least one truck.");

  const next: Job["assignments"] = [];
  for (const t of v.trucks) {
    const truck = state.masters.find(
      (m) => m.id === t.truckId && m.kind === "trucks",
    );
    if (!truck || truck.wt <= 0)
      throw new Error("Every truck needs a positive WT.");
    const existing = job.assignments.find((a) => a.truckId === t.truckId);
    if (existing) {
      const protectedTrips = existing.trips.filter(
        (tr) => tr.status !== "not_started",
      );
      if (t.planned < protectedTrips.length)
        throw new Error(
          `Keep at least ${protectedTrips.length} trips already started on ${existing.registration}.`,
        );
      const retained = [
        ...protectedTrips,
        ...existing.trips
          .filter((tr) => tr.status === "not_started")
          .slice(0, t.planned - protectedTrips.length),
      ].sort((a, b) => a.no - b.no);
      let no = Math.max(0, ...retained.map((tr) => tr.no));
      while (retained.length < t.planned)
        retained.push({ id: randomUUID(), no: ++no, status: "not_started" });
      next.push({
        ...existing,
        registration: truck.name,
        wt: truck.wt,
        trips: retained,
      });
    } else {
      next.push({
        id: randomUUID(),
        truckId: t.truckId,
        registration: truck.name,
        wt: truck.wt,
        trips: Array.from({ length: t.planned }, (_, i) => ({
          id: randomUUID(),
          no: i + 1,
          status: "not_started" as const,
        })),
      });
    }
  }
  for (const a of job.assignments) {
    if (next.some((n) => n.id === a.id)) continue;
    if (a.trips.some((t) => t.status !== "not_started"))
      throw new Error(
        `Cannot remove ${a.registration}: trips already started. Reset those trips first.`,
      );
  }
  job.wo = v.wo;
  job.customer = v.customer;
  job.product = v.product;
  job.origin = v.origin;
  job.destination = v.destination;
  job.target = v.target;
  job.wt = v.wt;
  job.assignments = next;
}
