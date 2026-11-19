const base = "https://vecon-dispatch.vercel.app";
const email = "admin@vecon.asia";
const password = "admin@vecon";

const signin = await fetch(base + "/api/auth/sign-in/email", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    origin: base,
  },
  body: JSON.stringify({ email, password }),
});
const body = await signin.text();
console.log("signin_status=" + signin.status);
console.log("signin_body=" + body.slice(0, 300));

if (!signin.ok) {
  const signup = await fetch(base + "/api/auth/sign-up/email", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: base,
    },
    body: JSON.stringify({ email, password, name: "VECON Admin" }),
  });
  console.log("signup_status=" + signup.status);
  console.log("signup_body=" + (await signup.text()).slice(0, 300));
  const again = await fetch(base + "/api/auth/sign-in/email", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: base,
    },
    body: JSON.stringify({ email, password }),
  });
  console.log("signin2_status=" + again.status);
  console.log("signin2_body=" + (await again.text()).slice(0, 300));
  process.exit(again.ok ? 0 : 1);
}

console.log("READY email=" + email + " password=" + password);
process.exit(0);
