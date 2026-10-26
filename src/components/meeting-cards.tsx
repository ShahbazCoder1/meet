import { twCss } from "@/lib/tailwind-classes";
import Link from "next/link";
import { Avatar, Icon } from "@/components/ui";
import type { Meeting } from "@/lib/meetings";

export function MeetingCard({ meeting, index, onJoin, onMore }: { meeting: Meeting; index: number; onJoin: () => void; onMore: () => void }) {
  const tone = meeting.tone === "lavender" ? "after:bg-[#8583a530]" : meeting.tone === "mint" ? "after:bg-[#7e9f8530]" : "";
  return <article className={twCss(`relative isolate min-h-[160px] overflow-hidden rounded-[9px] border border-[#383739] bg-[#232224] px-[13px] pt-[13px] pb-[11px] after:absolute after:-right-[57px] after:top-[39px] after:size-[104px] after:rounded-full after:bg-[#b7857430] after:content-[''] ${tone}`)}><div className={twCss("relative z-[1] flex items-center justify-between")}><span className={twCss("flex items-center gap-[5px] text-[9px] text-[#ccc4bd] [&_svg]:text-[#9b9189]")}><Icon name="clock" size={14}/>{meeting.time}<i className={twCss("mx-[2px] size-[3px] rounded-full bg-[#847d77]")}/>{meeting.duration}</span><button className={twCss("grid place-items-center border-0 bg-transparent p-[2px] text-[#918e8c]")} aria-label={`More options for ${meeting.title}`} onClick={onMore}><Icon name="more" size={19}/></button></div><p className={twCss("mt-[13px] mb-[5px] text-[8px] font-bold tracking-[1.05px] text-[#d09a80]")}>{meeting.day}</p><h3 className={twCss("relative z-[1] overflow-hidden text-ellipsis whitespace-nowrap text-[12px] font-semibold leading-[1.35] tracking-[-.1px] text-[#eee9e4]")}>{meeting.title}</h3><p className={twCss("mt-[5px] mb-3 text-[9px] text-[#9d9792]")}>{meeting.team}</p><div className={twCss("relative z-[1] mt-[10px] flex items-center justify-between")}><div className={twCss("flex items-center pl-[2px] [&>img]:-ml-1 [&>img]:size-[23px] [&>img]:border-2 [&>img]:border-[#242325] [&>img:first-child]:ml-0")}>{meeting.faces.map((face)=><Avatar key={face} image={face}/>)}<span className={twCss("-ml-1 grid size-[23px] place-items-center rounded-full border-2 border-[#242325] bg-[#424043] text-[8px] text-[#ddd5ce]")}>{meeting.count}</span></div><button className={twCss("flex h-[26px] items-center gap-[7px] rounded-[5px] border border-[#51413b] bg-[#342b28] px-[9px] text-[9px] text-[#e9a083] hover:bg-[#48352f]")} onClick={onJoin}>Join <Icon name="arrow" size={14}/></button></div><span className={twCss("pointer-events-none absolute right-3 bottom-[11px] text-[28px] italic text-white/[.05] [font-family:Georgia,serif]")}>0{index + 1}</span></article>;
}

export function MeetingGrid({ items, onJoin, onMore }: { items: Meeting[]; onJoin: (meeting: Meeting) => void; onMore: (meeting: Meeting) => void }) {
  return <div className={twCss("mt-[13px] grid grid-cols-3 gap-[10px] max-[1100px]:gap-2 max-[760px]:grid-cols-1")}>{items.map((meeting, index) => <MeetingCard key={meeting.id} meeting={meeting} index={index} onJoin={() => onJoin(meeting)} onMore={() => onMore(meeting)}/>)}</div>;
}

export function JoinMeetingCard({ code, onCodeChange, onJoin }: { code: string; onCodeChange: (value: string) => void; onJoin: () => void }) {
  return <div className={twCss("action-card join-action")}><span className={twCss("action-icon join-icon")}><Icon name="link" size={19}/></span><span className={twCss("action-card-copy")}><b>Join a meeting</b><small>Have a code? You’re invited.</small></span><div className={twCss("join-input-wrap")}><input aria-label="Meeting code or link" placeholder="Enter a code or link" value={code} onChange={(event) => onCodeChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") onJoin(); }}/><button onClick={onJoin} aria-label="Join meeting"><Icon name="arrow" size={17}/></button></div></div>;
}

export function JoinMeetingLink({ href }: { href: string }) {
  return <Link href={href} className={twCss("flex h-[26px] items-center gap-[7px] rounded-[5px] border border-[#51413b] bg-[#342b28] px-[9px] text-[9px] text-[#e9a083] no-underline hover:bg-[#48352f]")}>Join <Icon name="arrow" size={14}/></Link>;
}
