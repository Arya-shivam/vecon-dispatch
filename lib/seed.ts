import { type State, today } from "./domain";
export function seedState(): State {
  const masters: State["masters"] = [
    {
      id: "c1",
      kind: "customers",
      name: "Siam Cement Group",
      code: "SCG",
      contact: "Dispatch desk",
      wt: 0,
      truckType: "",
      owner: "",
      active: true,
    },
    {
      id: "p1",
      kind: "products",
      name: "Limestone",
      code: "LST",
      contact: "",
      wt: 0,
      truckType: "",
      owner: "",
      active: true,
    },
    {
      id: "o1",
      kind: "origins",
      name: "Kaeng Khoi quarry",
      code: "KKQ",
      contact: "",
      wt: 0,
      truckType: "",
      owner: "",
      active: true,
    },
    {
      id: "d1",
      kind: "destinations",
      name: "Saraburi cement plant",
      code: "SBP",
      contact: "",
      wt: 0,
      truckType: "",
      owner: "",
      active: true,
    },
    ...["70-4821", "70-5936", "71-2084", "71-6402"].map((name, i) => ({
      id: "t" + i,
      kind: "trucks" as const,
      name,
      code: "",
      contact: "",
      wt: [30.2, 31, 29.8, 30.5][i] ?? 30,
      truckType: "10-wheel tipper",
      owner: "VECON fleet",
      active: true,
    })),
  ];
  return {
    masters,
    jobs: [
      {
        id: "demo-job",
        date: today(),
        seq: 1,
        wo: "WO-2026-1048",
        customer: "c1",
        product: "p1",
        origin: "o1",
        destination: "d1",
        target: 1000,
        wt: 30.2,
        assignments: masters
          .filter((m) => m.kind === "trucks")
          .slice(0, 3)
          .map((t, i) => ({
            id: "a" + i,
            truckId: t.id,
            registration: t.name,
            wt: t.wt,
            trips: Array.from({ length: 10 }, (_, n) => ({
              id: `trip-${i}-${n}`,
              no: n + 1,
              status:
                n < ([4, 3, 3][i] ?? 0)
                  ? "completed"
                  : n === ([4, 3, 3][i] ?? 0)
                    ? "in_progress"
                    : "not_started",
            })),
          })),
      },
    ],
  };
}
