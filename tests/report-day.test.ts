import assert from "node:assert/strict";
import test from "node:test";
import { dayRoutes } from "../lib/report-day";
import type { Job, Master } from "../lib/domain";

const masters: Master[] = [
  {
    id: "o1",
    kind: "origins",
    name: "Quarry A",
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
    name: "Site B",
    code: "",
    contact: "",
    wt: 0,
    truckType: "",
    owner: "",
    active: true,
  },
];

const jobs: Job[] = [
  {
    id: "j1",
    date: "2026-11-10",
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
          { id: "1", no: 1, status: "completed" },
          { id: "2", no: 2, status: "completed" },
          { id: "3", no: 3, status: "not_started" },
        ],
      },
      {
        id: "a2",
        truckId: "t2",
        registration: "BBB-2",
        wt: 28,
        trips: [{ id: "4", no: 1, status: "completed" }],
      },
    ],
  },
];

test("dayRoutes groups trucks under origin→destination with tons", () => {
  const routes = dayRoutes(jobs, masters);
  assert.equal(routes.length, 1);
  assert.equal(routes[0].origin, "Quarry A");
  assert.equal(routes[0].destination, "Site B");
  assert.equal(routes[0].completed, 3);
  assert.equal(routes[0].planned, 4);
  assert.equal(routes[0].tons, 88); // 2*30 + 28
  assert.equal(routes[0].trucks.length, 2);
  assert.equal(routes[0].trucks.find((t) => t.registration === "AAA-1")?.tons, 60);
});
