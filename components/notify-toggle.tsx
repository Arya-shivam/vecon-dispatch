"use client";
import { useEffect, useState, useTransition } from "react";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function NotifyToggle() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [on, setOn] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setSupported(ok);
    if (!ok) return;
    setPermission(Notification.permission);
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setOn(!!sub))
      .catch(() => {});
  }, []);

  if (!supported)
    return (
      <p>
        This browser cannot receive push notifications. On iPhone, add the app
        to the Home Screen first, then open it from there.
      </p>
    );

  return (
    <>
      <p>
        Get an alert when jobs or trips change — even if the app is closed.
        Works best on Android Chrome and iPhone Home Screen apps.
      </p>
      <p className="small">Permission: {permission}</p>
      {message && (
        <p className={message.startsWith("Could") ? "error" : "notice"} role="status">
          {message}
        </p>
      )}
      {on ? (
        <button
          type="button"
          className="secondary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setMessage("");
              try {
                const reg = await navigator.serviceWorker.ready;
                const sub = await reg.pushManager.getSubscription();
                if (sub) {
                  await fetch("/api/push/subscribe", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ endpoint: sub.endpoint }),
                  });
                  await sub.unsubscribe();
                }
                setOn(false);
                setMessage("Notifications turned off on this device.");
              } catch (e) {
                setMessage(
                  e instanceof Error ? e.message : "Could not turn off.",
                );
              }
            })
          }
        >
          {pending ? "Working…" : "Turn off notifications"}
        </button>
      ) : (
        <button
          type="button"
          className="primary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setMessage("");
              try {
                const perm = await Notification.requestPermission();
                setPermission(perm);
                if (perm !== "granted") {
                  setMessage("Notifications were blocked for this site.");
                  return;
                }
                const keyRes = await fetch("/api/push/vapid");
                const keyJson = await keyRes.json();
                if (!keyRes.ok || !keyJson.publicKey)
                  throw new Error(
                    keyJson.error || "Push is not configured on the server.",
                  );
                const reg = await navigator.serviceWorker.register("/sw.js");
                await navigator.serviceWorker.ready;
                const sub = await reg.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey: urlBase64ToUint8Array(keyJson.publicKey),
                });
                const json = sub.toJSON();
                const save = await fetch("/api/push/subscribe", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    endpoint: json.endpoint,
                    keys: json.keys,
                  }),
                });
                const saved = await save.json();
                if (!save.ok || !saved.ok)
                  throw new Error(saved.error || "Could not save subscription.");
                setOn(true);
                setMessage("Notifications enabled on this device.");
              } catch (e) {
                setMessage(
                  e instanceof Error ? e.message : "Could not enable notifications.",
                );
              }
            })
          }
        >
          {pending ? "Enabling…" : "Enable notifications"}
        </button>
      )}
    </>
  );
}
