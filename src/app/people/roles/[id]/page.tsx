import { RoleProfile } from "@/components/people/RoleProfile";
import { AppShell } from "@/components/AppShell";

export default function RoleProfilePage({ params }: { params: { id: string } }) {
  return (
    <AppShell>
      <RoleProfile roleId={params.id} />
    </AppShell>
  );
}
