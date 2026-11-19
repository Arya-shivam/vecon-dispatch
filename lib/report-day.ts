import { type Job, type Master, progress } from "./domain";

export type RouteTruckRow = {
  registration: string;
  truckId: string;
  completed: number;
  planned: number;
  tons: number;
};

export type RouteRow = {
  key: string;
  origin: string;
  destination: string;
  jobs: number;
  completed: number;
  planned: number;
  tons: number;
  trucks: RouteTruckRow[];
};

export function nameOf(masters: Master[], id: string) {
  return masters.find((m) => m.id === id)?.name || "Unavailable";
}

/** Collapse a day's jobs into origin→destination routes with per-truck totals. */
export function dayRoutes(jobs: Job[], masters: Master[]): RouteRow[] {
  const map = new Map<
    string,
    {
      originId: string;
      destinationId: string;
      jobs: number;
      trucks: Map<
        string,
        {
          registration: string;
          truckId: string;
          completed: number;
          planned: number;
          tons: number;
        }
      >;
    }
  >();

  for (const job of jobs) {
    const key = job.origin + ">" + job.destination;
    let route = map.get(key);
    if (!route) {
      route = {
        originId: job.origin,
        destinationId: job.destination,
        jobs: 0,
        trucks: new Map(),
      };
      map.set(key, route);
    }
    route.jobs++;
    for (const a of job.assignments) {
      const done = a.trips.filter((t) => t.status === "completed").length;
      const tons = Math.round(done * a.wt * 1000) / 1000;
      const existing = route.trucks.get(a.truckId);
      if (existing) {
        existing.completed += done;
        existing.planned += a.trips.length;
        existing.tons = Math.round((existing.tons + tons) * 1000) / 1000;
        existing.registration = a.registration;
      } else {
        route.trucks.set(a.truckId, {
          registration: a.registration,
          truckId: a.truckId,
          completed: done,
          planned: a.trips.length,
          tons,
        });
      }
    }
  }

  return [...map.entries()]
    .map(([key, r]) => {
      const trucks = [...r.trucks.values()].sort((a, b) =>
        a.registration.localeCompare(b.registration),
      );
      return {
        key,
        origin: nameOf(masters, r.originId),
        destination: nameOf(masters, r.destinationId),
        jobs: r.jobs,
        completed: trucks.reduce((s, t) => s + t.completed, 0),
        planned: trucks.reduce((s, t) => s + t.planned, 0),
        tons: Math.round(trucks.reduce((s, t) => s + t.tons, 0) * 1000) / 1000,
        trucks,
      };
    })
    .sort(
      (a, b) =>
        b.tons - a.tons || a.origin.localeCompare(b.origin) || a.destination.localeCompare(b.destination),
    );
}

export function dayTotals(jobs: Job[]) {
  const ps = jobs.map(progress);
  const tons = ps.reduce((s, p) => s + p.tons, 0);
  const target = jobs.reduce((s, j) => s + j.target, 0);
  return {
    tons,
    target,
    done: ps.reduce((s, p) => s + p.done, 0),
    planned: ps.reduce((s, p) => s + p.planned, 0),
    percent: target ? (tons / target) * 100 : 0,
  };
}
