"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, X } from "lucide-react";
import { type Master, type MasterKind, number } from "@/lib/domain";
import { saveMaster, deleteMaster } from "@/app/actions";
export function MasterList({
  kind,
  records,
}: {
  kind: MasterKind;
  records: Master[];
}) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Master | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const title = kind[0].toUpperCase() + kind.slice(1);
  function blank(): Master {
    return {
      id: "",
      kind,
      name: "",
      code: "",
      contact: "",
      wt: 0,
      truckType: "",
      owner: "",
      active: true,
    };
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Master data</p>
          <h1>{title}</h1>
        </div>
        <button
          className="primary compact"
          onClick={() => {
            setError("");
            setEditing(blank());
          }}
        >
          <Plus size={16} /> Add
        </button>
      </div>
      <p className="muted">Maintain {kind} available for dispatch planning.</p>
      <div className="search">
        <Search size={18} />
        <input
          aria-label={`Search ${kind}`}
          placeholder={`Search ${kind}…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="section-heading">
        <span>
          {records.length} {kind}
        </span>
      </div>
      {records
        .filter((m) =>
          (m.name + " " + m.code).toLowerCase().includes(search.toLowerCase()),
        )
        .map((m) => (
          <button
            key={m.id}
            className="master-row"
            onClick={() => {
              setError("");
              setEditing(m);
            }}
          >
            <div>
              <strong>{m.name}</strong>
              <span>
                {kind === "trucks"
                  ? `${number(m.wt)} t · ${m.truckType}`
                  : m.code || m.contact || "No code"}
              </span>
            </div>
            <span className="badge">{m.active ? "Active" : "Inactive"}</span>
          </button>
        ))}
      {records.length === 0 && (
        <div className="empty panel">
          <h2>No {kind} yet</h2>
          <p>Add the first record to use it in new jobs.</p>
        </div>
      )}
      {editing && (
        <div className="modal-backdrop">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="master-title"
            className="modal"
          >
            <div className="row">
              <h2 id="master-title">
                {editing.id ? "Edit" : "Add"}{" "}
                {kind === "trucks" ? "truck" : kind.slice(0, -1)}
              </h2>
              <button
                className="icon-button"
                aria-label="Close editor"
                onClick={() => setEditing(null)}
              >
                <X size={20} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                start(async () => {
                  const result = await saveMaster(editing);
                  if (!result.ok) setError(result.error);
                  else {
                    setEditing(null);
                    router.refresh();
                  }
                });
              }}
            >
              <label>
                {kind === "trucks" ? "Registration" : "Name"}
                <input
                  autoFocus
                  required
                  maxLength={120}
                  value={editing.name}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                />
              </label>
              <label>
                Code
                <input
                  maxLength={50}
                  value={editing.code}
                  onChange={(e) =>
                    setEditing({ ...editing, code: e.target.value })
                  }
                />
              </label>
              <label>
                Contact
                <input
                  maxLength={150}
                  value={editing.contact}
                  onChange={(e) =>
                    setEditing({ ...editing, contact: e.target.value })
                  }
                />
              </label>
              {kind === "trucks" && (
                <>
                  <label>
                    WT (tons per trip)
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="200"
                      required
                      value={editing.wt || ""}
                      onChange={(e) =>
                        setEditing({ ...editing, wt: Number(e.target.value) })
                      }
                    />
                  </label>
                  <label>
                    Truck type
                    <input
                      maxLength={60}
                      value={editing.truckType}
                      onChange={(e) =>
                        setEditing({ ...editing, truckType: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Owner / team
                    <input
                      maxLength={120}
                      value={editing.owner}
                      onChange={(e) =>
                        setEditing({ ...editing, owner: e.target.value })
                      }
                    />
                  </label>
                </>
              )}
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={editing.active}
                  onChange={(e) =>
                    setEditing({ ...editing, active: e.target.checked })
                  }
                />{" "}
                Available for new jobs
              </label>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <div className="form-actions">
                {editing.id && (
                  <button
                    type="button"
                    className="danger"
                    disabled={pending}
                    onClick={() => {
                      if (!window.confirm(`Delete ${editing.name}?`)) return;
                      start(async () => {
                        let r = await deleteMaster(editing.id);
                        if (
                          !r.ok &&
                          r.error.includes("Used by a job") &&
                          window.confirm(
                            `${editing.name} is used by a job. Force delete anyway? Past jobs may show “Unavailable”.`,
                          )
                        )
                          r = await deleteMaster({
                            id: editing.id,
                            force: true,
                          });
                        if (!r.ok) setError(r.error);
                        else {
                          setEditing(null);
                          router.refresh();
                        }
                      });
                    }}
                  >
                    Delete
                  </button>
                )}
                <button className="primary" disabled={pending}>
                  {pending ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
