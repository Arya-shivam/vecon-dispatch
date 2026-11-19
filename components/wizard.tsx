"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, ChevronLeft } from "lucide-react";
import { type Master, masterKinds, number } from "@/lib/domain";
import { createJob } from "@/app/actions";
export function Wizard({ masters, date }: { masters: Master[]; date: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [info, setInfo] = useState({
    date,
    wo: "",
    customer: masters.find((m) => m.kind === "customers")?.id || "",
    product: masters.find((m) => m.kind === "products")?.id || "",
    origin: masters.find((m) => m.kind === "origins")?.id || "",
    destination: masters.find((m) => m.kind === "destinations")?.id || "",
    target: "",
    wt: "",
  });
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const trucks = masters.filter((m) => m.kind === "trucks");
  const selectedTrucks = trucks.filter((t) => selected[t.id] !== undefined);
  const missing = masterKinds.filter((k) => !masters.some((m) => m.kind === k));
  const total = Object.values(selected).reduce((a, b) => a + b, 0);
  const capacity = selectedTrucks.reduce(
    (n, t) => n + t.wt * (selected[t.id] || 0),
    0,
  );
  const name = (id: string) => masters.find((m) => m.id === id)?.name;
  function submit() {
    start(async () => {
      setError("");
      const result = await createJob({
        ...info,
        trucks: selectedTrucks.map((t) => ({
          id: t.id,
          planned: selected[t.id],
        })),
      });
      if (!result.ok) setError(result.error);
      else router.push(`/d/${info.date}?job=${result.id}`);
    });
  }
  return (
    <>
      <Link className="back-link" href={"/d/" + date}>
        <ChevronLeft size={16} /> Daily jobs
      </Link>
      <h1>Add job</h1>
      <p className="muted">Plan the load, assign the fleet, then dispatch.</p>
      <ol className="steps">
        {["Job info", "Trucks", "Trips", "Review"].map((s, i) => (
          <li
            key={s}
            className={i === step ? "current" : i < step ? "finished" : ""}
          >
            <span>{i < step ? <Check size={13} /> : i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      {missing.length > 0 && (
        <div className="notice">
          Add active {missing.join(", ")} before creating a job.{" "}
          <Link href={"/" + missing[0]}>Open masters</Link>
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <form
        className="panel wizard"
        onSubmit={(e) => {
          e.preventDefault();
          if (step === 1 && selectedTrucks.length === 0) {
            setError("Select at least one truck.");
            return;
          }
          setError("");
          if (step === 3) submit();
          else setStep(step + 1);
        }}
      >
        {step === 0 && (
          <>
            <h2>Job information</h2>
            <label>
              Dispatch date
              <input
                type="date"
                value={info.date}
                required
                onChange={(e) => setInfo({ ...info, date: e.target.value })}
              />
            </label>
            <label>
              Work order number
              <input
                value={info.wo}
                required
                maxLength={80}
                placeholder="e.g. WO-2026-1049"
                onChange={(e) => setInfo({ ...info, wo: e.target.value })}
              />
            </label>
            {(
              [
                { key: "customer", kind: "customers", label: "Customer" },
                { key: "product", kind: "products", label: "Product" },
                { key: "origin", kind: "origins", label: "Origin" },
                {
                  key: "destination",
                  kind: "destinations",
                  label: "Destination",
                },
              ] as const
            ).map((f) => (
              <label key={f.key}>
                {f.label}
                <select
                  required
                  value={info[f.key]}
                  onChange={(e) =>
                    setInfo({ ...info, [f.key]: e.target.value })
                  }
                >
                  <option value="">Select {f.label.toLowerCase()}</option>
                  {masters
                    .filter((m) => m.kind === f.kind)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                </select>
              </label>
            ))}
            <div className="form-grid">
              <label>
                Target tonnage (t)
                <input
                  type="number"
                  min="0.1"
                  max="10000000"
                  step="0.1"
                  value={info.target}
                  required
                  onChange={(e) => setInfo({ ...info, target: e.target.value })}
                />
              </label>
              <label>
                Planning WT (t/trip)
                <input
                  type="number"
                  min="0.1"
                  max="200"
                  step="0.1"
                  value={info.wt}
                  required
                  onChange={(e) => setInfo({ ...info, wt: e.target.value })}
                />
              </label>
            </div>
            <p className="small">
              Actual delivered tonnage uses each truck's saved WT.
            </p>
          </>
        )}
        {step === 1 && (
          <>
            <h2>Select trucks</h2>
            <input
              aria-label="Search trucks"
              placeholder="Search registration…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {trucks
              .filter((t) =>
                t.name.toLowerCase().includes(search.toLowerCase()),
              )
              .map((t) => (
                <label className="check-row" key={t.id}>
                  <input
                    type="checkbox"
                    checked={selected[t.id] !== undefined}
                    onChange={(e) =>
                      setSelected((prev) => {
                        const next = { ...prev };
                        if (e.target.checked) next[t.id] = 1;
                        else delete next[t.id];
                        return next;
                      })
                    }
                  />
                  <span>
                    <strong>{t.name}</strong>
                    <small>
                      {t.truckType} · {number(t.wt)} t / trip
                    </small>
                  </span>
                </label>
              ))}
            <p>{selectedTrucks.length} trucks selected</p>
          </>
        )}
        {step === 2 && (
          <>
            <h2>Plan trips per truck</h2>
            {selectedTrucks.map((t) => (
              <label className="plan-row" key={t.id}>
                <span>
                  <strong>{t.name}</strong>
                  <small>{number(t.wt)} t / trip</small>
                </span>
                <input
                  aria-label={`Planned trips for ${t.name}`}
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={selected[t.id] || ""}
                  onChange={(e) =>
                    setSelected({ ...selected, [t.id]: Number(e.target.value) })
                  }
                />
              </label>
            ))}
            <div className="notice">
              {total} planned trips · {number(capacity)} t planned capacity
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <h2>Review job</h2>
            <dl className="review">
              {[
                ["Date", info.date],
                ["Work order", info.wo],
                ["Customer", name(info.customer)],
                ["Product", name(info.product)],
                ["Origin", name(info.origin)],
                ["Destination", name(info.destination)],
                ["Target", `${number(Number(info.target))} t`],
                ["Planning WT", `${info.wt} t/trip`],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            {selectedTrucks.map((t) => (
              <div className="review-truck" key={t.id}>
                <strong>{t.name}</strong>
                <span>
                  {selected[t.id]} trips · {number(t.wt)} t/trip
                </span>
              </div>
            ))}
            <div className="notice">
              {total} planned trips · {number(capacity)} t capacity
            </div>
            <p className="small">
              Trips start as not started. Truck weights are saved with this job.
            </p>
          </>
        )}
        <div className="form-actions">
          {step > 0 && (
            <button
              type="button"
              className="secondary"
              disabled={pending}
              onClick={() => setStep(step - 1)}
            >
              Back
            </button>
          )}
          <button className="primary" disabled={pending || missing.length > 0}>
            {pending ? "Saving…" : step === 3 ? "Create job" : "Continue"}
          </button>
        </div>
      </form>
    </>
  );
}
