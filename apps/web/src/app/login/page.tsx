import { BRAND_NAME } from "@/lib/brand";
import LoginForm from "@/components/LoginForm";

export const metadata = {
  title: "Sign in",
  description: `Return to your private ${BRAND_NAME} profile.`,
};

export default function LoginPage() {
  return <main className="auth-page"><LoginForm /></main>;
}

