"use client";

import Link from "next/link";
import { AuthHeading, AuthShell } from "@/components/auth/auth-ui";

function GoogleButton() {
  return <button type="button" className="google-button" onClick={() => window.alert("Google sign-in will be available when authentication is connected.")}><svg className="google-icon" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11c-.5 2.5-2 4.7-4.1 6.1l6.6 5.1c3.9-3.6 6.1-8.8 6.1-14.9z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5.1c-1.8 1.2-4.1 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4l-6.8 5.2C9.2 39.4 16.1 44 24 44z"/><path fill="#FBBC05" d="M12.6 27.6c-.4-1.1-.6-2.3-.6-3.6s.2-2.5.6-3.6l-6.8-5.2C4.7 17.8 4 20.8 4 24s.7 6.2 1.8 8.8l6.8-5.2z"/><path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 6 29.5 4 24 4 16.1 4 9.2 8.6 5.8 15.2l6.8 5.2C14.2 15.6 18.7 12 24 12z"/></svg>Continue with Google</button>;
}

export function LoginPage() {
  return <AuthShell mode="login"><AuthHeading eyebrow="WELCOME BACK" title="Good to see" accent="you." description="Sign in with Google and pick up where the good conversations left off."/><GoogleButton/><p className="auth-legal">By continuing, you agree to our <Link href="/">Terms of Service</Link> and <Link href="/">Privacy Policy</Link>.</p></AuthShell>;
}

export function SignupPage() {
  return <AuthShell mode="signup"><AuthHeading eyebrow="A BETTER WAY TO GET TOGETHER" title="Make room for" accent="everyone." description="Create your free account and bring your people a little closer."/><GoogleButton/><p className="auth-legal">By continuing with Google, you agree to our <Link href="/">Terms of Service</Link> and <Link href="/">Privacy Policy</Link>.</p></AuthShell>;
}

