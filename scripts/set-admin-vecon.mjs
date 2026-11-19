const base = "https://vecon-dispatch.vercel.app";

async function post(path, body) {
  const res = await fetch(base + path, {
    method: "POST",
    headers: { "content-type": "application/json", origin: base },
    body: JSON.stringify(body),
  });
  return { status: res.status, text: await res.text() };
}

const attempts = [
  { email: "admin@vecon", password: "admin", name: "VECON Admin" },
  { email: "admin@vecon", password: "admin@vecon", name: "VECON Admin" },
  { email: "admin@vecon.asia", password: "admin@vecon", name: "VECON Admin" },
];

for (const a of attempts) {
  const signup = await post("/api/auth/sign-up/email", a);
  console.log("---");
  console.log("try email=" + a.email + " password=" + a.password);
  console.log("signup_status=" + signup.status);
  console.log("signup_body=" + signup.text.slice(0, 300));
  if (signup.ok) {
    const signin = await post("/api/auth/sign-in/email", {
      email: a.email,
      password: a.password,
    });
    console.log("signin_status=" + signin.status);
    console.log("READY email=" + a.email + " password=" + a.password);
    process.exit(0);
  }
}
process.exit(1);
