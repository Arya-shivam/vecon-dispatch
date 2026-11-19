import { NextResponse } from "next/server";
import { z } from "zod";
import { deletePushSubscription, savePushSubscription } from "@/lib/push";

const bodySchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const value = bodySchema.parse(json);
    await savePushSubscription({
      ...value,
      userAgent: req.headers.get("user-agent") || "",
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Could not save subscription.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const json = await req.json();
    const endpoint = z.string().url().parse(json.endpoint);
    await deletePushSubscription(endpoint);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Could not remove subscription.",
      },
      { status: 400 },
    );
  }
}
