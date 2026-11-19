import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, rmSync } from "fs";
import { join, dirname } from "path";
import { execSync } from "child_process";

const root = process.cwd();
const msgFile = join(process.env.TEMP || "/tmp", "vecon-cmsg.txt");

function run(cmd) {
  execSync(cmd, { stdio: "inherit", shell: true });
}

function commit(message) {
  run("git add -A");
  try {
    execSync("git reset HEAD -- .env.local", { stdio: "ignore", shell: true });
  } catch {}
  const st = execSync("git status --porcelain", { shell: true }).toString();
  if (!st.trim()) {
    console.log("SKIP empty:", message.split("\n")[0]);
    return;
  }
  writeFileSync(msgFile, message);
  run(`git commit -F "${msgFile}"`);
  console.log("OK:", message.split("\n")[0]);
}

function write(path, content) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
}

// Ensure advanced feature files exist from current tree before we start partitioning
const keep = {
  "lib/job-edit.ts": readFileSync(join(root, "lib/job-edit.ts"), "utf8"),
  "components/job-admin.tsx": readFileSync(
    join(root, "components/job-admin.tsx"),
    "utf8",
  ),
  "lib/push.ts": readFileSync(join(root, "lib/push.ts"), "utf8"),
  "components/notify-toggle.tsx": readFileSync(
    join(root, "components/notify-toggle.tsx"),
    "utf8",
  ),
  "lib/report-day.ts": readFileSync(join(root, "lib/report-day.ts"), "utf8"),
  "app/api/push/vapid/route.ts": readFileSync(
    join(root, "app/api/push/vapid/route.ts"),
    "utf8",
  ),
  "app/api/push/subscribe/route.ts": readFileSync(
    join(root, "app/api/push/subscribe/route.ts"),
    "utf8",
  ),
  "tests/job-edit.test.ts": readFileSync(
    join(root, "tests/job-edit.test.ts"),
    "utf8",
  ),
  "tests/push.test.ts": readFileSync(join(root, "tests/push.test.ts"), "utf8"),
  "tests/report-day.test.ts": readFileSync(
    join(root, "tests/report-day.test.ts"),
    "utf8",
  ),
  "app/actions.ts": readFileSync(join(root, "app/actions.ts"), "utf8"),
  "app/(dispatch)/settings/page.tsx": readFileSync(
    join(root, "app/(dispatch)/settings/page.tsx"),
    "utf8",
  ),
  "app/(dispatch)/reports/page.tsx": readFileSync(
    join(root, "app/(dispatch)/reports/page.tsx"),
    "utf8",
  ),
  "app/(dispatch)/d/[date]/page.tsx": readFileSync(
    join(root, "app/(dispatch)/d/[date]/page.tsx"),
    "utf8",
  ),
  "app/(dispatch)/jobs/page.tsx": readFileSync(
    join(root, "app/(dispatch)/jobs/page.tsx"),
    "utf8",
  ),
  "db/schema.ts": readFileSync(join(root, "db/schema.ts"), "utf8"),
  "lib/store.ts": readFileSync(join(root, "lib/store.ts"), "utf8"),
  "public/sw.js": readFileSync(join(root, "public/sw.js"), "utf8"),
  "package.json": readFileSync(join(root, "package.json"), "utf8"),
  ".env.example": readFileSync(join(root, ".env.example"), "utf8"),
  "scripts/push-vercel-env.mjs": readFileSync(
    join(root, "scripts/push-vercel-env.mjs"),
    "utf8",
  ),
};

function rm(path) {
  const full = join(root, path);
  if (existsSync(full)) rmSync(full, { recursive: true, force: true });
}

// 1) Core dispatch UI without job-admin / push / detailed reports
write(
  "app/actions.ts",
  `"use server";
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
          \`Keep at least \${protectedTrips.length} trips already started.\`,
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
`,
);

write(
  "app/(dispatch)/reports/page.tsx",
  `import Link from "next/link";
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
              aria-label={\`Delivered tonnage on \${date}\`}
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
`,
);

write(
  "app/(dispatch)/settings/page.tsx",
  `import Link from "next/link";
import { logout } from "@/app/actions";
import { getAccess } from "@/lib/auth";
import { demoMode } from "@/lib/store";
export default async function Settings() {
  const access = await getAccess();
  return (
    <>
      <p className="eyebrow">Workspace</p>
      <h1>Settings</h1>
      <section className="panel settings">
        <h2>Install on your phone</h2>
        <p>
          On iPhone, open this site in Safari, tap Share, then Add to Home
          Screen.
        </p>
        <p>
          On Android, open the Chrome menu and choose Install app or Add to Home
          screen.
        </p>
      </section>
      <section className="panel settings">
        <h2>Connection and data</h2>
        <p>
          This app needs an internet connection to load jobs and save trip
          updates. If you lose connection, reconnect before trying again.
        </p>
        <p>Dispatch dates use Thailand time.</p>
        <p>
          {demoMode
            ? "Demo mode. Sample records are stored on this computer."
            : "Connected workspace. Records are stored in your PostgreSQL database."}
        </p>
      </section>
      <section className="panel settings">
        <h2>VECON Construction</h2>
        <p>Dispatch · Version 0.1.0</p>
        <p>
          Anyone can view daily jobs without signing in. Admins sign in to
          create jobs, update trips, and manage masters.
        </p>
        {!demoMode && access.guest && (
          <p>
            <Link className="primary" href="/login">
              Admin sign in
            </Link>
          </p>
        )}
        {!demoMode && !access.guest && (
          <form action={logout}>
            <button className="secondary">Sign out</button>
          </form>
        )}
      </section>
    </>
  );
}
`,
);

