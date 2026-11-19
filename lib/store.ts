import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql, eq } from "drizzle-orm";
import * as tables from "@/db/schema";
import { type State, stateSchema } from "./domain";
import { seedState } from "./seed";
import { demoMode } from "./config";
export { demoMode } from "./config";
function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  // Neon may emit channel_binding=require; on Vercel that can yield
  // "connection is insecure (try using sslmode=require)".
  return url
    .replace(/([?&])channel_binding=require&?/g, "$1")
    .replace(/[?&]$/, "")
    .replace(/\?&/, "?");
}
const client = databaseUrl()
  ? postgres(databaseUrl()!, {
      prepare: false,
      max: 5,
      ssl: "require",
    })
  : null;
const db = client ? drizzle(client) : null;
const file = path.join(
  process.cwd(),
  ".data",
  process.env.E2E_TEST === "true" ? "dispatch-e2e.json" : "dispatch.json",
);
let queue: Promise<unknown> = Promise.resolve();
async function localRead(): Promise<State> {
  try {
    return stateSchema.parse(JSON.parse(await readFile(file, "utf8")));
  } catch (e) {
    if (e instanceof Error && "code" in e && e.code === "ENOENT")
      return seedState();
    throw e;
  }
}
export async function readState(): Promise<State> {
  // Public read — anyone can view daily jobs; writes still go through requireAdmin.
  if (demoMode) return localRead();
  if (!db)
    throw new Error(
      "Set DATABASE_URL and run npm run db:push before starting.",
    );
  return db.transaction(
    async (tx) => {
      const [masters, jobs, assignments, trips] = await Promise.all([
        tx.select().from(tables.masters),
        tx.select().from(tables.jobs),
        tx.select().from(tables.assignments),
        tx.select().from(tables.trips),
      ]);
      return stateSchema.parse({
        masters,
        jobs: jobs.map((j) => ({
          ...j,
          assignments: assignments
            .filter((a) => a.jobId === j.id)
            .map((a) => ({
              ...a,
              trips: trips
                .filter((t) => t.assignmentId === a.id)
                .sort((a, b) => a.no - b.no),
            })),
        })),
      });
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}
export async function mutate<T>(fn: (state: State) => T): Promise<T> {
  if (demoMode) {
    const run = queue.then(async () => {
      const state = await localRead();
      const result = fn(state);
      await mkdir(path.dirname(file), { recursive: true });
      const temp = file + ".tmp";
      await writeFile(temp, JSON.stringify(state));
      await rename(temp, file);
      return result;
    });
    queue = run.catch(() => {});
    return run;
  }
  if (!db) throw new Error("DATABASE_URL is required.");
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(8392104)`);
    const [masters, jobs, assignments, trips] = await Promise.all([
      tx.select().from(tables.masters),
      tx.select().from(tables.jobs),
      tx.select().from(tables.assignments),
      tx.select().from(tables.trips),
    ]);
    const state = stateSchema.parse({
      masters,
      jobs: jobs.map((j) => ({
        ...j,
        assignments: assignments
          .filter((a) => a.jobId === j.id)
          .map((a) => ({
            ...a,
            trips: trips.filter((t) => t.assignmentId === a.id),
          })),
      })),
    });
    const result = fn(state);
    for (const m of masters)
      if (!state.masters.some((v) => v.id === m.id))
        await tx.delete(tables.masters).where(eq(tables.masters.id, m.id));
    for (const m of state.masters)
      if (
        JSON.stringify(m) !== JSON.stringify(masters.find((v) => v.id === m.id))
      )
        await tx
          .insert(tables.masters)
          .values(m)
          .onConflictDoUpdate({ target: tables.masters.id, set: m });

    const stateJobIds = new Set(state.jobs.map((j) => j.id));
    for (const j of jobs)
      if (!stateJobIds.has(j.id))
        await tx.delete(tables.jobs).where(eq(tables.jobs.id, j.id));

    const stateAssignmentIds = new Set(
      state.jobs.flatMap((j) => j.assignments.map((a) => a.id)),
    );
    for (const a of assignments)
      if (!stateAssignmentIds.has(a.id))
        await tx
          .delete(tables.assignments)
          .where(eq(tables.assignments.id, a.id));

    const retainedTrips = new Set(
      state.jobs.flatMap((j) =>
        j.assignments.flatMap((a) => a.trips.map((t) => t.id)),
      ),
    );
    for (const t of trips)
      if (!retainedTrips.has(t.id))
        await tx.delete(tables.trips).where(eq(tables.trips.id, t.id));

    for (const j of state.jobs) {
      const { assignments: jobAssignments, ...row } = j;
      await tx
        .insert(tables.jobs)
        .values(row)
        .onConflictDoUpdate({ target: tables.jobs.id, set: row });
      for (const a of jobAssignments) {
        const { trips: assignmentTrips, ...assignment } = a;
        const assignmentRow = { ...assignment, jobId: j.id };
        await tx
          .insert(tables.assignments)
          .values(assignmentRow)
          .onConflictDoUpdate({
            target: tables.assignments.id,
            set: assignmentRow,
          });
        for (const t of assignmentTrips) {
          const existing = trips.find((v) => v.id === t.id);
          if (!existing)
            await tx.insert(tables.trips).values({ ...t, assignmentId: a.id });
          else if (existing.status !== t.status || existing.no !== t.no)
            await tx
              .update(tables.trips)
              .set({ status: t.status, no: t.no })
              .where(eq(tables.trips.id, t.id));
        }
      }
    }
    return result;
  });
}
