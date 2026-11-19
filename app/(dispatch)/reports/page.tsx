import Link from "next/link";
import { readState } from "@/lib/store";
import { formatDate, number } from "@/lib/domain";
import { dayRoutes, dayTotals } from "@/lib/report-day";

export default async function Reports() {
  const state = await readState();
  const dates = [...new Set(state.jobs.map((j) => j.date))].sort().reverse();
  return (
    <>
      <p className="eyebrow">Daily rollup</p>
      <h1>Reports</h1>
      <p className="muted">
        Tap a day for routes, trucks, trips, and tons. Open the date to manage
        jobs.
      </p>
      {dates.map((date) => {
        const jobs = state.jobs.filter((j) => j.date === date);
        const totals = dayTotals(jobs);
        const routes = dayRoutes(jobs, state.masters);
        return (
          <section className="panel report" key={date}>
            <details>
              <summary className="report-summary">
                <div className="row">
                  <h2>{formatDate(date)}</h2>
                  <span className="small">{jobs.length} jobs</span>
                </div>
                <div className="tonnage">
                  <strong>
                    {number(totals.tons)} <small>t delivered</small>
                  </strong>
                  <span>{number(totals.target)} t target</span>
                </div>
                <progress
                  max={Math.max(totals.target, 1)}
                  value={totals.tons}
                  aria-label={`Delivered tonnage on ${date}`}
                />
                <div className="row small">
                  <span>
                    {totals.done} / {totals.planned} trips completed
                  </span>
                  <span>{number(totals.percent)}%</span>
                </div>
                <p className="small report-hint">Tap for route & truck detail</p>
              </summary>
              <div className="report-detail">
                <div className="row report-detail-actions">
                  <Link className="secondary compact" href={"/d/" + date}>
                    Open daily jobs
                  </Link>
                </div>
                {routes.map((route) => (
                  <div className="route-block" key={route.key}>
                    <div className="route-block-head">
                      <strong>
                        {route.origin} → {route.destination}
                      </strong>
                      <span className="small">
                        {route.jobs} {route.jobs === 1 ? "job" : "jobs"} ·{" "}
                        {route.completed}/{route.planned} trips ·{" "}
                        {number(route.tons)} t
                      </span>
                    </div>
                    <ul className="truck-report">
                      {route.trucks.map((t) => (
                        <li key={t.truckId}>
                          <span>{t.registration}</span>
                          <span className="small">
                            {t.completed}/{t.planned} trips · {number(t.tons)} t
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {!routes.length && (
                  <p className="small">No truck activity for this date.</p>
                )}
              </div>
            </details>
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
