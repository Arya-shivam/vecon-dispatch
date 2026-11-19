import { createRequire } from "node:module";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { pushSubscriptions } from "@/db/schema";
import { demoMode } from "./config";

const require = createRequire(import.meta.url);
const webpush = require("web-push") as typeof import("web-push");

export type PushNotice = {
  title: string;
  body: string;
  url?: string;
};

function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return url
    .replace(/([?&])channel_binding=require&?/g, "$1")
    .replace(/[?&]$/, "")
    .replace(/\?&/, "?");
}

function db() {
  const url = databaseUrl();
  if (!url || demoMode) return null;
  const client = postgres(url, { prepare: false, max: 1, ssl: "require" });
  return { client, orm: drizzle(client) };
}

export function vapidPublicKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
}

function vapidConfigured() {
  return !!(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT
  );
}

function configureWebPush() {
  if (!vapidConfigured()) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  return true;
}

export async function savePushSubscription(input: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
}) {
  const conn = db();
  if (!conn) throw new Error("Push subscriptions need a database.");
  try {
    const row = {
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      userAgent: (input.userAgent || "").slice(0, 300),
      createdAt: new Date().toISOString(),
    };
    await conn.orm
      .insert(pushSubscriptions)
      .values(row)
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          p256dh: row.p256dh,
          auth: row.auth,
          userAgent: row.userAgent,
        },
      });
  } finally {
    await conn.client.end({ timeout: 2 });
  }
}

export async function deletePushSubscription(endpoint: string) {
  const conn = db();
  if (!conn) return;
  try {
    await conn.orm
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint));
  } finally {
    await conn.client.end({ timeout: 2 });
  }
}

/** Fire-and-forget safe: never throws to callers that void it. */
export async function notifyDispatchChange(notice: PushNotice) {
  if (!configureWebPush()) return { sent: 0, reason: "vapid_missing" as const };
  const conn = db();
  if (!conn) return { sent: 0, reason: "no_db" as const };
  try {
    const rows = await conn.orm.select().from(pushSubscriptions);
    const payload = JSON.stringify({
      title: notice.title,
      body: notice.body,
      url: notice.url || "/",
    });
    let sent = 0;
    for (const row of rows) {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          payload,
          { TTL: 60 * 60 },
        );
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number })?.statusCode;
        // Gone / unsubscribed
        if (status === 404 || status === 410)
          await conn.orm
            .delete(pushSubscriptions)
            .where(eq(pushSubscriptions.endpoint, row.endpoint));
      }
    }
    return { sent, reason: "ok" as const };
  } finally {
    await conn.client.end({ timeout: 2 });
  }
}
