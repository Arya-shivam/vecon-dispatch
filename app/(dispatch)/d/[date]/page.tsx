import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, ArrowRight } from "lucide-react";
import { getSession } from "@/lib/auth";
import { readState } from "@/lib/store";
import {
  dateSchema,
  formatDate,
  shiftDate,
  progress,
  number,
} from "@/lib/domain";
import { JobSwitcher, TruckTrips } from "@/components/daily";
export default async function Daily({
  params,
  searchParams,
}: {
  params: Promise<{ date: string }>;
  searchParams: Promise<{ job?: string }>;
}) {
  const { date } = await params;
  if (!dateSchema.safeParse(date).success) notFound();
  const session = await getSession();
  const admin = session?.role === "admin";
  const state = await readState();
  const jobs = state.jobs
    .filter((j) => j.date === date)
    .sort((a, b) => a.seq - b.seq);
  const { job: id } = await searchParams;
  const job = jobs.find((j) => j.id === id) || jobs[0];
  const name = (id: string) =>
    state.masters.find((m) => m.id === id)?.name || "Unavailable";
  const p = job ? progress(job) : null;
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Daily operations</p>
          <h1>Daily jobs</h1>
        </div>
        {admin && (
          <Link className="primary compact" href={`/d/${date}/new`}>
            <Plus size={17} /> Add job
          </Link>
        )}
      </div>
      <div className="date-bar">
        <Link
          className="icon-button"
          aria-label="Previous day"
          href={"/d/" + shiftDate(date, -1)}
        >
          <ChevronLeft size={18} />
        </Link>
        <div>
          <span>Dispatch date</span>
          <strong>{formatDate(date)}</strong>
        </div>
        <Link
          className="icon-button"
          aria-label="Next day"
          href={"/d/" + shiftDate(date, 1)}
        >
          <ChevronRight size={18} />
        </Link>
      </div>
      {job && p ? (
        <>
          <JobSwitcher jobs={jobs} current={job.id} date={date} />
          <section className="panel job-summary">
            <div className="row">
              <span className="small">Work order {job.wo}</span>
              <span
                className={"badge " + (p.status === "Done" ? "completed" : "")}
              >
                {p.status}
              </span>
            </div>
            <h2>{name(job.customer)}</h2>
            <p>{name(job.product)}</p>
            <div className="route">
              <div>
                <span>Origin</span>
                <strong>{name(job.origin)}</strong>
              </div>
              <ArrowRight size={18} />
              <div>
                <span>Destination</span>
                <strong>{name(job.destination)}</strong>
              </div>
            </div>
            <div className="tonnage">
              <div>
                <span>Delivered</span>
                <strong>
                  {number(p.tons)} <small>t</small>
                </strong>
              </div>
              <div className="target">
                <span>Target {number(job.target)} t</span>
                <strong>{number(p.percent)}%</strong>
              </div>
            </div>
            <progress
              max="100"
              value={p.percent}
              aria-label="Job tonnage progress"
            />
            <p className="small">
              {number(p.remainingTons)} t remaining · Planning WT{" "}
              {number(job.wt)} t/trip
            </p>
            <div className="stats">
              <div>
                <span>Planned trips</span>
                <strong>{p.planned}</strong>
              </div>
              <div>
                <span>Completed</span>
                <strong>{p.done}</strong>
              </div>
              <div>
                <span>Remaining</span>
                <strong>{p.remaining}</strong>
              </div>
            </div>
          </section>
          <div className="section-heading">
            <h2>Assigned trucks</h2>
            <span>{job.assignments.length} trucks</span>
          </div>
          <p className="small instruction">
            {admin
              ? "Open a truck, then tap a trip to update its status."
              : "Open a truck to see each trip status. Changes are admin-only."}
          </p>
          <TruckTrips
            key={job.id}
            assignments={job.assignments}
            readOnly={!admin}
          />
          <div className="legend">
            <span>
              <i className="dot" />
              Not started
            </span>
            <span>
              <i className="dot running" />
              In progress
            </span>
            <span>
              <i className="dot complete" />
              Completed
            </span>
          </div>
        </>
      ) : (
        <section className="empty panel">
          <h2>No jobs for this date</h2>
          <p>
            {admin
              ? "Create the first job and assign trucks to start dispatching."
              : "No jobs have been published for this date yet."}
          </p>
          {admin && (
            <Link className="primary" href={`/d/${date}/new`}>
              Create job #1
            </Link>
          )}
        </section>
      )}
    </>
  );
}
