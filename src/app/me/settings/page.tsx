import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { KalkiPageHeader } from "@/components/ui/KalkiPageHeader";
import { KalkiSection } from "@/components/ui/KalkiSection";
import { PasswordChangeForm } from "@/components/me/PasswordChangeForm";
import { OrganizationManagementSection } from "@/components/me/OrganizationManagementSection";
import { ToastProvider } from "@/components/ui/Toast";
import { loadAuthorizationGrants } from "@/lib/authorization";

export default async function SettingsPage() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  
  if (!session) {
    redirect("/login");
  }

  const grants = await loadAuthorizationGrants(session.user.id);
  const isOwner = grants.isOwner;

  return (
    <div style={{ paddingBottom: "60px" }}>
      <KalkiPageHeader 
        title="Account Settings" 
        description="Manage your personal account settings, security, and system configurations." 
      />
      
      <div className="kalki-form-layout">
        <div className="kalki-form-main" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {isOwner && (
            <KalkiSection title="Organization Management" icon="🏢">
              <ToastProvider>
                <OrganizationManagementSection />
              </ToastProvider>
            </KalkiSection>
          )}

          <KalkiSection title="Security" icon="🔒">
            <div style={{ maxWidth: '400px' }}>
              <ToastProvider>
                <PasswordChangeForm />
              </ToastProvider>
            </div>
          </KalkiSection>
        </div>
      </div>
    </div>
  );
}
