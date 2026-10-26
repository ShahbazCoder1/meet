import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Mic, MicOff, Video, VideoOff, MonitorUp, MessageSquare, Users, Sparkles, AudioLines, Check, X, PanelRightClose, ChevronDown } from "lucide-react";
import { Avatar, Brand } from "@/components/ui";

export type Participant = { name: string; photo: string; speaking?: boolean };

export function ParticipantTile({ participant, index }: { participant: Participant; index: number }) {
  return <article className={`participant-tile participant-${index + 1} ${participant.speaking ? "is-speaking" : ""}`}><img src={`https://images.unsplash.com/${participant.photo}?auto=format&fit=crop&w=900&h=700&q=85`} alt={participant.name} /><span className="participant-vignette" /><span className="participant-name">{participant.name}</span><span className="participant-mic">{participant.speaking ? <Mic size={14} /> : <MicOff size={14} />}</span>{participant.speaking && <span className="speaking-indicator"><i /> Speaking</span>}</article>;
}

export function ParticipantGrid({ participants }: { participants: Participant[] }) {
  return <div className="video-grid">{participants.map((participant, index) => <ParticipantTile key={participant.name} participant={participant} index={index} />)}</div>;
}

export function ShareStage({ participants, onStop }: { participants: Participant[]; onStop: () => void }) {
  return <div className="share-stage-layout">
    <section className="shared-screen-card" aria-label="Shared screen preview">
      <div className="shared-screen-topline"><span><i/> Olivia is presenting</span><button onClick={onStop}><PanelRightClose size={15}/> Stop sharing</button></div>
      <div className="shared-screen-preview"><div className="presentation-window"><div className="presentation-window-bar"><i/><i/><i/><span>Q4 creative review</span></div><div className="presentation-content"><small>BRAND DIRECTION · 04</small><h2>Make room<br/><em>for good ideas.</em></h2><p>A little space to connect, share, and shape what comes next.</p><div className="presentation-art"><div/><span/></div></div></div></div>
      <div className="shared-screen-caption">Screen share preview <span>Only you can see this demo</span></div>
    </section>
    <aside className="share-participant-rail" aria-label="Meeting participants">{participants.map((participant, index) => <ParticipantTile key={participant.name} participant={participant} index={index}/>)}</aside>
  </div>;
}

export function MeetingControlBar({ micOn, cameraOn, chatOpen, peopleOpen, sharing, clock, roomId, onToggleMic, onToggleCamera, onToggleChat, onTogglePeople, onToggleShare }: { micOn: boolean; cameraOn: boolean; chatOpen: boolean; peopleOpen: boolean; sharing: boolean; clock: string; roomId: string; onToggleMic: () => void; onToggleCamera: () => void; onToggleChat: () => void; onTogglePeople: () => void; onToggleShare: () => void }) {
  const [openMenu, setOpenMenu] = useState<"mic" | "camera" | null>(null);
  const [micDevice, setMicDevice] = useState("Built-in microphone");
  const [cameraDevice, setCameraDevice] = useState("Built-in camera");
  const [testingMic, setTestingMic] = useState(false);
  const testMic = () => { setTestingMic(true); window.setTimeout(() => setTestingMic(false), 3000); };
  return <footer className="meeting-controls"><div className="meeting-control-meta"><span>{clock}</span><span className="control-meta-divider"/><span>{roomId}</span></div><div className="control-cluster"><div className="toolbar-device-wrap"><div className={`toolbar-device ${openMenu === "mic" ? "device-menu-open" : ""}`}><button className={`call-control ${micOn ? "control-on" : "control-off"}`} onClick={onToggleMic} aria-label={micOn ? "Mute microphone" : "Unmute microphone"}>{micOn ? <Mic/> : <MicOff/>}<span>{micOn ? "Mute" : "Unmute"}</span></button><button className="toolbar-device-chevron" aria-label="Microphone input settings" aria-expanded={openMenu === "mic"} onClick={() => setOpenMenu(openMenu === "mic" ? null : "mic")}><ChevronDown size={14}/></button></div>{openMenu === "mic"&&<div className="toolbar-device-menu"><label>Microphone input<select value={micDevice} onChange={event => setMicDevice(event.target.value)}><option>Built-in microphone</option><option>Headset microphone</option><option>External microphone</option></select></label><div className="toolbar-mic-test"><button onClick={testMic}><AudioLines size={14}/>{testingMic ? "Listening…" : "Test microphone"}</button><span className={testingMic ? "meter-active" : ""}><i/><i/><i/><i/><i/></span></div></div>}</div><div className="toolbar-device-wrap"><div className={`toolbar-device ${openMenu === "camera" ? "device-menu-open" : ""}`}><button className={`call-control ${cameraOn ? "control-on" : "control-off"}`} onClick={onToggleCamera} aria-label={cameraOn ? "Turn camera off" : "Turn camera on"}>{cameraOn ? <Video/> : <VideoOff/>}<span>{cameraOn ? "Stop video" : "Start video"}</span></button><button className="toolbar-device-chevron" aria-label="Camera input settings" aria-expanded={openMenu === "camera"} onClick={() => setOpenMenu(openMenu === "camera" ? null : "camera")}><ChevronDown size={14}/></button></div>{openMenu === "camera"&&<div className="toolbar-device-menu"><label>Camera input<select value={cameraDevice} onChange={event => setCameraDevice(event.target.value)}><option>Built-in camera</option><option>External webcam</option><option>USB camera</option></select></label></div>}</div><button className={`call-control ${sharing ? "selected-control" : ""}`} onClick={onToggleShare} aria-pressed={sharing}><MonitorUp/><span>{sharing ? "Stop share" : "Share screen"}</span></button><button className={`call-control ${chatOpen ? "selected-control" : ""}`} onClick={onToggleChat} aria-pressed={chatOpen}><MessageSquare/><span>Chat</span></button><button className={`call-control ${peopleOpen ? "selected-control" : ""}`} onClick={onTogglePeople} aria-pressed={peopleOpen}><Users/><span>People <span className="people-count">5</span></span></button><Link href="/" className="leave-control"><span className="leave-icon">×</span><span>Leave</span></Link></div><div className="meeting-controls-right">meet<span className="brand-period">.</span></div></footer>;
}

