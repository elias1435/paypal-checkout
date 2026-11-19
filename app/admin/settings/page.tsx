import { redirect } from "next/navigation";
import { currentAdminUser, isAdmin } from "@/lib/auth";
import { getAdminAccount, getSettings } from "@/lib/settings";
import AdminNav from "../AdminNav";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  const { logoVersion, ...settings } = await getSettings();
  const usingEnvLogin = !(await getAdminAccount().catch(() => null));
  return (
    <main className="admin">
      <AdminNav active="settings" />
      <SettingsForm
        initial={settings}
        initialLogoVersion={logoVersion}
        adminUser={await currentAdminUser()}
        usingEnvLogin={usingEnvLogin}
      />
    </main>
  );
}
