import SignUpForm from "@/components/SignUpForm";

export const metadata = {
  title: "Sign Up",
  description: "Create a profile and meet people through sports. The early preview is open to adults — no invite needed.",
};

export default function SignUpPage() {
  return <main className="signup-page-main"><SignUpForm /></main>;
}