export function PeoplePanel({ participants, onClose }: { participants: Participant[]; onClose: () => void }) {
  return <aside className="people-panel"><div className="chat-panel-heading"><div><p>IN THIS ROOM</p><h2>People <span>{participants.length}</span></h2></div><button onClick={onClose} aria-label="Close people panel"><X size={15}/></button></div><div className="people-list">{participants.map(participant => <div className="people-list-item" key={participant.name}><Avatar image={participant.photo}/><span><b>{participant.name}</b><small>{participant.speaking ? "Speaking" : "In the meeting"}</small></span>{participant.speaking && <i/>}</div>)}</div></aside>;
}

export function MeetingChat({ messages, message, onMessageChange, onSend, onClose, clock }: { messages: string[]; message: string; onMessageChange: (value: string) => void; onSend: (event: React.FormEvent<HTMLFormElement>) => void; onClose: () => void; clock: string }) {
  return <aside className="chat-panel"><div className="chat-panel-heading"><div><p>THE BACKCHANNEL</p><h2>Room chat <span>{messages.length + 2}</span></h2></div><button onClick={onClose} aria-label="Close chat">×</button></div><div className="chat-messages"><div className="chat-day-divider"><span /> TODAY <span /></div><ChatMessage name="Marcus Chen" time="10:32" text="Morning everyone! Excited to get started ☀️" photo="photo-1500648767791-00dcc994a43e" /><ChatMessage name="Amara Okafor" time="10:33" text="Same here — just pulled up the latest concepts." photo="photo-1531123897727-8f129e1688ce" />{messages.map((text, index) => <div className="chat-message own-message" key={`${index}-${text}`}><div className="chat-own-avatar">O</div><div><span><b>You</b><small>{clock}</small></span><p>{text}</p></div></div>)}</div><form className="chat-compose" onSubmit={onSend}><input value={message} onChange={event => onMessageChange(event.target.value)} placeholder="Say something nice…" /><button aria-label="Send message" type="submit"><ArrowRight size={16} /></button></form></aside>;
}

function ChatMessage({ name, time, text, photo }: { name: string; time: string; text: string; photo: string }) {
  return <div className="chat-message"><Avatar image={photo} /><div><span><b>{name}</b><small>{time}</small></span><p>{text}</p></div></div>;
}

const backgrounds = [
  { id: "none", label: "Original" },
  { id: "warm", label: "Warm studio" },
  { id: "blur", label: "Soft blur" },
  { id: "green-screen", label: "Green screen" },
] as const;

