import assert from "node:assert/strict";
import test from "node:test";
import { vapidPublicKey } from "../lib/push";

test("vapidPublicKey reads NEXT_PUBLIC_VAPID_PUBLIC_KEY", () => {
  const prev = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-public-key";
  assert.equal(vapidPublicKey(), "test-public-key");
  if (prev === undefined) delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  else process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = prev;
});

test("notifyDispatchChange is a no-op without full VAPID config", async () => {
  const { notifyDispatchChange } = await import("../lib/push");
  const prev = {
    pub: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    priv: process.env.VAPID_PRIVATE_KEY,
    sub: process.env.VAPID_SUBJECT,
  };
  delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  delete process.env.VAPID_PRIVATE_KEY;
  delete process.env.VAPID_SUBJECT;
  const result = await notifyDispatchChange({
    title: "t",
    body: "b",
  });
  assert.equal(result.sent, 0);
  assert.equal(result.reason, "vapid_missing");
  if (prev.pub) process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = prev.pub;
  if (prev.priv) process.env.VAPID_PRIVATE_KEY = prev.priv;
  if (prev.sub) process.env.VAPID_SUBJECT = prev.sub;
});
