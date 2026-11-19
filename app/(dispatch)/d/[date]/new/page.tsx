import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { readState } from "@/lib/store";
import { dateSchema } from "@/lib/domain";
import { Wizard } from "@/components/wizard";
export default async function NewJob({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  await requireAdmin();
  const { date } = await params;
  if (!dateSchema.safeParse(date).success) notFound();
  const state = await readState();
  return <Wizard masters={state.masters.filter((m) => m.active)} date={date} />;
}