export function MeetingLobby({ title, micOn, cameraOn, copied, onToggleMic, onToggleCamera, onJoin, onCopy }: { title: string; micOn: boolean; cameraOn: boolean; copied: boolean; onToggleMic: () => void; onToggleCamera: () => void; onJoin: () => void; onCopy: () => void }) {
  const [background, setBackground] = useState<string>("none");
  const [micDevice, setMicDevice] = useState("Built-in microphone");
  const [cameraDevice, setCameraDevice] = useState("Built-in camera");
  const [testingMic, setTestingMic] = useState(false);
  const [openDeviceMenu, setOpenDeviceMenu] = useState<"mic" | "camera" | "background" | null>(null);
  const testMic = () => { setTestingMic(true); window.setTimeout(() => setTestingMic(false), 3500); };

  return (
    <main className="lobby-shell">
      <header className="lobby-topbar"><Brand compact/><span className="lobby-secure"><i/> Ready to join</span></header>
      <section className="lobby-content lobby-focused">
        <div className="lobby-preview-column">
          <div className={`lobby-preview background-${background}`}>
            <div className={`self-preview ${cameraOn ? "camera-on" : "camera-off"}`}><div className="preview-background-layer"/>{cameraOn ? <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&h=900&q=85" alt="Camera preview"/> : <div className="preview-avatar">O</div>}<span className="preview-name">Olivia (you)</span><span className="preview-preview-label"><i/> LIVE PREVIEW</span></div>
          </div>
          <div className="preview-switches">
            <div className="preview-device-wrap">
              <div className="preview-device-control"><button className={`preview-toggle ${micOn ? "enabled" : "disabled"}`} onClick={onToggleMic} aria-pressed={micOn}><span className="preview-toggle-icon">{micOn ? <Mic size={17}/> : <MicOff size={17}/>}</span><span><b>Microphone</b><small>{micOn ? "On" : "Muted"}</small></span></button><button className="device-menu-trigger" aria-label="Microphone settings" aria-expanded={openDeviceMenu === "mic"} onClick={() => setOpenDeviceMenu(openDeviceMenu === "mic" ? null : "mic")}>⌄</button></div>
              {openDeviceMenu === "mic"&&<div className="device-dropdown"><label>Microphone input<select value={micDevice} onChange={event => setMicDevice(event.target.value)}><option>Built-in microphone</option><option>Headset microphone</option><option>External microphone</option></select></label><div className="mic-test-row"><button className={`mic-test-button ${testingMic ? "testing" : ""}`} onClick={testMic}><AudioLines size={15}/>{testingMic ? "Listening…" : "Test microphone"}</button><div className={`mic-test-meter ${testingMic ? "active" : ""}`} aria-label={testingMic ? "Microphone input detected" : "Microphone test meter"}><i/><i/><i/><i/><i/><i/><i/></div></div></div>}
            </div>
            <div className="preview-device-wrap">
              <div className="preview-device-control"><button className={`preview-toggle ${cameraOn ? "enabled" : "disabled"}`} onClick={onToggleCamera} aria-pressed={cameraOn}><span className="preview-toggle-icon">{cameraOn ? <Video size={17}/> : <VideoOff size={17}/>}</span><span><b>Camera</b><small>{cameraOn ? "On" : "Off"}</small></span></button><button className="device-menu-trigger" aria-label="Camera settings" aria-expanded={openDeviceMenu === "camera"} onClick={() => setOpenDeviceMenu(openDeviceMenu === "camera" ? null : "camera")}>⌄</button></div>
              {openDeviceMenu === "camera"&&<div className="device-dropdown"><label>Camera input<select value={cameraDevice} onChange={event => setCameraDevice(event.target.value)}><option>Built-in camera</option><option>External webcam</option><option>USB camera</option></select></label></div>}
            </div>
            <div className="preview-device-wrap background-device-wrap">
              <div className="preview-device-control"><button className={`preview-toggle background-toggle ${openDeviceMenu === "background" ? "enabled" : ""}`} onClick={() => setOpenDeviceMenu(openDeviceMenu === "background" ? null : "background")} aria-expanded={openDeviceMenu === "background"}><span className="preview-toggle-icon"><Sparkles size={17}/></span><span><b>Video background</b><small>{backgrounds.find(option => option.id === background)?.label}</small></span></button><button className="device-menu-trigger" aria-label="Video background options" aria-expanded={openDeviceMenu === "background"} onClick={() => setOpenDeviceMenu(openDeviceMenu === "background" ? null : "background")}>⌄</button></div>
              {openDeviceMenu === "background"&&<div className="device-dropdown background-dropdown"><div className="background-options">{backgrounds.map(option => <button type="button" key={option.id} className={`background-option ${background === option.id ? "selected" : ""}`} onClick={() => { setBackground(option.id); setOpenDeviceMenu(null); }} aria-pressed={background === option.id}><span className={`background-swatch swatch-${option.id}`}>{background === option.id&&<Check size={13}/>}</span><small>{option.label}</small></button>)}</div></div>}
            </div>
          </div>
        </div>
        <div className="lobby-details lobby-setup"><p className="lobby-eyebrow"><span/> BEFORE YOU JOIN</p><h1>Get your setup<br/>just <em>right.</em></h1><p className="lobby-subtitle">{title}</p><label className="name-label" htmlFor="display-name">Your name</label><input id="display-name" className="name-input" defaultValue="Olivia Rhye"/><button className="join-room-cta" onClick={onJoin}>Join meeting <ArrowRight size={17}/></button><button className="lobby-copy" onClick={onCopy}>{copied ? "Meeting link copied" : "Copy meeting link"}</button></div>
      </section>
    </main>
  );
}
