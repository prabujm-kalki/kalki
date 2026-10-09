import { SettingsSubNav } from "./SettingsSubNav";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <><SettingsSubNav />{children}</>;
}
