import Link from "next/link";
import { ArrowRight, CalendarDays, Sparkles, Video } from "lucide-react";
import type { ReactNode } from "react";

export function AuthShell({ children, mode }: { children: ReactNode; mode: "login" | "signup" }) {
  return <main className="auth-shell"><div className="auth-decoration" aria-hidden="true"><div className="auth-orbit auth-orbit-one"/><div className="auth-orbit auth-orbit-two"/><div className="auth-sun"/><div className="auth-window"><div/><i/><b/></div><div className="auth-desk"/><div className="auth-laptop"><span>m.</span></div><div className="auth-mug"/><div className="auth-plant"><i/><b/><span/></div><span className="auth-spark auth-spark-one">✳</span><span className="auth-spark auth-spark-two">✦</span><div className="auth-art-caption">GOOD THINGS HAPPEN<br/>WHEN WE GET TOGETHER.</div></div><section className="auth-main"><header className="auth-header"><Link href="/" className="brand auth-brand"><span className="brand-mark"><span/><span/><span/><span/></span><span>meet<span className="brand-period">.</span></span></Link><div className="auth-header-prompt">{mode === "signup" ? <>Already have an account? <Link href="/login">Sign in <ArrowRight size={13}/></Link></> : <>New to meet? <Link href="/signup">Create account <ArrowRight size={13}/></Link></>}</div></header><div className="auth-content">{children}</div><footer className="auth-footer"><span>© 2026 meet. A little space to connect.</span><div><Link href="/">Privacy</Link><Link href="/">Terms</Link><button type="button">English <span>⌄</span></button></div></footer></section></main>;
}

export function AuthHeading({ eyebrow, title, accent, description }: { eyebrow: string; title: string; accent?: string; description: string }) {
  return <div className="auth-heading"><p className="auth-eyebrow"><span/> {eyebrow}</p><h1>{title}{accent&&<> <em>{accent}</em></>}</h1><p className="auth-description">{description}</p></div>;
}

export const authHighlights = [
  { icon: Video, title: "Meet in one click", detail: "No downloads. No fuss." },
  { icon: CalendarDays, title: "Find your people", detail: "Good conversations start here." },
  { icon: Sparkles, title: "Make room for ideas", detail: "Your best work is a team sport." },
];
