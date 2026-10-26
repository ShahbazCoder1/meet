"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Brand, Toast } from "@/components/ui";
import { MeetingChat, MeetingControlBar, MeetingLobby, ParticipantGrid, PeoplePanel, ShareStage, type Participant } from "@/components/meeting-room";

const participants: Participant[] = [
  { name: "Marcus Chen", photo: "photo-1500648767791-00dcc994a43e", speaking: true },
  { name: "Amara Okafor", photo: "photo-1531123897727-8f129e1688ce" },
  { name: "Sofia Laurent", photo: "photo-1534528741775-53994a69daeb" },
  { name: "Daniel Kim", photo: "photo-1506794778202-cad84cf45f1d" },
  { name: "Olivia Rhye", photo: "photo-1534528741775-53994a69daeb" },
];

export default function MeetingRoomClient({ id, title }: { id: string; title: string }) {
  const [joined, setJoined] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => { const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000); return () => window.clearInterval(timer); }, []);
  const clock = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  const flash = (text: string) => { setNotice(text); window.setTimeout(() => setNotice(""), 2200); };
  const copyLink = async () => { try { await navigator.clipboard.writeText(window.location.href); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { flash("Your meeting link is ready to share."); } };
  const sendMessage = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); if (message.trim()) { setMessages((items) => [...items, message.trim()]); setMessage(""); } };
  if (!joined) return <MeetingLobby title={title} micOn={micOn} cameraOn={cameraOn} copied={copied} onToggleMic={() => setMicOn((value) => !value)} onToggleCamera={() => setCameraOn((value) => !value)} onJoin={() => setJoined(true)} onCopy={copyLink}/>;
  return <main className={`meeting-shell ${sharing ? "is-sharing" : ""}`}><header className="meeting-topbar"><Brand compact/><div className="room-heading"><span className="meeting-elapsed"><i/> {clock}</span></div><div className="room-header-actions"><span className="room-encrypted">✳ &nbsp;End-to-end encrypted</span><button className="copy-room-link" onClick={copyLink}>{copied ? "Copied!" : "Copy link"}<ArrowRight size={14} strokeWidth={1.7}/></button></div></header><section className={`meeting-stage ${chatOpen || peopleOpen ? "chat-visible" : ""} ${sharing ? "sharing-stage" : ""}`}>{sharing ? <ShareStage participants={participants} onStop={() => setSharing(false)}/> : <ParticipantGrid participants={participants}/>}</section>{chatOpen&&<MeetingChat messages={messages} message={message} onMessageChange={setMessage} onSend={sendMessage} onClose={() => setChatOpen(false)} clock={clock}/ >}{peopleOpen&&<PeoplePanel participants={participants} onClose={() => setPeopleOpen(false)}/>}<MeetingControlBar micOn={micOn} cameraOn={cameraOn} chatOpen={chatOpen} peopleOpen={peopleOpen} sharing={sharing} clock={clock} roomId={id} onToggleMic={() => setMicOn((value) => !value)} onToggleCamera={() => setCameraOn((value) => !value)} onToggleChat={() => { setChatOpen(value => !value); setPeopleOpen(false); }} onTogglePeople={() => { setPeopleOpen(value => !value); setChatOpen(false); }} onToggleShare={() => setSharing(value => !value)}/>{notice&&<Toast room>{notice}</Toast>}</main>;
}




