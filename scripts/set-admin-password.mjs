const base = "https://vecon-dispatch.vercel.app";
const email = "admin@vecon.asia";
const password = "admin";
const name = "VECON Admin";

async function post(path, body) {
  const res = await fetch(base + path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: base,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, text };
}

const signup = await post("/api/auth/sign-up/email", { email, password, name });
console.log("signup_status=" + signup.status);
console.log("signup_body=" + signup.text.slice(0, 500));

if (signup.ok) {
  console.log("ok email=" + email + " password=" + password);
  process.exit(0);
}

const signin = await post("/api/auth/sign-in/email", { email, password });
console.log("signin_status=" + signin.status);
console.log("signin_body=" + signin.text.slice(0, 500));
process.exit(signup.ok || signin.ok ? 0 : 1);
