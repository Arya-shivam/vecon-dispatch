import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { readState } from "@/lib/store";
import { progress, formatDate, number } from "@/lib/domain";
export default async function Jobs() {
  await requireAdmin();
  const state = await readState();
  const jobs = [...state.jobs].sort(
    (a, b) => b.date.localeCompare(a.date) || b.seq - a.seq,
  );
  return (
    <>
      <p className="eyebrow">Dispatch history</p>
      <h1>All jobs</h1>
      <p className="muted">{jobs.length} jobs in this workspace</p>
      {jobs.map((j) => {
        const p = progress(j);
        return (
          <Link
            className="job-row panel"
            key={j.id}
            href={`/d/${j.date}?job=${j.id}`}
          >
            <div className="row">
              <strong>
                Job #{j.seq} · {j.wo}
              </strong>
              <span className="badge">{p.status}</span>
            </div>
            <p>{state.masters.find((m) => m.id === j.customer)?.name}</p>
            <span className="small">
              {formatDate(j.date)} · {p.done}/{p.planned} trips ·{" "}
              {number(p.tons)} t
            </span>
          </Link>
        );
      })}
      {!jobs.length && (
        <p className="empty">No jobs yet. Open Daily jobs to create one.</p>
      )}
    </>
  );
}
