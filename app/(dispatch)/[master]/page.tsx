import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { kindSchema } from "@/lib/domain";
import { readState } from "@/lib/store";
import { MasterList } from "@/components/masters";
export default async function MasterPage({
  params,
}: {
  params: Promise<{ master: string }>;
}) {
  await requireAdmin();
  const parsed = kindSchema.safeParse((await params).master);
  if (!parsed.success) notFound();
  const state = await readState();
  return (
    <MasterList
      kind={parsed.data}
      records={state.masters.filter((m) => m.kind === parsed.data)}
    />
  );
}
