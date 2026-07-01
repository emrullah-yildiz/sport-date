import SignUpForm from "@/components/SignUpForm";

export const metadata = {
  title: "Sign Up",
  description: "Create a private beta profile and meet people through sports.",
};

export default function SignUpPage() {
  return <main className="signup-page-main"><SignUpForm /></main>;
}

