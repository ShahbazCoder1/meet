"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Avatar, Icon, Toast } from "@/components/ui";
import { JoinMeetingCard, MeetingGrid } from "@/components/meeting-cards";
import { meetings, type Meeting } from "@/lib/meetings";

export default function Home() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState("Home");
  const [meetingCode, setMeetingCode] = useState("");
  const [notice, setNotice] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const notify = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(""), 2800); };
  const createMeeting = () => router.push(`/room-${Math.random().toString(36).slice(2, 8)}`);
  const joinMeeting = () => {
    const id = meetingCode.trim().replace(/^https?:\/\/[^/]+\//, "").replace(/^\//, "");
    if (id) router.push(`/${encodeURIComponent(id)}`);
    else notify("Enter a meeting code or link to join.");
  };
  const joinScheduled = (meeting: Meeting) => router.push(`/${meeting.id}`);

  return <main className={`app-shell ${sidebarOpen ? "" : "sidebar-collapsed"}`}>
    <aside className="sidebar">
      <Link className="brand" href="/" aria-label="Meet home"><span className="brand-mark"><span/><span/><span/><span/></span><span>meet<span className="brand-period">.</span></span></Link>
      <button className="workspace-switcher" onClick={() => notify("Workspace switcher is coming soon.")}><span className="workspace-icon">N</span><span className="workspace-copy"><b>Northstar Studio</b><small>Free workspace</small></span><span className="switch-chevron">⌄</span></button>
      <nav className="nav-group" aria-label="Workspace"><p className="nav-label">WORKSPACE</p>{[{name:"Home",icon:"home" as const},{name:"Meetings",icon:"calendar" as const}].map(item=><button key={item.name} className={`nav-item ${activeNav===item.name?"active":""}`} onClick={()=>setActiveNav(item.name)}><Icon name={item.icon}/><span>{item.name}</span>{item.name==="Meetings"&&<span className="nav-count">{meetings.length}</span>}</button>)}</nav>
      <div className="sidebar-spacer"/>
      <button className="upgrade-card" onClick={() => notify("Plan details are coming soon.")}><span className="upgrade-icon"><Icon name="spark" size={17}/></span><b>Make every meeting<br/>a little more</b><p>Upgrade for longer calls<br/>and more good things.</p><span className="upgrade-link">Explore plans <Icon name="arrow" size={14}/></span></button>
      <div className="sidebar-footer"><button className="nav-item" onClick={() => notify("Help center is coming soon.")}><Icon name="help"/><span>Help center</span></button><button className="nav-item" onClick={() => notify("Settings are coming soon.")}><Icon name="settings"/><span>Settings</span></button><div className="profile-row"><Avatar image="photo-1534528741775-53994a69daeb" className="profile-avatar"/><span className="profile-copy"><b>Olivia Rhye</b><small>olivia@northstar.co</small></span><button className="icon-ghost profile-menu" aria-label="Profile menu" onClick={()=>setMenuOpen(!menuOpen)}><Icon name="more"/></button>{menuOpen&&<div className="profile-popover"><b>Olivia Rhye</b><span>Account & preferences</span><button onClick={()=>{setMenuOpen(false);notify("You’re all set.")}}>Manage account <Icon name="arrow" size={14}/></button></div>}</div></div>
    </aside>
    <section className="main-area" id="home">
      <header className="topbar"><button className="sidebar-toggle" aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"} title={sidebarOpen ? "Close sidebar" : "Open sidebar"} onClick={() => setSidebarOpen((open) => !open)}>{sidebarOpen ? <PanelLeftClose size={18}/> : <PanelLeftOpen size={18}/>}</button><div className="breadcrumb">Workspace <span>/</span> <b>{activeNav}</b></div><div className="topbar-right"><div className="date-chip"><span className="live-dot"/> Wednesday, October 25</div><button className="icon-ghost notification-button" aria-label="Notifications" onClick={()=>notify("You’re all caught up.")}><Icon name="bell"/><i/></button><Avatar image="photo-1534528741775-53994a69daeb" className="top-avatar"/></div></header>
      <div className="content-wrap">
        <div className="welcome-row"><div><p className="eyebrow">WEDNESDAY, OCTOBER 25, 2026 <span className="eyebrow-spark">✳</span></p><h1>A little space to <em>connect.</em></h1><p className="welcome-subtitle">Good things happen when you get together.</p></div><div className="welcome-note"><span className="note-spark">✳</span><span>Make room for<br/><b>good conversations.</b></span></div></div>
        <section className="hero-card"><div className="hero-copy"><span className="hero-kicker"><span className="hero-kicker-dot"/> YOUR MEETING ROOM</span><h2>Show up as<br/><em>your best self.</em></h2><p>One click to bring everyone<br/>into the same room.</p><button className="primary-button" onClick={createMeeting}><Icon name="video" size={18}/> Start a meeting <Icon name="arrow" size={16}/></button></div><div className="hero-art" aria-hidden="true"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-sun"/><div className="art-plant plant-left"><span/><i/><b/></div><div className="art-plant plant-right"><span/><i/><b/></div><div className="art-window"><div className="window-sky"><span className="window-sun"/><i className="cloud cloud-one"/><i className="cloud cloud-two"/></div><div className="window-hill hill-back"/><div className="window-hill hill-front"/><div className="window-divider"/></div><div className="art-desk"/><div className="art-laptop"><div><span>m.</span></div></div><div className="art-mug"/><div className="art-sparkle sparkle-a">✳</div><div className="art-sparkle sparkle-b">✦</div></div><div className="hero-sticker"><span>✳</span> together<br/><small>looks good on you</small></div></section>
        <section className="quick-actions"><div className="section-heading action-heading"><div><p className="section-eyebrow">MAKE IT HAPPEN</p><h2>What’s on your mind?</h2></div><span className="heading-note">Pick a place to start <span>↘</span></span></div><div className="action-grid"><button className="action-card create-action" onClick={createMeeting}><span className="action-icon create-icon"><Icon name="video" size={20}/></span><span className="action-card-copy"><b>New meeting</b><small>Start a call right away</small></span><span className="action-arrow"><Icon name="arrow" size={17}/></span></button><JoinMeetingCard code={meetingCode} onCodeChange={setMeetingCode} onJoin={joinMeeting}/><button className="action-card schedule-action" onClick={()=>notify("Choose a time that works for everyone.")}><span className="action-icon schedule-icon"><Icon name="calendar" size={19}/></span><span className="action-card-copy"><b>Plan for later</b><small>Schedule a little together time</small></span><span className="action-arrow"><Icon name="arrow" size={17}/></span></button></div></section>
        <section className="meetings-section"><div className="section-heading meetings-heading"><div><p className="section-eyebrow">YOUR PEOPLE, YOUR PLANS</p><h2>Coming up <span className="meeting-count">{String(meetings.length).padStart(2,"0")}</span></h2></div><button className="view-all" onClick={()=>setActiveNav("Meetings")}>See all meetings <Icon name="arrow" size={15}/></button></div><MeetingGrid items={meetings} onJoin={joinScheduled} onMore={(meeting)=>notify(`Options for ${meeting.title}`)}/></section>
        <footer className="page-footer"><span>GOOD MEETINGS. GOOD PEOPLE. <span className="footer-spark">✳</span></span><span>MAKE A LITTLE ROOM FOR EACH OTHER</span></footer>
      </div>
    </section>{notice&&<Toast>{notice}</Toast>}
  </main>;
}