write(
  "app/(dispatch)/jobs/page.tsx",
  `import Link from "next/link";
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
            href={\`/d/\${j.date}?job=\${j.id}\`}
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
`,
);

let daily = keep["app/(dispatch)/d/[date]/page.tsx"];
daily = daily.replace(
  /import \{ JobAdmin \} from "@\/components\/job-admin";\n/,
  "",
);
daily = daily.replace(
  /\s*\{admin && <JobAdmin job=\{job\} masters=\{state\.masters\} \/>\}\n/,
  "\n",
);
write("app/(dispatch)/d/[date]/page.tsx", daily);

write(
  "public/sw.js",
  `const CACHE = "vecon-shell-v1";
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add("/offline.html")),
  );
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate" && event.request.method === "GET") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/offline.html")),
    );
  }
});
`,
);

write(
  "db/schema.ts",
  keep["db/schema.ts"].replace(
    /\/\*\* Web Push endpoints[\s\S]*$/,
    "",
  ),
);

// Remove advanced files for this commit
for (const f of Object.keys(keep)) {
  if (
    f.includes("job-edit") ||
    f.includes("job-admin") ||
    f.includes("push") ||
    f.includes("notify-toggle") ||
    f.includes("report-day") ||
    f.includes("api/push")
  )
    rm(f);
}

write(
  ".gitignore",
  `node_modules/
.next/
.env
.env.local
.env.*.local
!.env.example
.data/
test-results/
playwright-report/
*.tsbuildinfo
.neon
.vercel
.taste-skill/
`,
);

commit(`feat: add daily dispatch UI, masters, public access, and branding

Mobile-first shell with daily jobs, trip updates, job wizard, masters,
summary reports, VECON logo, and navy theme. Guests view without login;
admins manage writes after sign-in.
`);

// 2) Job edit / delete / trucks + store upsert fix
write("lib/job-edit.ts", keep["lib/job-edit.ts"]);
write("components/job-admin.tsx", keep["components/job-admin.tsx"]);
write("lib/store.ts", keep["lib/store.ts"]);
// Intermediate actions: job-edit yes, push no
{
  let a = keep["app/actions.ts"];
  a = a.replace(
    'import { notifyDispatchChange, type PushNotice } from "@/lib/push";\n',
    "",
  );
  a = a.replace(
    /const defaultNotice: PushNotice = \{[\s\S]*?\};\n/,
    "",
  );
  a = a.replace(
    /async function action\(\n  fn: \(\) => Promise<string \| void>,\n  notice: PushNotice \| false = defaultNotice,\n\): Promise<Result> \{/,
    "async function action(\n  fn: () => Promise<string | void>,\n): Promise<Result> {",
  );
  a = a.replace(
    /\n    \/\/ ponytail: fire-and-forget; failed push must never roll back a saved job\n    if \(notice\) void notifyDispatchChange\(notice\)\.catch\(\(\) => \{\}\);\n/,
    "\n",
  );
  a = a.replace(", false);", ");");
  a = a.replace(", false);", ");");
  write("app/actions.ts", a);
}
write("app/(dispatch)/d/[date]/page.tsx", keep["app/(dispatch)/d/[date]/page.tsx"]);
write("app/(dispatch)/jobs/page.tsx", keep["app/(dispatch)/jobs/page.tsx"]);
write("tests/job-edit.test.ts", keep["tests/job-edit.test.ts"]);

commit(`feat: admin job edit/delete and truck assignment changes

Fix Postgres mutate path to upsert existing jobs and remove deleted
jobs/assignments. Add Edit job UI to change header fields and add/remove
trucks with planned trip counts.
`);

// 3) Web push
write("lib/push.ts", keep["lib/push.ts"]);
write("components/notify-toggle.tsx", keep["components/notify-toggle.tsx"]);
write("app/api/push/vapid/route.ts", keep["app/api/push/vapid/route.ts"]);
write("app/api/push/subscribe/route.ts", keep["app/api/push/subscribe/route.ts"]);
write("db/schema.ts", keep["db/schema.ts"]);
write("public/sw.js", keep["public/sw.js"]);
write("app/actions.ts", keep["app/actions.ts"]);
write("app/(dispatch)/settings/page.tsx", keep["app/(dispatch)/settings/page.tsx"]);
write("tests/push.test.ts", keep["tests/push.test.ts"]);
write(".env.example", keep[".env.example"]);
write("package.json", keep["package.json"]);
write("scripts/push-vercel-env.mjs", keep["scripts/push-vercel-env.mjs"]);
// package-lock already present from earlier; leave as is

commit(`feat: add Web Push notifications for job and trip updates

Subscribe from Settings, store endpoints in Neon, and notify devices after
admin job/trip writes. Service worker shows OS notifications when closed.
`);

// 4) Reports detail
write("lib/report-day.ts", keep["lib/report-day.ts"]);
write("app/(dispatch)/reports/page.tsx", keep["app/(dispatch)/reports/page.tsx"]);
write("tests/report-day.test.ts", keep["tests/report-day.test.ts"]);

commit(`feat: expand daily reports with routes, trucks, and tons

Tap a day to see origin→destination routes, registrations, completed
trips, and transported weight per truck.
`);

// 5) Remaining tests + e2e + scripts
commit(`test: add domain, roles, and progress unit tests plus Playwright setup
`);

console.log("\nDone. Log:");
run("git log --oneline");
