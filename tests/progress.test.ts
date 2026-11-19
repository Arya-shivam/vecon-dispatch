import { test } from "node:test";
import assert from "node:assert/strict";
import { progress, dateSchema, createJobSchema } from "../lib/domain";
import { seedState } from "../lib/seed";
test("completed trips use each assigned truck WT and match visible totals", () => {
  const j = seedState().jobs[0];
  assert.ok(j);
  assert.deepEqual(progress(j), {
    planned: 30,
    done: 10,
    remaining: 20,
    tons: 303.2,
    remainingTons: 696.8,
    percent: 30.32,
    status: "In progress",
  });
});
test("1000 t target and ten 30.2 t completed trips is 30.2 percent", () => {
  const j = seedState().jobs[0];
  assert.ok(j);
  j.assignments = j.assignments.slice(0, 1);
  for (const a of j.assignments)
    for (const t of a.trips) t.status = "completed";
  assert.equal(progress(j).tons, 302);
  assert.equal(progress(j).percent, 30.2);
  assert.equal(progress(j).status, "Done");
});
test("no completed trips yields zero tons, empty jobs stay open", () => {
  const j = seedState().jobs[0];
  assert.ok(j);
  j.assignments = [];
  assert.equal(progress(j).status, "Open");
  assert.equal(progress(j).tons, 0);
});
test("date boundary rejects impossible dates", () => {
  assert.equal(dateSchema.safeParse("2026-02-30").success, false);
  assert.equal(dateSchema.safeParse("2026-02-28").success, true);
});
test("job boundary rejects duplicate trucks and zero target", () => {
  const base = {
    date: "2026-10-31",
    wo: "W1",
    customer: "c",
    product: "p",
    origin: "o",
    destination: "d",
    target: 1000,
    wt: 30,
    trucks: [{ id: "t", planned: 1 }],
  };
  assert.equal(createJobSchema.safeParse(base).success, true);
  assert.equal(
    createJobSchema.safeParse({ ...base, target: 0 }).success,
    false,
  );
  assert.equal(
    createJobSchema.safeParse({
      ...base,
      trucks: [
        { id: "t", planned: 1 },
        { id: "t", planned: 2 },
      ],
    }).success,
    false,
  );
});
