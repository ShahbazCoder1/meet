import { twCss } from "@/lib/tailwind-classes";
import Link from "next/link";
import { ArrowRight, CalendarDays, Sparkles, Video } from "lucide-react";
import type { ReactNode } from "react";

export function AuthShell({ children, mode }: { children: ReactNode; mode: "login" | "signup" }) {
  return <main className={twCss("auth-shell")}><div className={twCss("auth-decoration")} aria-hidden="true"><div className={twCss("auth-orbit auth-orbit-one")}/><div className={twCss("auth-orbit auth-orbit-two")}/><div className={twCss("auth-sun")}/><div className={twCss("auth-window")}><div/><i/><b/></div><div className={twCss("auth-desk")}/><div className={twCss("auth-laptop")}><span>m.</span></div><div className={twCss("auth-mug")}/><div className={twCss("auth-plant")}><i/><b/><span/></div><span className={twCss("auth-spark auth-spark-one")}>✳</span><span className={twCss("auth-spark auth-spark-two")}>✦</span><div className={twCss("auth-art-caption")}>GOOD THINGS HAPPEN<br/>WHEN WE GET TOGETHER.</div></div><section className={twCss("auth-main")}><header className={twCss("auth-header")}><Link href="/" className={twCss("brand auth-brand")}><span className={twCss("brand-mark")}><span/><span/><span/><span/></span><span>meet<span className={twCss("brand-period")}>.</span></span></Link><div className={twCss("auth-header-prompt")}>{mode === "signup" ? <>Already have an account? <Link href="/login">Sign in <ArrowRight size={13}/></Link></> : <>New to meet? <Link href="/signup">Create account <ArrowRight size={13}/></Link></>}</div></header><div className={twCss("auth-content")}>{children}</div><footer className={twCss("auth-footer")}><span>© 2026 meet. A little space to connect.</span><div><Link href="/">Privacy</Link><Link href="/">Terms</Link><button type="button">English <span>⌄</span></button></div></footer></section></main>;
}

export function AuthHeading({ eyebrow, title, accent, description }: { eyebrow: string; title: string; accent?: string; description: string }) {
  return <div className={twCss("auth-heading")}><p className={twCss("auth-eyebrow")}><span/> {eyebrow}</p><h1>{title}{accent&&<> <em>{accent}</em></>}</h1><p className={twCss("auth-description")}>{description}</p></div>;
}

export const authHighlights = [
  { icon: Video, title: "Meet in one click", detail: "No downloads. No fuss." },
  { icon: CalendarDays, title: "Find your people", detail: "Good conversations start here." },
  { icon: Sparkles, title: "Make room for ideas", detail: "Your best work is a team sport." },
];
