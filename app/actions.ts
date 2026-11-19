"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin, clearSession } from "@/lib/auth";
import { createJobSchema, masterSchema, statusSchema } from "@/lib/domain";
import { mutate } from "@/lib/store";
export type Result = { ok: true; id?: string } | { ok: false; error: string };
async function action(fn: () => Promise<string | void>): Promise<Result> {
  await requireAdmin();
  try {
    const id = await fn();
    revalidatePath("/", "layout");
    return { ok: true, ...(id ? { id } : {}) };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof z.ZodError
          ? e.issues[0]?.message || "Check the form."
          : e instanceof Error
            ? e.message
            : "Could not save. Try again.",
    };
  }
}
export async function createJob(input: unknown): Promise<Result> {
  return action(async () => {
    const value = createJobSchema.parse(input);
    return mutate((state) => {
      for (const [kind, id] of [
        ["customers", value.customer],
        ["products", value.product],
        ["origins", value.origin],
        ["destinations", value.destination],
      ])
        if (
          !state.masters.some((m) => m.id === id && m.kind === kind && m.active)
        )
          throw new Error("Select active master records.");
      const id = randomUUID();
      state.jobs.push({
        ...value,
        id,
        seq:
          Math.max(
            0,
            ...state.jobs
              .filter((j) => j.date === value.date)
              .map((j) => j.seq),
          ) + 1,
        assignments: value.trucks.map((t) => {
          const truck = state.masters.find(
            (m) => m.id === t.id && m.kind === "trucks" && m.active,
          );
          if (!truck || truck.wt <= 0)
            throw new Error("Every truck needs a positive WT.");
          return {
            id: randomUUID(),
            truckId: t.id,
            registration: truck.name,
            wt: truck.wt,
            trips: Array.from({ length: t.planned }, (_, i) => ({
              id: randomUUID(),
              no: i + 1,
              status: "not_started",
            })),
          };
        }),
      });
      return id;
    });
  });
}
export async function setTrip(input: unknown): Promise<Result> {
  return action(async () => {
    const v = z
      .object({ id: z.string(), status: statusSchema, expected: statusSchema })
      .parse(input);
    await mutate((state) => {
      const trip = state.jobs
        .flatMap((j) => j.assignments.flatMap((a) => a.trips))
        .find((t) => t.id === v.id);
      if (!trip) throw new Error("Trip no longer exists. Refresh the page.");
      if (trip.status !== v.expected)
        throw new Error(
          "Another operator updated this trip. Refresh to see the latest status.",
        );
      trip.status = v.status;
    });
  });
}
export async function resizeTrips(input: unknown): Promise<Result> {
  return action(async () => {
    const v = z
      .object({
        id: z.string(),
        planned: z.coerce.number().int().min(1).max(100),
      })
      .parse(input);
    await mutate((state) => {
      const a = state.jobs
        .flatMap((j) => j.assignments)
        .find((a) => a.id === v.id);
      if (!a) throw new Error("Truck assignment not found.");
      const protectedTrips = a.trips.filter((t) => t.status !== "not_started");
      if (v.planned < protectedTrips.length)
        throw new Error(
          `Keep at least ${protectedTrips.length} trips already started.`,
        );
      const retained = [
        ...protectedTrips,
        ...a.trips
          .filter((t) => t.status === "not_started")
          .slice(0, v.planned - protectedTrips.length),
      ].sort((a, b) => a.no - b.no);
      let no = Math.max(0, ...retained.map((t) => t.no));
      while (retained.length < v.planned)
        retained.push({ id: randomUUID(), no: ++no, status: "not_started" });
      a.trips = retained;
    });
  });
}
export async function saveMaster(input: unknown): Promise<Result> {
  return action(async () => {
    const v = masterSchema.parse(input);
    if (v.kind === "trucks" && v.wt <= 0)
      throw new Error("Truck WT must be greater than zero.");
    await mutate((state) => {
      if (
        state.masters.some(
          (m) =>
            m.id !== v.id &&
            m.kind === v.kind &&
            m.name.toLowerCase() === v.name.toLowerCase(),
        )
      )
        throw new Error("This name already exists.");
      const index = state.masters.findIndex((m) => m.id === v.id);
      if (index >= 0) state.masters[index] = v;
      else state.masters.push({ ...v, id: randomUUID() });
    });
  });
}
export async function deleteMaster(input: unknown): Promise<Result> {
  return action(async () => {
    const id = z.string().parse(input);
    await mutate((state) => {
      if (
        state.jobs.some((j) =>
          [
            j.customer,
            j.product,
            j.origin,
            j.destination,
            ...j.assignments.map((a) => a.truckId),
          ].includes(id),
        )
      )
        throw new Error(
          "Used by a job. Set it inactive to preserve job history.",
        );
      state.masters = state.masters.filter((m) => m.id !== id);
    });
  });
}
export async function logout() {
  await clearSession();
  redirect("/");
}
