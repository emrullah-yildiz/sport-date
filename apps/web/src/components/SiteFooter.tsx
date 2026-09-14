import Link from "next/link";
import { SUPPORT_EMAIL, Wordmark } from "@/lib/brand";
import styles from "./SiteFooter.module.css";

export default function SiteFooter() {
  return <footer className={styles.footer}>
    <Wordmark variant="footer" />
    <nav aria-label="Help and legal"><Link href="/safety">Safety center</Link><Link href="/trust">About this preview</Link><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><a href={`mailto:${SUPPORT_EMAIL}`}>Support</a></nav>
  </footer>;
}
