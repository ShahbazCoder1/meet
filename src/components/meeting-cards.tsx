import Link from "next/link";
import { Avatar, Icon } from "@/components/ui";
import type { Meeting } from "@/lib/meetings";

export function MeetingCard({ meeting, index, onJoin, onMore }: { meeting: Meeting; index: number; onJoin: () => void; onMore: () => void }) {
  return <article className={`meeting-card ${meeting.tone}`}><div className="meeting-card-top"><span className="meeting-time"><Icon name="clock" size={14}/>{meeting.time}<i/>{meeting.duration}</span><button className="icon-ghost more-button" aria-label={`More options for ${meeting.title}`} onClick={onMore}><Icon name="more" size={19}/></button></div><p className="meeting-day">{meeting.day}</p><h3>{meeting.title}</h3><p className="meeting-team">{meeting.team}</p><div className="meeting-card-bottom"><div className="attendee-stack">{meeting.faces.map((face)=><Avatar key={face} image={face}/>)}<span className="attendee-extra">{meeting.count}</span></div><button className="join-card-button" onClick={onJoin}>Join <Icon name="arrow" size={14}/></button></div><span className="card-index">0{index + 1}</span></article>;
}

export function MeetingGrid({ items, onJoin, onMore }: { items: Meeting[]; onJoin: (meeting: Meeting) => void; onMore: (meeting: Meeting) => void }) {
  return <div className="meeting-grid">{items.map((meeting, index) => <MeetingCard key={meeting.id} meeting={meeting} index={index} onJoin={() => onJoin(meeting)} onMore={() => onMore(meeting)}/>)}</div>;
}

export function JoinMeetingCard({ code, onCodeChange, onJoin }: { code: string; onCodeChange: (value: string) => void; onJoin: () => void }) {
  return <div className="action-card join-action"><span className="action-icon join-icon"><Icon name="link" size={19}/></span><span className="action-card-copy"><b>Join a meeting</b><small>Have a code? You’re invited.</small></span><div className="join-input-wrap"><input aria-label="Meeting code or link" placeholder="Enter a code or link" value={code} onChange={(event) => onCodeChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") onJoin(); }}/><button onClick={onJoin} aria-label="Join meeting"><Icon name="arrow" size={17}/></button></div></div>;
}

export function JoinMeetingLink({ href }: { href: string }) {
  return <Link href={href} className="join-card-button">Join <Icon name="arrow" size={14}/></Link>;
}
