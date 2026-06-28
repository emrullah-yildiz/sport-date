import LoginForm from "@/components/LoginForm";

export const metadata = {
  title: "Sign in — Sport Date",
  description: "Return to your private Sport Date profile.",
};

export default function LoginPage() {
  return <main className="auth-page"><LoginForm /></main>;
}

