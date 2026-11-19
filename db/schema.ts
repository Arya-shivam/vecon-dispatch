import {
  pgTable,
  text,
  integer,
  doublePrecision,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";
export const masters = pgTable(
  "masters",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    name: text("name").notNull(),
    code: text("code").notNull().default(""),
    contact: text("contact").notNull().default(""),
    wt: doublePrecision("wt").notNull().default(0),
    truckType: text("truck_type").notNull().default(""),
    owner: text("owner").notNull().default(""),
    active: boolean("active").notNull().default(true),
  },
  (t) => [uniqueIndex("master_kind_name").on(t.kind, t.name)],
);
export const jobs = pgTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    date: text("work_date").notNull(),
    seq: integer("job_seq").notNull(),
    wo: text("wo").notNull(),
    customer: text("customer")
      .notNull()
      .references(() => masters.id),
    product: text("product")
      .notNull()
      .references(() => masters.id),
    origin: text("origin")
      .notNull()
      .references(() => masters.id),
    destination: text("destination")
      .notNull()
      .references(() => masters.id),
    target: doublePrecision("target").notNull(),
    wt: doublePrecision("wt").notNull(),
  },
  (t) => [uniqueIndex("jobs_date_seq").on(t.date, t.seq)],
);
export const assignments = pgTable(
  "job_trucks",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    truckId: text("truck_id")
      .notNull()
      .references(() => masters.id),
    registration: text("registration").notNull(),
    wt: doublePrecision("wt_snapshot").notNull(),
  },
  (t) => [uniqueIndex("job_truck_unique").on(t.jobId, t.truckId)],
);
export const trips = pgTable(
  "trips",
  {
    id: text("id").primaryKey(),
    assignmentId: text("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    no: integer("trip_no").notNull(),
    status: text("status").notNull().default("not_started"),
  },
  (t) => [uniqueIndex("assignment_trip_no").on(t.assignmentId, t.no)],
);
/** Web Push endpoints — outside dispatch State JSON, managed by lib/push. */
export const pushSubscriptions = pgTable("push_subscriptions", {
  endpoint: text("endpoint").primaryKey(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent").notNull().default(""),
  createdAt: text("created_at").notNull(),
});
