import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const file = readFileSync(".env.local", "utf8");
function get(name) {
  const line = file
    .split(/\r?\n/)
    .find((l) => l.startsWith(name + "=") || l.startsWith(name + '="'));
  if (!line) throw new Error(name + " missing");
  return line.slice(name.length + 1).replace(/^"|"$/g, "");
}

function clean(url) {
  let u = url
    .replace(/([?&])channel_binding=require&?/g, "$1")
    .replace(/[?&]$/, "")
    .replace(/\?&/, "?");
  if (!/[?&]sslmode=/.test(u)) {
    u += (u.includes("?") ? "&" : "?") + "sslmode=require";
  }
  return u;
}

const scope = "aryashivam54-gmailcoms-projects";
const keys = ["DATABASE_URL", "DATABASE_URL_UNPOOLED"];
for (const key of keys) {
  const value = clean(get(key));
  for (const target of ["production", "preview", "development"]) {
    const r = spawnSync(
      "vercel",
      [
        "env",
        "add",
        key,
        target,
        "--yes",
        "--force",
        "--sensitive",
        "--value",
        value,
        "--scope",
        scope,
      ],
      { encoding: "utf8", shell: true },
    );
    const out = `${r.stdout || ""}${r.stderr || ""}`;
    console.log(
      (/Overrode|Created|Saved|Added/i.test(out) || r.status === 0
        ? "ok"
        : "fail") +
        " " +
        key +
        " " +
        target,
    );
  }
}
