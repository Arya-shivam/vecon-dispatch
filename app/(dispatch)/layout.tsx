import { getAccess } from "@/lib/auth";
import { demoMode } from "@/lib/store";
import { Shell } from "@/components/shell";
export const dynamic = "force-dynamic";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await getAccess();
  return (
    <Shell
      demo={demoMode}
      role={access.role}
      guest={access.guest}
      email={access.email}
    >
      {children}
    </Shell>
  );
}
