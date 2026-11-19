import { readFileSync } from "node:fs";
import postgres from "postgres";

const file = readFileSync(".env.local", "utf8");
function get(name) {
  const line = file
    .split(/\r?\n/)
    .find((l) => l.startsWith(name + "=") || l.startsWith(name + '="'));
  if (!line) throw new Error(name + " missing");
  return line.slice(name.length + 1).replace(/^"|"$/g, "");
}

const url = get("DATABASE_URL");
console.log("has_channel_binding=" + url.includes("channel_binding"));
console.log("has_pooler=" + url.includes("-pooler"));

const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 15 });
try {
  const r = await sql`select count(*)::int as n from masters`;
  console.log("masters_ok=" + r[0].n);
} catch (e) {
  console.log("db_error=" + String(e?.message || e).slice(0, 400));
} finally {
  await sql.end({ timeout: 5 });
}
