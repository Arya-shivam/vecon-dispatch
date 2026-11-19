"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Check, Truck } from "lucide-react";
import { type Job, type TripStatus, number } from "@/lib/domain";
import { setTrip, resizeTrips } from "@/app/actions";
export function JobSwitcher({
  jobs,
  current,
  date,
}: {
  jobs: Job[];
  current: string;
  date: string;
}) {
  const router = useRouter();
  return (
    <label className="job-switcher">
      Job
      <select
        aria-label="Select job"
        value={current}
        onChange={(e) => router.push(`/d/${date}?job=${e.target.value}`)}
      >
        {jobs.map((j) => (
          <option key={j.id} value={j.id}>
            Job #{j.seq} · {j.wo}
          </option>
        ))}
      </select>
      <span>
        {jobs.length} {jobs.length === 1 ? "job" : "jobs"} this day
      </span>
    </label>
  );
}
const next: Record<TripStatus, TripStatus> = {
  not_started: "in_progress",
  in_progress: "completed",
  completed: "not_started",
};
const labels: Record<TripStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
};
const shortLabels: Record<TripStatus, string> = {
  not_started: "Open",
  in_progress: "Running",
  completed: "Done",
};
export function TruckTrips({
  assignments,
  readOnly = false,
}: {
  assignments: Job["assignments"];
  readOnly?: boolean;
}) {
  const [open, setOpen] = useState<string | undefined>(assignments[0]?.id);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="truck-list">
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {assignments.map((a) => {
        const done = a.trips.filter((t) => t.status === "completed").length;
        return (
          <section className="truck-panel" key={a.id}>
            <button
              className="truck-heading"
              aria-expanded={open === a.id}
              onClick={() => setOpen(open === a.id ? undefined : a.id)}
            >
              <Truck size={20} />
              <div>
                <strong>{a.registration}</strong>
                <span>WT {number(a.wt)} t / trip</span>
              </div>
              <div className="truck-count">
                <strong>
                  {done}
                  <small> / {a.trips.length}</small>
                </strong>
                <span>completed</span>
              </div>
              <ChevronDown
                size={17}
                className={open === a.id ? "rotated" : ""}
              />
            </button>
            {open === a.id && (
              <div className="truck-body">
                <div className="trip-grid">
                  {a.trips.map((t) =>
                    readOnly ? (
                      <div
                        key={t.id}
                        className={"trip " + t.status}
                        aria-label={`Truck ${a.registration}, trip ${t.no}, ${labels[t.status]}`}
                      >
                        <span>Trip {t.no}</span>
                        <strong>
                          {t.status === "completed" ? (
                            <>
                              <Check size={13} /> Done
                            </>
                          ) : (
                            shortLabels[t.status]
                          )}
                        </strong>
                      </div>
                    ) : (
                      <button
                        key={t.id}
                        disabled={pending}
                        className={"trip " + t.status}
                        aria-label={`Truck ${a.registration}, trip ${t.no}, ${labels[t.status]}. Change to ${labels[next[t.status]]}`}
                        onClick={() =>
                          start(async () => {
                            setError("");
                            const result = await setTrip({
                              id: t.id,
                              status: next[t.status],
                              expected: t.status,
                            });
                            if (!result.ok) setError(result.error);
                            router.refresh();
                          })
                        }
                      >
                        <span>Trip {t.no}</span>
                        <strong>
                          {t.status === "completed" ? (
                            <>
                              <Check size={13} /> Done
                            </>
                          ) : (
                            shortLabels[t.status]
                          )}
                        </strong>
                      </button>
                    ),
                  )}
                </div>
                {!readOnly && (
                  <form
                    className="planned-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const planned = new FormData(e.currentTarget).get(
                        "planned",
                      );
                      start(async () => {
                        setError("");
                        const r = await resizeTrips({
                          id: a.id,
                          planned: Number(planned),
                        });
                        if (!r.ok) setError(r.error);
                        router.refresh();
                      });
                    }}
                  >
                    <label>
                      Planned trips
                      <input
                        key={a.trips.length}
                        name="planned"
                        type="number"
                        min="1"
                        max="100"
                        defaultValue={a.trips.length}
                        required
                      />
                    </label>
                    <button disabled={pending} className="secondary">
                      Update plan
                    </button>
                  </form>
                )}
              </div>
            )}
          </section>
        );
      })}
      {pending && (
        <p role="status" className="small">
          Saving changes…
        </p>
      )}
    </div>
  );
}
