"use client";

import { twCss } from "@/lib/tailwind-classes";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Bell, CalendarDays, CircleHelp, Clock3, Link2, MoreHorizontal, Settings2, Sparkles, Video, LayoutDashboard } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export const iconMap = {
  home: LayoutDashboard,
  calendar: CalendarDays,
  settings: Settings2,
  help: CircleHelp,
  arrow: ArrowRight,
  clock: Clock3,
  more: MoreHorizontal,
  video: Video,
  link: Link2,
  spark: Sparkles,
  bell: Bell,
} satisfies Record<string, LucideIcon>;
export type IconName = keyof typeof iconMap;

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  const Component = iconMap[name];
  return <Component aria-hidden="true" size={size} strokeWidth={1.7} className={twCss(className)}/>;
}

export function Brand({ compact = false }: { compact?: boolean }) {
  const markClass = compact
    ? "relative grid size-6 grid-cols-2 gap-[3px] rotate-[-8deg] text-[19px] text-[#ef9b7d] [&>span]:rounded-[4px] [&>span]:bg-[#f18e75] [&>span:nth-child(2)]:opacity-60 [&>span:nth-child(3)]:opacity-80 [&>span:nth-child(4)]:bg-[#e8ca9a]"
    : "grid size-6 grid-cols-2 gap-[3px] rotate-[-8deg] [&>span]:rounded-[4px] [&>span]:bg-[#f18e75] [&>span:nth-child(2)]:opacity-60 [&>span:nth-child(3)]:opacity-80 [&>span:nth-child(4)]:bg-[#e8ca9a]";
  return <Link className={twCss(compact ? "inline-flex items-center gap-2 text-[19px] font-bold tracking-[-.8px] text-[#eeeae5] no-underline" : "inline-flex h-10 items-center gap-[11px] p-0 text-[22px] font-bold tracking-[-1.2px] text-[#f1efeb] no-underline")} href="/" aria-label="Meet home"><span className={twCss(markClass)} aria-hidden="true"><span/><span/><span/><span/></span>{compact ? <>meet<span className={twCss("text-[#ef9b7d]")}>.</span></> : <span className={twCss("brand-text")}>meet<span className={twCss("text-[#f18e75]")}>.</span></span>}</Link>;
}

export function Avatar({ image, name = "Olivia Rhye", className = "", alt = "" }: { image?: string; name?: string; className?: string; alt?: string }) {
  const [hasError, setHasError] = useState(false);
  const initials = (name || "O").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  if (hasError || !image) {
    return (
      <div className={twCss(`grid size-[27px] shrink-0 place-items-center rounded-full border border-[#404044] bg-[#343437] object-cover ${className} ${hasError || !image ? "border-[#4d3d38] bg-[linear-gradient(135deg,#3c302d,#252223)] text-[11px] font-bold text-[#f18e75] select-none" : ""}`)} title={name} aria-label={alt || name}>
        <span>{initials}</span>
      </div>
    );
  }

  return (
    <img
      className={twCss(`size-[27px] shrink-0 rounded-full border border-[#404044] bg-[#343437] object-cover ${className}`)}
      src={`https://images.unsplash.com/${image}?auto=format&fit=crop&w=96&h=96&q=80`}
      alt={alt || name}
      onError={() => setHasError(true)}
    />
  );
}

export function Toast({ children, room = false }: { children: ReactNode; room?: boolean }) {
  return <div className={twCss(room ? "room-toast" : "fixed bottom-[25px] left-1/2 z-10 flex -translate-x-1/2 items-center gap-[9px] whitespace-nowrap rounded-[9px] border border-[#4c4643] bg-[#2c2a29] px-4 py-[11px] text-[12px] text-[#eee8e2] shadow-[0_8px_28px_#0008]")}>{!room && <span className={twCss("grid size-[18px] place-items-center rounded-full bg-[#4b694f] text-[11px] text-[#d7efd8]")}>✓</span>}{children}</div>;
}


