"use client";

import { twCss } from "@/lib/tailwind-classes";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Video, PanelLeftClose, PanelLeft, MoreHorizontal, LogOut } from "lucide-react";
import { Avatar } from "@/components/ui";

export interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  onNotify?: (message: string) => void;
}

export function Sidebar({ open, onToggle, onNotify }: SidebarProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const notify = (msg: string) => {
    if (onNotify) onNotify(msg);
  };

  const handleSignOut = () => {
    setMenuOpen(false);
    notify("Signed out successfully.");
    router.push("/login");
  };

  return (
    <>
      {open && (
        <div
          className={twCss("sidebar-backdrop")}
          onClick={onToggle}
          aria-label="Close sidebar"
          role="button"
          tabIndex={0}
        />
      )}
      <aside className={twCss(`sidebar ${open ? "open" : "collapsed"}`)}>
        <div className={twCss("sidebar-header")}>
          {open ? (
            <>
              <Link className={twCss("brand")} href="/" aria-label="Meet home" title="Meet">
                <span className={twCss("brand-mark")} aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                </span>
                <span className={twCss("brand-text")}>meet<span className={twCss("brand-period")}>.</span></span>
              </Link>
              <button
                type="button"
                className={twCss("sidebar-collapse-btn")}
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
                onClick={onToggle}
              >
                <PanelLeftClose size={16} />
              </button>
            </>
          ) : (
            <button
              type="button"
              className={twCss("brand-collapsed-toggle")}
              aria-label="Expand sidebar"
              title="Expand sidebar"
              onClick={onToggle}
            >
              <span className={twCss("brand-mark")} aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </span>
              <span className={twCss("brand-expand-icon")} aria-hidden="true">
                <PanelLeft size={20} />
              </span>
            </button>
          )}
        </div>

        <nav className={twCss("sidebar-nav")} aria-label="Main Navigation">
          <button
            type="button"
            className={twCss("nav-item active")}
            onClick={() => router.push("/")}
            title="Home"
          >
            <Video size={20} aria-hidden="true" />
            <span>Home</span>
          </button>
        </nav>

        <div className={twCss("sidebar-spacer")} />

        <div className={twCss("sidebar-footer")}>
          <button
            type="button"
            className={twCss("profile-button")}
            onClick={() => setMenuOpen((prev) => !prev)}
            title="Olivia Rhye - Account"
            aria-expanded={menuOpen}
          >
            <Avatar
              image="photo-1534528741775-53994a69daeb"
              name="Olivia Rhye"
              className={twCss("profile-avatar")}
            />
            <span className={twCss("profile-copy")}>
              <b>Olivia Rhye</b>
              <small>olivia@northstar.co</small>
            </span>
            <span className={twCss("profile-more")} aria-hidden="true">
              <MoreHorizontal size={16} />
            </span>
          </button>

          {menuOpen && (
            <div className={twCss("profile-popover")} role="dialog" aria-label="Account details">
              <b>Olivia Rhye</b>
              <span>olivia@northstar.co</span>
              <button
                type="button"
                className={twCss("signout-button")}
                onClick={handleSignOut}
              >
                <LogOut size={14} />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
