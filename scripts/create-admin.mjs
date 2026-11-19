const base = "https://vecon-dispatch.vercel.app";
const email = process.argv[2] || "aryashivam54@gmail.com";
const password = process.argv[3] || "VeconAdmin-" + Date.now().toString().slice(-6);
const name = process.argv[4] || "VECON Admin";

const signup = await fetch(base + "/api/auth/sign-up/email", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    origin: base,
  },
  body: JSON.stringify({ email, password, name }),
});
const body = await signup.text();
console.log("signup_status=" + signup.status);
console.log("signup_body=" + body.slice(0, 400));
console.log("email=" + email);
console.log("password=" + password);
process.exit(signup.ok ? 0 : 1);
