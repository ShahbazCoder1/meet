"use client";

import { twCss } from "@/lib/tailwind-classes";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { DateCalendar } from "@/components/date-calendar";
import { PanelLeft } from "lucide-react";
import { Icon, Toast } from "@/components/ui";
import { JoinMeetingCard } from "@/components/meeting-cards";


export default function Home() {
  const router = useRouter();
  const [meetingCode, setMeetingCode] = useState("");
  const [notice, setNotice] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const notify = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(""), 2800); };
  const createMeeting = () => router.push(`/room-${Math.random().toString(36).slice(2, 8)}`);
  const joinMeeting = () => {
    const id = meetingCode.trim().replace(/^https?:\/\/[^/]+\//, "").replace(/^\//, "");
    if (id) router.push(`/${encodeURIComponent(id)}`);
    else notify("Enter a meeting code or link to join.");
  };

  return <main className={twCss(`app-shell ${sidebarOpen ? "" : "sidebar-collapsed"}`)}>
    <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen((prev) => !prev)} onNotify={notify} />
    <section className={twCss("main-area")} id="home">
      <header className={twCss("topbar")}>
        <div className={twCss("topbar-left")}><button type="button" className={twCss("mobile-sidebar-toggle")} aria-label="Expand sidebar" title="Expand sidebar" onClick={() => setSidebarOpen(true)}><PanelLeft size={18}/></button></div>
        <div className={twCss("topbar-right")}><DateCalendar/></div>
      </header>
      <div className={twCss("content-wrap")}>
        <section className={twCss("meeting-first-actions")} aria-labelledby="meeting-actions-title">
          <div className={twCss("section-heading action-heading")}><div><p className={twCss("section-eyebrow")}>MAKE IT HAPPEN</p><h2 id="meeting-actions-title">Meet your way</h2></div><span className={twCss("heading-note")}>Start something good <span>↘</span></span></div>
          <div className={twCss("action-grid")}><button className={twCss("action-card create-action")} onClick={createMeeting}><span className={twCss("action-icon create-icon")}><Icon name="video" size={20}/></span><span className={twCss("action-card-copy")}><b>New meeting</b><small>Start a call right away</small></span><span className={twCss("action-arrow")}><Icon name="arrow" size={17}/></span></button><JoinMeetingCard code={meetingCode} onCodeChange={setMeetingCode} onJoin={joinMeeting}/><div className={twCss("action-card schedule-action schedule-disabled")} aria-disabled="true"><span className={twCss("action-icon schedule-icon")}><Icon name="calendar" size={19}/></span><span className={twCss("action-card-copy")}><b>Plan for later</b><small>Schedule a meeting</small></span><span className={twCss("coming-soon")}>Coming soon</span></div></div>
        </section>
        <div className={twCss("welcome-row")}><div><p className={twCss("eyebrow")}>WEDNESDAY, OCTOBER 25, 2026 <span className={twCss("eyebrow-spark")}>✳</span></p><h1>A little space to <em>connect.</em></h1><p className={twCss("welcome-subtitle")}>Good things happen when you get together.</p></div><div className={twCss("welcome-note")}><span className={twCss("note-spark")}>✳</span><span>Make room for<br/><b>good conversations.</b></span></div></div>
        <section className={twCss("hero-card")}><div className={twCss("hero-copy")}><span className={twCss("hero-kicker")}><span className={twCss("hero-kicker-dot")}/> YOUR MEETING ROOM</span><h2>Show up as<br/><em>your best self.</em></h2><p>One click to bring everyone<br/>into the same room.</p><button className={twCss("primary-button")} onClick={createMeeting}><Icon name="video" size={18}/> Start a meeting <Icon name="arrow" size={16}/></button></div><div className={twCss("hero-art")} aria-hidden="true"><div className={twCss("art-orbit orbit-one")}/><div className={twCss("art-orbit orbit-two")}/><div className={twCss("art-sun")}/><div className={twCss("art-plant plant-left after:content-['']")}><span/><i/><b/></div><div className={twCss("art-plant plant-right after:content-['']")}><span/><i/><b/></div><div className={twCss("art-window")}><div className={twCss("window-sky")}><span className={twCss("window-sun")}/><i className={twCss("cloud cloud-one")}/><i className={twCss("cloud cloud-two")}/></div><div className={twCss("window-hill hill-back")}/><div className={twCss("window-hill hill-front")}/><div className={twCss("window-divider")}/></div><div className={twCss("art-desk")}/><div className={twCss("art-laptop")}><div><span>m.</span></div></div><div className={twCss("art-mug after:content-['']")}/><div className={twCss("art-sparkle sparkle-a")}>✳</div><div className={twCss("art-sparkle sparkle-b")}>✦</div></div><div className={twCss("hero-sticker")}><span>✳</span> together<br/><small>looks good on you</small></div></section>
        <footer className={twCss("page-footer")}><span>GOOD MEETINGS. GOOD PEOPLE. <span className={twCss("footer-spark")}>✳</span></span><span>MAKE A LITTLE ROOM FOR EACH OTHER</span></footer>
      </div>
    </section>{notice&&<Toast>{notice}</Toast>}
  </main>;
}




