import { z } from "zod";
export const masterKinds = [
  "customers",
  "products",
  "origins",
  "destinations",
  "trucks",
] as const;
export const kindSchema = z.enum(masterKinds);
export type MasterKind = z.infer<typeof kindSchema>;
export const masterSchema = z.object({
  id: z.string(),
  kind: kindSchema,
  name: z.string().trim().min(1).max(120),
  code: z.string().max(50).default(""),
  contact: z.string().max(150).default(""),
  wt: z.number().min(0).max(200).default(0),
  truckType: z.string().max(60).default(""),
  owner: z.string().max(120).default(""),
  active: z.boolean().default(true),
});
export type Master = z.infer<typeof masterSchema>;
export const statusSchema = z.enum(["not_started", "in_progress", "completed"]);
export type TripStatus = z.infer<typeof statusSchema>;
export const tripSchema = z.object({
  id: z.string(),
  no: z.number().int().positive(),
  status: statusSchema,
});
export const assignmentSchema = z.object({
  id: z.string(),
  truckId: z.string(),
  registration: z.string(),
  wt: z.number().positive(),
  trips: z.array(tripSchema),
});
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "Invalid date",
  );
export const jobSchema = z.object({
  id: z.string(),
  date: dateSchema,
  seq: z.number().int().positive(),
  wo: z.string().min(1),
  customer: z.string(),
  product: z.string(),
  origin: z.string(),
  destination: z.string(),
  target: z.number().positive(),
  wt: z.number().positive(),
  assignments: z.array(assignmentSchema),
});
export type Job = z.infer<typeof jobSchema>;
export const stateSchema = z.object({
  masters: z.array(masterSchema),
  jobs: z.array(jobSchema),
});
export type State = z.infer<typeof stateSchema>;
export const createJobSchema = z
  .object({
    date: dateSchema,
    wo: z.string().trim().min(1).max(80),
    customer: z.string().min(1),
    product: z.string().min(1),
    origin: z.string().min(1),
    destination: z.string().min(1),
    target: z.coerce.number().positive().max(10000000),
    wt: z.coerce.number().positive().max(200),
    trucks: z
      .array(
        z.object({
          id: z.string().min(1),
          planned: z.coerce.number().int().min(1).max(100),
        }),
      )
      .min(1)
      .max(100),
  })
  .refine(
    (v) => new Set(v.trucks.map((t) => t.id)).size === v.trucks.length,
    "A truck can only be assigned once",
  );
export function progress(job: Job) {
  const trips = job.assignments.flatMap((a) =>
    a.trips.map((t) => ({ ...t, wt: a.wt })),
  );
  const done = trips.filter((t) => t.status === "completed");
  const tons = Math.round(done.reduce((s, t) => s + t.wt, 0) * 1000) / 1000;
  const planned = trips.length;
  return {
    planned,
    done: done.length,
    remaining: planned - done.length,
    tons,
    remainingTons: Math.max(0, job.target - tons),
    percent: Math.min(100, Math.round((tons / job.target) * 10000) / 100),
    status:
      (planned > 0 && done.length === planned) || tons >= job.target
        ? "Done"
        : trips.some((t) => t.status !== "not_started")
          ? "In progress"
          : "Open",
  };
}
export function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function shiftDate(date: string, days: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function formatDate(date: string) {
  return new Date(date + "T12:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
export function number(n: number) {
  return n.toLocaleString("en-GB", { maximumFractionDigits: 1 });
}
