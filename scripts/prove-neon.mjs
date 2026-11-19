import postgres from "postgres";
import { readFileSync } from "node:fs";

function env(name) {
  const file = readFileSync(".env.local", "utf8");
  const line = file
    .split(/\r?\n/)
    .find((l) => l.startsWith(name + "=") || l.startsWith(name + '="'));
  if (!line) throw new Error(name + " missing from .env.local");
  return line.slice(name.length + 1).replace(/^"|"$/g, "");
}

const databaseUrl = env("DATABASE_URL");
const authBase = env("NEON_AUTH_BASE_URL").replace(/\/$/, "");
const sql = postgres(databaseUrl, { prepare: false, max: 1 });

const tables = await sql`
  select table_name
  from information_schema.tables
  where table_schema = 'public'
    and table_name in ('masters','jobs','job_trucks','trips')
  order by table_name
`;
console.log(
  "db_tables=" + tables.map((r) => r.table_name).join(","),
);

const masters = await sql`select count(*)::int as n from masters`;
console.log("masters_count=" + masters[0].n);

const authRes = await fetch(authBase + "/ok", { method: "GET" }).catch(
  () => null,
);
const authAlt = authRes?.ok
  ? authRes
  : await fetch(authBase, { method: "GET", redirect: "manual" });
console.log(
  "auth_http=" +
    (authAlt.status || 0) +
    " auth_url_configured=" +
    Boolean(authBase),
);

const email = `prove+${Date.now()}@vecon.asia`;
const password = "ProveTest-" + Date.now();
const signUp = await fetch(authBase + "/sign-up/email", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    origin: "http://127.0.0.1:3000",
  },
  body: JSON.stringify({
    email,
    password,
    name: "Prove User",
  }),
});
const signUpBody = await signUp.text();
console.log("signup_status=" + signUp.status);
if (!signUp.ok) console.log("signup_body=" + signUpBody.slice(0, 400));

const signIn = await fetch(authBase + "/sign-in/email", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    origin: "http://127.0.0.1:3000",
  },
  body: JSON.stringify({ email, password }),
});
console.log("signin_status=" + signIn.status);
if (!signIn.ok) console.log("signin_body=" + (await signIn.text()).slice(0, 400));

await sql.end({ timeout: 5 });
process.exit(signUp.ok && signIn.ok && tables.length === 4 ? 0 : 1);
