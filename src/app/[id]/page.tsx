import { Suspense } from "react";
import { getMeetingTitle } from "@/lib/meetings";
import MeetingRoomClient from "./meeting-room-client";

export default function MeetingRoomPage({ params }: PageProps<"/[id]">) {
  return <Suspense fallback={<main className="lobby-shell"><div className="lobby-content"><p className="lobby-subtitle">Preparing your meeting room…</p></div></main>}><Room params={params}/></Suspense>;
}

async function Room({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MeetingRoomClient id={id} title={getMeetingTitle(id)}/>;
}
