import assert from "node:assert/strict";
import test from "node:test";

function roleForEmail(
  email: string | null | undefined,
  admins: string[],
): "admin" | "viewer" {
  if (!email) return "viewer";
  return admins.includes(email.toLowerCase()) ? "admin" : "viewer";
}

function roleForPassword(
  password: string,
  admin?: string,
  viewer?: string,
): "admin" | "viewer" | null {
  if (admin && password === admin) return "admin";
  if (viewer && password === viewer) return "viewer";
  return null;
}

test("admin emails map to admin role", () => {
  assert.equal(roleForEmail("Admin@vecon.asia", ["admin@vecon.asia"]), "admin");
  assert.equal(roleForEmail("ops@vecon.asia", ["admin@vecon.asia"]), "viewer");
});

test("legacy shared passwords still distinguish roles", () => {
  assert.equal(roleForPassword("same", "same", "same"), "admin");
  assert.equal(roleForPassword("see", "admin-secret", "see"), "viewer");
  assert.equal(roleForPassword("nope", "admin-secret", "see"), null);
});
