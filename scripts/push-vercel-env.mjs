import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const scope = "aryashivam54-gmailcoms-projects";
const targets = ["production", "preview", "development"];

const envMap = new Map();
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!m) continue;
  envMap.set(m[1], m[2].replace(/^"|"$/g, ""));
}
envMap.set("DEMO_MODE", "false");

const secrets = [
  "DATABASE_URL",
  "DATABASE_URL_UNPOOLED",
  "NEON_BRANCH",
  "NEON_AUTH_BASE_URL",
  "NEON_AUTH_JWKS_URL",
  "NEON_AUTH_COOKIE_SECRET",
  "SESSION_SECRET",
  "ADMIN_EMAILS",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_ENDPOINT_URL_S3",
  "AWS_REGION",
  "VAPID_PRIVATE_KEY",
];

const publicEnv = ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_SUBJECT"];

function run(args) {
  return spawnSync("vercel", args, { encoding: "utf8", shell: true });
}

let failed = 0;
function addEnv(key, value, sensitive) {
  for (const target of targets) {
    const r = run([
      "env",
      "add",
      key,
      target,
      "--yes",
      "--force",
      sensitive ? "--sensitive" : "--no-sensitive",
      "--value",
      value,
      "--scope",
      scope,
    ]);
    const out = `${r.stdout || ""}${r.stderr || ""}`;
    const ok = /Overrode|Created|Saved|Added/i.test(out) || r.status === 0;
    console.log((ok ? "ok" : "fail") + " " + key + " " + target);
    if (!ok) failed++;
  }
}

for (const key of secrets) {
  const value = envMap.get(key);
  if (!value) {
    console.error("missing " + key);
    failed++;
    continue;
  }
  addEnv(key, value, true);
}
for (const key of publicEnv) {
  const value = envMap.get(key);
  if (!value) {
    console.error("missing " + key);
    failed++;
    continue;
  }
  addEnv(key, value, false);
}

for (const target of targets) {
  const r = run([
    "env",
    "add",
    "DEMO_MODE",
    target,
    "--yes",
    "--force",
    "--no-sensitive",
    "--value",
    "false",
    "--scope",
    scope,
  ]);
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  const ok = /Overrode|Created|Saved|Added/i.test(out) || r.status === 0;
  console.log((ok ? "ok" : "fail") + " DEMO_MODE " + target);
  if (!ok) failed++;
}

process.exit(failed ? 1 : 0);
