import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { KalkiPageHeader } from "@/components/ui/KalkiPageHeader";
import { KalkiSection } from "@/components/ui/KalkiSection";
import { PasswordChangeForm } from "@/components/me/PasswordChangeForm";

export default async function SettingsPage() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  
  if (!session) {
    redirect("/login");
  }

  return (
    <div style={{ paddingBottom: "60px" }}>
      <KalkiPageHeader 
        title="Account Settings" 
        description="Manage your personal account settings and security." 
      />
      
      <div className="kalki-form-layout">
        <div className="kalki-form-main">
          <KalkiSection title="Security" icon="🔒">
            <div style={{ maxWidth: '400px' }}>
              <PasswordChangeForm />
            </div>
          </KalkiSection>
        </div>
      </div>
    </div>
  );
}
