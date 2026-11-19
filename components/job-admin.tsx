"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { type Job, type Master, number } from "@/lib/domain";
import { deleteJob, updateJob } from "@/app/actions";

type TruckDraft = { truckId: string; planned: number };

export function JobAdmin({
  job,
  masters,
}: {
  job: Job;
  masters: Master[];
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(job);
  const [trucks, setTrucks] = useState<TruckDraft[]>([]);
  const [addTruckId, setAddTruckId] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const fields = {
    customers: "customer",
    products: "product",
    origins: "origin",
    destinations: "destination",
  } as const;
  const truckMasters = masters.filter((m) => m.kind === "trucks");
  const options = (kind: keyof typeof fields) =>
    masters.filter(
      (m) => m.kind === kind && (m.active || m.id === draft[fields[kind]]),
    );
  const availableToAdd = truckMasters.filter(
    (m) =>
      (m.active || trucks.some((t) => t.truckId === m.id)) &&
      !trucks.some((t) => t.truckId === m.id),
  );

  function openEditor() {
    setDraft(job);
    setTrucks(
      job.assignments.map((a) => ({
        truckId: a.truckId,
        planned: a.trips.length,
      })),
    );
    setAddTruckId("");
    setError("");
    setEditing(true);
  }

  return (
    <>
      <div className="job-admin-actions">
        <button
          type="button"
          className="secondary compact"
          onClick={openEditor}
        >
          <Pencil size={14} /> Edit job
        </button>
        <button
          type="button"
          className="danger compact"
          disabled={pending}
          onClick={() => {
            if (
              !window.confirm(
                `Delete job #${job.seq} (${job.wo})? This cannot be undone.`,
              )
            )
              return;
            start(async () => {
              const r = await deleteJob(job.id);
              if (!r.ok) {
                setError(r.error);
                return;
              }
              router.push(`/d/${job.date}`);
              router.refresh();
            });
          }}
        >
          <Trash2 size={14} /> Delete
        </button>
      </div>
      {error && !editing && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {editing && (
        <div className="modal-backdrop">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-job-title"
            className="modal"
          >
            <div className="row">
              <h2 id="edit-job-title">Edit job #{job.seq}</h2>
              <button
                className="icon-button"
                aria-label="Close editor"
                onClick={() => setEditing(false)}
              >
                <X size={20} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                start(async () => {
                  setError("");
                  const r = await updateJob({
                    id: job.id,
                    wo: draft.wo,
                    customer: draft.customer,
                    product: draft.product,
                    origin: draft.origin,
                    destination: draft.destination,
                    target: draft.target,
                    wt: draft.wt,
                    trucks,
                  });
                  if (!r.ok) setError(r.error);
                  else {
                    setEditing(false);
                    router.refresh();
                  }
                });
              }}
            >
              <label>
                Work order
                <input
                  required
                  maxLength={80}
                  value={draft.wo}
                  onChange={(e) => setDraft({ ...draft, wo: e.target.value })}
                />
              </label>
              {(
                [
                  ["customers", "Customer"],
                  ["products", "Product"],
                  ["origins", "Origin"],
                  ["destinations", "Destination"],
                ] as const
              ).map(([kind, label]) => {
                const field = fields[kind];
                return (
                  <label key={kind}>
                    {label}
                    <select
                      required
                      value={draft[field]}
                      onChange={(e) =>
                        setDraft({ ...draft, [field]: e.target.value })
                      }
                    >
                      {options(kind).map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                          {!m.active ? " (inactive)" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              })}
              <div className="form-grid">
                <label>
                  Target (t)
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={draft.target}
                    onChange={(e) =>
                      setDraft({ ...draft, target: Number(e.target.value) })
                    }
                  />
                </label>
                <label>
                  Planning WT
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={draft.wt}
                    onChange={(e) =>
                      setDraft({ ...draft, wt: Number(e.target.value) })
                    }
                  />
                </label>
              </div>

              <div className="section-heading">
                <h2>Trucks</h2>
                <span>{trucks.length}</span>
              </div>
              {trucks.map((t) => {
                const master = truckMasters.find((m) => m.id === t.truckId);
                const assignment = job.assignments.find(
                  (a) => a.truckId === t.truckId,
                );
                const started =
                  assignment?.trips.filter((tr) => tr.status !== "not_started")
                    .length || 0;
                return (
                  <div className="plan-row" key={t.truckId}>
                    <div>
                      <strong>{master?.name || "Unknown truck"}</strong>
                      <small>
                        {master ? `${number(master.wt)} t/trip` : ""}
                        {started
                          ? ` · ${started} trip${started === 1 ? "" : "s"} started`
                          : ""}
                      </small>
                    </div>
                    <label>
                      Trips
                      <input
                        type="number"
                        min={Math.max(1, started)}
                        max={100}
                        required
                        value={t.planned}
                        onChange={(e) =>
                          setTrucks(
                            trucks.map((x) =>
                              x.truckId === t.truckId
                                ? {
                                    ...x,
                                    planned: Number(e.target.value),
                                  }
                                : x,
                            ),
                          )
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="danger compact"
                      disabled={started > 0}
                      title={
                        started > 0
                          ? "Reset started trips before removing"
                          : "Remove truck"
                      }
                      onClick={() =>
                        setTrucks(trucks.filter((x) => x.truckId !== t.truckId))
                      }
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
              {availableToAdd.length > 0 && (
                <div className="add-truck-row">
                  <select
                    aria-label="Add truck"
                    value={addTruckId}
                    onChange={(e) => setAddTruckId(e.target.value)}
                  >
                    <option value="">Add another truck…</option>
                    {availableToAdd.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} · {number(m.wt)} t
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="secondary compact"
                    disabled={!addTruckId}
                    onClick={() => {
                      if (!addTruckId) return;
                      setTrucks([...trucks, { truckId: addTruckId, planned: 1 }]);
                      setAddTruckId("");
                    }}
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>
              )}

              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <div className="form-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>
                <button className="primary" disabled={pending}>
                  {pending ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

export function DeleteJobButton({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      className="danger compact"
      disabled={pending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
        start(async () => {
          const r = await deleteJob(id);
          if (r.ok) router.refresh();
          else window.alert(r.error);
        });
      }}
    >
      <Trash2 size={14} /> Delete
    </button>
  );
}
