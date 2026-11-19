import assert from "node:assert/strict";
import test from "node:test";
import { applyJobEdit } from "../lib/job-edit";
import type { State } from "../lib/domain";

function base(): State {
  return {
    masters: [
      {
        id: "c1",
        kind: "customers",
        name: "Cust",
        code: "",
        contact: "",
        wt: 0,
        truckType: "",
        owner: "",
        active: true,
      },
      {
        id: "p1",
        kind: "products",
        name: "Prod",
        code: "",
        contact: "",
        wt: 0,
        truckType: "",
        owner: "",
        active: true,
      },
      {
        id: "o1",
        kind: "origins",
        name: "Origin",
        code: "",
        contact: "",
        wt: 0,
        truckType: "",
        owner: "",
        active: true,
      },
      {
        id: "d1",
        kind: "destinations",
        name: "Dest",
        code: "",
        contact: "",
        wt: 0,
        truckType: "",
        owner: "",
        active: true,
      },
      {
        id: "t1",
        kind: "trucks",
        name: "AAA-1",
        code: "",
        contact: "",
        wt: 30,
        truckType: "",
        owner: "",
        active: true,
      },
      {
        id: "t2",
        kind: "trucks",
        name: "BBB-2",
        code: "",
        contact: "",
        wt: 28,
        truckType: "",
        owner: "",
        active: true,
      },
    ],
    jobs: [
      {
        id: "j1",
        date: "2026-11-04",
        seq: 1,
        wo: "WO-1",
        customer: "c1",
        product: "p1",
        origin: "o1",
        destination: "d1",
        target: 100,
        wt: 30,
        assignments: [
          {
            id: "a1",
            truckId: "t1",
            registration: "AAA-1",
            wt: 30,
            trips: [
              { id: "tr1", no: 1, status: "not_started" },
              { id: "tr2", no: 2, status: "not_started" },
            ],
          },
        ],
      },
    ],
  };
}

test("applyJobEdit updates job fields and adds a truck", () => {
  const state = base();
  applyJobEdit(state, {
    id: "j1",
    wo: "WO-2",
    customer: "c1",
    product: "p1",
    origin: "o1",
    destination: "d1",
    target: 200,
    wt: 30,
    trucks: [
      { truckId: "t1", planned: 2 },
      { truckId: "t2", planned: 3 },
    ],
  });
  const job = state.jobs[0];
  assert.equal(job.wo, "WO-2");
  assert.equal(job.target, 200);
  assert.equal(job.assignments.length, 2);
  assert.equal(
    job.assignments.find((a) => a.truckId === "t2")?.trips.length,
    3,
  );
});

test("applyJobEdit refuses removing a truck with started trips", () => {
  const state = base();
  state.jobs[0].assignments[0].trips[0].status = "in_progress";
  assert.throws(
    () =>
      applyJobEdit(state, {
        id: "j1",
        wo: "WO-1",
        customer: "c1",
        product: "p1",
        origin: "o1",
        destination: "d1",
        target: 100,
        wt: 30,
        trucks: [{ truckId: "t2", planned: 1 }],
      }),
    /Cannot remove/,
  );
});
