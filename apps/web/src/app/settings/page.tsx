import { redirect } from "next/navigation";
import PrimaryNav from "@/components/PrimaryNav";
import SiteFooter from "@/components/SiteFooter";
import EmailVerificationControls from "@/components/EmailVerificationControls";
import CommunicationPreferences from "@/components/CommunicationPreferences";
import WebSessionControls from "@/components/WebSessionControls";
import MobileSessionControls from "@/components/MobileSessionControls";
import PrivacyControls from "@/components/PrivacyControls";
import PlusBilling from "@/components/PlusBilling";
import { getCurrentUser } from "@/lib/session";
import { getCommunicationPreferences } from "@/lib/communication-preferences";
import { resolveTransactionalEmailProvider } from "@/lib/email-provider";
import { isPlus } from "@/lib/entitlements";
import { isBillingConfigured } from "@/lib/stripe";
import styles from "./settings.module.css";

export const metadata = { title: "Account settings" };
export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const preferences = await getCommunicationPreferences(user.id);
  return <main className={styles.page}>
    <PrimaryNav firstName={user.firstName} />
    <div className={styles.shell}>
      <h1>Account settings</h1>
      <p className={styles.intro}>Your account, on your terms.</p>
      <details className={styles.section}><summary>Email &amp; sign-in</summary><div id="account-security"><p>{user.email}</p><EmailVerificationControls emailVerified={user.emailVerified} emailDeliveryLive={resolveTransactionalEmailProvider() === "gmail"} /></div></details>
      <details className={styles.section}><summary>Notifications</summary><CommunicationPreferences preferences={preferences} /></details>
      <details className={styles.section}><summary>Devices &amp; sessions</summary><WebSessionControls /><MobileSessionControls /></details>
      <details className={styles.section}><summary>Your data &amp; account deletion</summary><PrivacyControls /></details>
      <PlusBilling billingConfigured={isBillingConfigured()} isPlus={isPlus(user)} />
    </div>
    <SiteFooter />
  </main>;
}
