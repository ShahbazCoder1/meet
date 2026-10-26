"use client";

import Link from "next/link";
import { AuthHeading, AuthShell } from "@/components/auth/auth-ui";

function GoogleButton() {
  return <button type="button" className="google-button" onClick={() => window.alert("Google sign-in will be available when authentication is connected.")}><span className="google-g">G</span>Continue with Google</button>;
}

export function LoginPage() {
  return <AuthShell mode="login"><AuthHeading eyebrow="WELCOME BACK" title="Good to see" accent="you." description="Sign in with Google and pick up where the good conversations left off."/><GoogleButton/><p className="auth-legal">By continuing, you agree to our <Link href="/">Terms of Service</Link> and <Link href="/">Privacy Policy</Link>.</p></AuthShell>;
}

export function SignupPage() {
  return <AuthShell mode="signup"><AuthHeading eyebrow="A BETTER WAY TO GET TOGETHER" title="Make room for" accent="everyone." description="Create your free account and bring your people a little closer."/><GoogleButton/><p className="auth-legal">By continuing with Google, you agree to our <Link href="/">Terms of Service</Link> and <Link href="/">Privacy Policy</Link>.</p></AuthShell>;
}

