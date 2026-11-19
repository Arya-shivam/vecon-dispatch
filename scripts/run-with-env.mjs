import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const env = { ...process.env };
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!m) continue;
  env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const args = process.argv.slice(2);
const r = spawnSync(args[0], args.slice(1), {
  env,
  encoding: "utf8",
  shell: true,
  stdio: "inherit",
});
process.exit(r.status ?? 1);
