import Link from "next/link";
import { readState } from "@/lib/store";
import { progress, formatDate, number } from "@/lib/domain";
export default async function Reports() {
  const state = await readState();
  const dates = [...new Set(state.jobs.map((j) => j.date))].sort().reverse();
  return (
    <>
      <p className="eyebrow">Daily rollup</p>
      <h1>Reports</h1>
      <p className="muted">
        Delivered tonnage and completed trips by dispatch date.
      </p>
      {dates.map((date) => {
        const jobs = state.jobs.filter((j) => j.date === date);
        const ps = jobs.map(progress);
        const tons = ps.reduce((s, p) => s + p.tons, 0),
          target = jobs.reduce((s, j) => s + j.target, 0);
        return (
          <section className="panel report" key={date}>
            <div className="row">
              <Link href={"/d/" + date}>
                <h2>{formatDate(date)}</h2>
              </Link>
              <span className="small">{jobs.length} jobs</span>
            </div>
            <div className="tonnage">
              <strong>
                {number(tons)} <small>t delivered</small>
              </strong>
              <span>{number(target)} t target</span>
            </div>
            <progress
              max={target || 1}
              value={tons}
              aria-label={`Delivered tonnage on ${date}`}
            />
            <div className="row small">
              <span>
                {ps.reduce((s, p) => s + p.done, 0)} /{" "}
                {ps.reduce((s, p) => s + p.planned, 0)} trips completed
              </span>
              <span>{number(target ? (tons / target) * 100 : 0)}%</span>
            </div>
          </section>
        );
      })}
      {!dates.length && (
        <p className="empty">
          Daily reports will appear after you create a job.
        </p>
      )}
    </>
  );
}
