"use client";

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

  return <main className={`app-shell ${sidebarOpen ? "" : "sidebar-collapsed"}`}>
    <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen((prev) => !prev)} onNotify={notify} />
    <section className="main-area" id="home">
      <header className="topbar">
        <div className="topbar-left"><button type="button" className="mobile-sidebar-toggle" aria-label="Expand sidebar" title="Expand sidebar" onClick={() => setSidebarOpen(true)}><PanelLeft size={18}/></button></div>
        <div className="topbar-right"><DateCalendar/></div>
      </header>
      <div className="content-wrap">
        <section className="quick-actions meeting-first-actions" aria-labelledby="meeting-actions-title">
          <div className="section-heading action-heading"><div><p className="section-eyebrow">MAKE IT HAPPEN</p><h2 id="meeting-actions-title">Meet your way</h2></div><span className="heading-note">Start something good <span>↘</span></span></div>
          <div className="action-grid"><button className="action-card create-action" onClick={createMeeting}><span className="action-icon create-icon"><Icon name="video" size={20}/></span><span className="action-card-copy"><b>New meeting</b><small>Start a call right away</small></span><span className="action-arrow"><Icon name="arrow" size={17}/></span></button><JoinMeetingCard code={meetingCode} onCodeChange={setMeetingCode} onJoin={joinMeeting}/><div className="action-card schedule-action schedule-disabled" aria-disabled="true"><span className="action-icon schedule-icon"><Icon name="calendar" size={19}/></span><span className="action-card-copy"><b>Plan for later</b><small>Schedule a meeting</small></span><span className="coming-soon">Coming soon</span></div></div>
        </section>
        <div className="welcome-row"><div><p className="eyebrow">WEDNESDAY, OCTOBER 25, 2026 <span className="eyebrow-spark">✳</span></p><h1>A little space to <em>connect.</em></h1><p className="welcome-subtitle">Good things happen when you get together.</p></div><div className="welcome-note"><span className="note-spark">✳</span><span>Make room for<br/><b>good conversations.</b></span></div></div>
        <section className="hero-card"><div className="hero-copy"><span className="hero-kicker"><span className="hero-kicker-dot"/> YOUR MEETING ROOM</span><h2>Show up as<br/><em>your best self.</em></h2><p>One click to bring everyone<br/>into the same room.</p><button className="primary-button" onClick={createMeeting}><Icon name="video" size={18}/> Start a meeting <Icon name="arrow" size={16}/></button></div><div className="hero-art" aria-hidden="true"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-sun"/><div className="art-plant plant-left"><span/><i/><b/></div><div className="art-plant plant-right"><span/><i/><b/></div><div className="art-window"><div className="window-sky"><span className="window-sun"/><i className="cloud cloud-one"/><i className="cloud cloud-two"/></div><div className="window-hill hill-back"/><div className="window-hill hill-front"/><div className="window-divider"/></div><div className="art-desk"/><div className="art-laptop"><div><span>m.</span></div></div><div className="art-mug"/><div className="art-sparkle sparkle-a">✳</div><div className="art-sparkle sparkle-b">✦</div></div><div className="hero-sticker"><span>✳</span> together<br/><small>looks good on you</small></div></section>
        <footer className="page-footer"><span>GOOD MEETINGS. GOOD PEOPLE. <span className="footer-spark">✳</span></span><span>MAKE A LITTLE ROOM FOR EACH OTHER</span></footer>
      </div>
    </section>{notice&&<Toast>{notice}</Toast>}
  </main>;
}




