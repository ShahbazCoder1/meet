"use client";

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
  return <Component aria-hidden="true" size={size} strokeWidth={1.7} className={className}/>;
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link className={compact ? "room-brand" : "brand"} href="/" aria-label="Meet home"><span className={compact ? "room-brand-mark" : "brand-mark"} aria-hidden="true"><span/><span/><span/><span/></span>{compact ? <>meet<span>.</span></> : <span className="brand-text">meet<span className="brand-period">.</span></span>}</Link>;
}

export function Avatar({ image, name = "Olivia Rhye", className = "", alt = "" }: { image?: string; name?: string; className?: string; alt?: string }) {
  const [hasError, setHasError] = useState(false);
  const initials = (name || "O").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  if (hasError || !image) {
    return (
      <div className={`avatar avatar-fallback ${className}`} title={name} aria-label={alt || name}>
        <span>{initials}</span>
      </div>
    );
  }

  return (
    <img
      className={`avatar ${className}`}
      src={`https://images.unsplash.com/${image}?auto=format&fit=crop&w=96&h=96&q=80`}
      alt={alt || name}
      onError={() => setHasError(true)}
    />
  );
}

export function Toast({ children, room = false }: { children: ReactNode; room?: boolean }) {
  return <div className={room ? "room-toast" : "toast"}>{!room && <span className="toast-check">✓</span>}{children}</div>;
}


