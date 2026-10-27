"use client";

import { twCss } from "@/lib/tailwind-classes";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  MessageSquare,
  Users,
  Sparkles,
  AudioLines,
  Check,
  X,
  PanelRightClose,
  ChevronDown,
  Lock,
} from "lucide-react";
import { Avatar, Brand } from "@/components/ui";
import {
  getAvailableDevices,
  createAudioLevelMeter,
  type AvailableDevices,
} from "@/lib/media";

export interface Participant {
  peerId?: string;
  name: string;
  photo?: string;
  stream?: MediaStream | null;
  speaking?: boolean;
  micOn?: boolean;
  cameraOn?: boolean;
  isLocal?: boolean;
}

export function ParticipantTile({
  participant,
  index = 0,
  inRail = false,
}: {
  participant: Participant;
  index?: number;
  inRail?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const initial = (participant.name || "G")[0].toUpperCase();
  const hasVideo = Boolean(
    participant.stream?.getVideoTracks().some((track) => track.readyState === "live") &&
    participant.cameraOn === true
  );

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
      videoRef.current.play().catch(() => {});
    }
  }, [participant.stream, hasVideo]);

  useEffect(() => {
    if (audioRef.current && participant.stream && !participant.isLocal) {
      audioRef.current.srcObject = participant.stream;
      audioRef.current.play().catch(() => {});
    }
  }, [participant.stream, participant.isLocal]);

  return (
    <article
      className={`participant-tile relative min-w-0 min-h-0 overflow-hidden rounded-xl border border-[#3b3939] bg-[#242426] shadow-md transition-all duration-200 group ${
        participant.speaking ? "ring-2 ring-[#ef9b7d] border-transparent" : ""
      } ${
        inRail
          ? "w-[150px] md:w-full aspect-video flex-shrink-0"
          : "w-full aspect-video"
      }`}
    >
      {/* Dedicated audio element for remote participants so audio plays even when camera is off */}
      {!participant.isLocal && participant.stream && (
        <audio ref={audioRef} autoPlay playsInline />
      )}

      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover absolute inset-0 block rounded-[inherit] ${
            participant.isLocal ? "scale-x-[-1]" : ""
          }`}
        />
      ) : participant.photo ? (
        <img
          src={`https://images.unsplash.com/${participant.photo}?auto=format&fit=crop&w=900&h=700&q=85`}
          alt={participant.name}
          className="w-full h-full object-cover object-[center_34%] absolute inset-0 block rounded-[inherit]"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(ellipse_at_50%_45%,#403638,#242326_72%)]">
          <div className="size-14 md:size-16 rounded-full flex items-center justify-center bg-[#ca987f] text-[#2e2522] font-serif text-2xl font-semibold shadow-inner select-none">
            {initial}
          </div>
        </div>
      )}

      {/* Subtle vignette for name readability */}
      <span className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/80 via-transparent to-black/20" />

      {/* Participant name pill */}
      <span className="absolute left-2.5 bottom-2.5 z-10 max-w-[calc(100%-48px)] truncate rounded-md bg-[#171719]/85 backdrop-blur-sm px-2 py-1 text-[11px] font-medium text-[#eee8e2] border border-white/5 select-none shadow-sm">
        {participant.name} {participant.isLocal && "(You)"}
      </span>

      {/* Mic status pill */}
      <span className="absolute right-2.5 bottom-2.5 z-10 size-6 rounded-md bg-[#171719]/85 backdrop-blur-sm flex items-center justify-center text-[#dfd8d2] border border-white/5 shadow-sm">
        {participant.micOn === true ? (
          <Mic size={13} />
        ) : (
          <MicOff size={13} className="text-[#f0a087]" />
        )}
      </span>

      {/* Speaking badge */}
      {participant.speaking && (
        <span className="absolute left-2.5 top-2.5 z-10 flex items-center gap-1.5 rounded-full bg-[#171719]/90 backdrop-blur-sm px-2 py-0.5 text-[10px] text-[#90bc92] border border-[#90bc92]/30 shadow-sm">
          <i className="size-1.5 rounded-full bg-[#90bc92] animate-pulse" /> Speaking
        </span>
      )}
    </article>
  );
}

export function ParticipantGrid({
  participants,
}: {
  participants: Participant[];
}) {
  const count = participants.length;

  let gridCols = "grid-cols-1 max-w-[840px]";
  if (count === 2) {
    gridCols = "grid-cols-1 md:grid-cols-2 max-w-[1100px]";
  } else if (count === 3 || count === 4) {
    gridCols = "grid-cols-2 max-w-[1150px]";
  } else if (count >= 5) {
    gridCols = "grid-cols-2 md:grid-cols-3 max-w-[1300px]";
  }

  return (
    <div className="w-full h-full flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className={`grid ${gridCols} w-full gap-3 sm:gap-4 items-center justify-center mx-auto`}>
        {participants.map((participant, index) => (
          <ParticipantTile
            key={participant.peerId || `${participant.name}-${index}`}
            participant={participant}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}

export function ShareStage({
  participants,
  screenStream,
  presenterName = "Someone",
  isLocalSharing = false,
  onStop,
}: {
  participants: Participant[];
  screenStream?: MediaStream | null;
  presenterName?: string;
  isLocalSharing?: boolean;
  onStop: () => void;
}) {
  const screenVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
      screenVideoRef.current.play().catch(() => {});
    }
  }, [screenStream]);

  return (
    <div className="w-full h-full max-w-[1600px] mx-auto flex flex-col md:flex-row items-center md:items-stretch justify-center gap-3 md:gap-4 p-2 md:p-3 min-h-0 overflow-hidden">
      {/* Main presentation card */}
      <section
        className="flex-1 min-w-0 min-h-0 h-full flex flex-col justify-center gap-2 max-w-full overflow-hidden"
        aria-label="Shared screen preview"
      >
        {/* Topline header */}
        <div className="flex items-center justify-between px-2.5 py-1 text-xs text-[#d5d0cb] flex-shrink-0">
          <span className="flex items-center gap-2 font-medium">
            <i className="size-2 rounded-full bg-[#91ba98] shadow-[0_0_8px_#91ba98]" />
            {presenterName} is presenting
          </span>
          {isLocalSharing && (
            <button
              onClick={onStop}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#2d2c2e] hover:bg-[#3d3a3c] text-[#eee] border border-[#484649] text-xs font-medium cursor-pointer transition-colors shadow-sm"
            >
              <PanelRightClose size={14} className="text-[#f18e75]" /> Stop sharing
            </button>
          )}
        </div>

        {/* 16:9 Screen container */}
        <div className="relative flex-1 min-h-0 w-full flex items-center justify-center">
          <div className="relative w-full max-w-full aspect-video max-h-full rounded-xl overflow-hidden bg-[#111113] border border-[#383638] shadow-2xl flex items-center justify-center">
            {screenStream ? (
              <video
                ref={screenVideoRef}
                autoPlay
                playsInline
                muted={isLocalSharing}
                className="w-full h-full object-contain aspect-video block"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-center p-6 bg-[#18181b]">
                <MonitorUp size={44} className="text-[#f18e75] animate-pulse" />
                <p className="text-sm font-medium text-[#e4dfda]">Connecting to screen share...</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom caption */}
        <div className="flex items-center justify-between px-2.5 py-0.5 text-[11px] text-[#a29b95] flex-shrink-0">
          <span>Screen share active</span>
          <span className="text-[#77716d]">HD 1080p Presentation</span>
        </div>
      </section>

      {/* Participant rail (preserves 16:9 for every tile, never stretched!) */}
      <aside
        className="w-full md:w-[220px] lg:w-[260px] flex-shrink-0 flex flex-row md:flex-col gap-2.5 overflow-x-auto md:overflow-y-auto max-h-[140px] md:max-h-full py-1 pr-1"
        aria-label="Meeting participants"
      >
        {participants.map((participant, index) => (
          <ParticipantTile
            key={participant.peerId || `${participant.name}-${index}`}
            participant={participant}
            index={index}
            inRail={true}
          />
        ))}
      </aside>
    </div>
  );
}

export function MeetingControlBar({
  micOn,
  cameraOn,
  chatOpen,
  peopleOpen,
  sharing,
  sharingElsewhere,
  presenterName,
  clock,
  roomId,
  devices,
  selectedAudioDevice,
  selectedVideoDevice,
  peopleCount = 1,
  onSelectAudioDevice,
  onSelectVideoDevice,
  onToggleMic,
  onToggleCamera,
  onToggleChat,
  onTogglePeople,
  onToggleShare,
  onLeave,
}: {
  micOn: boolean;
  cameraOn: boolean;
  chatOpen: boolean;
  peopleOpen: boolean;
  sharing: boolean;
  sharingElsewhere?: boolean;
  presenterName?: string;
  clock: string;
  roomId: string;
  devices?: AvailableDevices;
  selectedAudioDevice?: string;
  selectedVideoDevice?: string;
  peopleCount?: number;
  onSelectAudioDevice?: (id: string) => void;
  onSelectVideoDevice?: (id: string) => void;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleChat: () => void;
  onTogglePeople: () => void;
  onToggleShare: () => void;
  onLeave: () => void;
}) {
  const [openMenu, setOpenMenu] = useState<"mic" | "camera" | null>(null);
  const [testingMic, setTestingMic] = useState(false);

  const testMic = () => {
    setTestingMic(true);
    window.setTimeout(() => setTestingMic(false), 3000);
  };

  return (
    <footer className={twCss("meeting-controls")}>
      <div className={twCss("meeting-control-meta")}>
        <span>{clock}</span>
        <span className={twCss("control-meta-divider")} />
        <span>{roomId}</span>
      </div>
      <div className={twCss("control-cluster")}>
        <div className={twCss("toolbar-device-wrap")}>
          <div
            className={twCss(`toolbar-device ${
              openMenu === "mic" ? "device-menu-open" : ""
            }`)}
          >
            <button
              className={twCss(`call-control ${micOn ? "control-on" : "control-off"}`)}
              onClick={onToggleMic}
              aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
            >
              {micOn ? <Mic /> : <MicOff />}
              <span>{micOn ? "Mute" : "Unmute"}</span>
            </button>
            <button
              className={twCss("toolbar-device-chevron")}
              aria-label="Microphone input settings"
              aria-expanded={openMenu === "mic"}
              onClick={() => setOpenMenu(openMenu === "mic" ? null : "mic")}
            >
              <ChevronDown size={14} />
            </button>
          </div>
          {openMenu === "mic" && (
            <div className={twCss("toolbar-device-menu")}>
              <label>
                Microphone input
                <select
                  value={selectedAudioDevice || ""}
                  onChange={(e) => onSelectAudioDevice?.(e.target.value)}
                >
                  {devices?.audioInputs && devices.audioInputs.length > 0 ? (
                    devices.audioInputs.map((d, i) => (
                      <option key={d.deviceId || i} value={d.deviceId}>
                        {d.label || `Microphone ${i + 1}`}
                      </option>
                    ))
                  ) : (
                    <option value="">Default microphone</option>
                  )}
                </select>
              </label>
              <div className={twCss("toolbar-mic-test")}>
                <button onClick={testMic}>
                  <AudioLines size={14} />
                  {testingMic ? "Listening…" : "Test microphone"}
                </button>
                <span className={twCss(testingMic ? "meter-active" : "")}>
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            </div>
          )}
        </div>

        <div className={twCss("toolbar-device-wrap")}>
          <div
            className={twCss(`toolbar-device ${
              openMenu === "camera" ? "device-menu-open" : ""
            }`)}
          >
            <button
              className={twCss(`call-control ${cameraOn ? "control-on" : "control-off"}`)}
              onClick={onToggleCamera}
              aria-label={cameraOn ? "Turn camera off" : "Turn camera on"}
            >
              {cameraOn ? <Video /> : <VideoOff />}
              <span>{cameraOn ? "Stop video" : "Start video"}</span>
            </button>
            <button
              className={twCss("toolbar-device-chevron")}
              aria-label="Camera input settings"
              aria-expanded={openMenu === "camera"}
              onClick={() => setOpenMenu(openMenu === "camera" ? null : "camera")}
            >
              <ChevronDown size={14} />
            </button>
          </div>
          {openMenu === "camera" && (
            <div className={twCss("toolbar-device-menu")}>
              <label>
                Camera input
                <select
                  value={selectedVideoDevice || ""}
                  onChange={(e) => onSelectVideoDevice?.(e.target.value)}
                >
                  {devices?.videoInputs && devices.videoInputs.length > 0 ? (
                    devices.videoInputs.map((d, i) => (
                      <option key={d.deviceId || i} value={d.deviceId}>
                        {d.label || `Camera ${i + 1}`}
                      </option>
                    ))
                  ) : (
                    <option value="">Default camera</option>
                  )}
                </select>
              </label>
            </div>
          )}
        </div>

        <button
          className={twCss(`call-control ${sharing ? "selected-control" : ""}`)}
          onClick={onToggleShare}
          aria-pressed={sharing}
          disabled={Boolean(sharingElsewhere)}
          title={sharingElsewhere ? `${presenterName || "Another participant"} is presenting` : undefined}
        >
          <MonitorUp />
          <span>{sharing ? "Stop share" : "Share screen"}</span>
        </button>

        <button
          className={twCss(`call-control ${chatOpen ? "selected-control" : ""}`)}
          onClick={onToggleChat}
          aria-pressed={chatOpen}
        >
          <MessageSquare />
          <span>Chat</span>
        </button>

        <button
          className={twCss(`call-control ${peopleOpen ? "selected-control" : ""}`)}
          onClick={onTogglePeople}
          aria-pressed={peopleOpen}
        >
          <Users />
          <span>
            People <span className={twCss("people-count")}>{peopleCount}</span>
          </span>
        </button>

        <button
          type="button"
          className={twCss("leave-control")}
          onClick={onLeave}
          aria-label="Leave meeting"
        >
          <span className={twCss("leave-icon")}>×</span>
          <span>Leave</span>
        </button>
      </div>
      <div className={twCss("meeting-controls-right")}>
        meet<span className={twCss("brand-period")}>.</span>
      </div>
    </footer>
  );
}

export function PeoplePanel({
  participants,
  onClose,
}: {
  participants: Participant[];
  onClose: () => void;
}) {
  return (
    <aside className={twCss("people-panel")}>
      <div className={twCss("chat-panel-heading")}>
        <div>
          <p>IN THIS ROOM</p>
          <h2>
            People <span>{participants.length}</span>
          </h2>
        </div>
        <button onClick={onClose} aria-label="Close people panel">
          <X size={15} />
        </button>
      </div>
      <div className={twCss("people-list")}>
        {participants.map((participant, index) => {
          const initial = (participant.name || "G")[0].toUpperCase();
          return (
            <div
              className={twCss("people-list-item")}
              key={participant.peerId || `${participant.name}-${index}`}
            >
              {participant.photo ? (
                <Avatar image={participant.photo} name={participant.name} />
              ) : (
                <div className={twCss("avatar avatar-fallback")}>
                  <span>{initial}</span>
                </div>
              )}
              <span>
                <b>
                  {participant.name} {participant.isLocal && "(You)"}
                </b>
                <small>
                  {participant.speaking
                    ? "Speaking"
                    : participant.micOn === false
                    ? "Muted"
                    : "In the meeting"}
                </small>
              </span>
              {participant.speaking && <i />}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

export function MeetingChat({
  messages,
  message,
  onMessageChange,
  onSend,
  onClose,
}: {
  messages: Array<{
    id: string;
    sender: string;
    text: string;
    time: string;
    isOwn?: boolean;
  }>;
  message: string;
  onMessageChange: (value: string) => void;
  onSend: (event: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length]);

  return (
    <aside className={twCss("chat-panel")} aria-label="Meeting chat">
      <div className={twCss("chat-panel-heading")}>
        <div>
          <p>THE BACKCHANNEL</p>
          <h2>
            Room chat <span>{messages.length}</span>
          </h2>
        </div>
        <button onClick={onClose} aria-label="Close chat" type="button">
          <X size={15} />
        </button>
      </div>
      <div className={twCss("chat-messages")} ref={listRef}>
        <div className={twCss("chat-day-divider")}>
          <span /> IN CALL MESSAGES <span />
        </div>
        {messages.length === 0 ? (
          <div className={twCss("chat-empty-state")}>
            <p>No messages yet.</p>
            <small>Send a note to everyone in the room 👋</small>
          </div>
        ) : (
          messages.map((item) => (
            <div
              className={twCss(`chat-message ${item.isOwn ? "own-message" : ""}`)}
              key={item.id}
            >
              <div className={twCss("chat-avatar-badge")} aria-hidden="true">
                {(item.sender || "G")[0].toUpperCase()}
              </div>
              <div className={twCss("chat-message-body")}>
                <div className={twCss("chat-message-meta")}>
                  <b>{item.isOwn ? "You" : item.sender}</b>
                  <small>{item.time}</small>
                </div>
                <p className={twCss("chat-message-text")}>{item.text}</p>
              </div>
            </div>
          ))
        )}
      </div>
      <form className={twCss("chat-compose")} onSubmit={onSend}>
        <input
          value={message}
          onChange={(event) => onMessageChange(event.target.value)}
          placeholder="Send a message to everyone…"
        />
        <button aria-label="Send message" type="submit" disabled={!message.trim()}>
          <ArrowRight size={15} />
        </button>
      </form>
    </aside>
  );
}

const backgrounds = [
  { id: "none", label: "Original" },
  { id: "warm", label: "Warm studio" },
  { id: "blur", label: "Soft blur" },
  { id: "green-screen", label: "Green screen" },
] as const;

export function MeetingLobby({
  title,
  localStream,
  micOn,
  cameraOn,
  copied,
  hasPinRequired,
  onToggleMic,
  onToggleCamera,
  onJoin,
  onCopy,
}: {
  title: string;
  localStream: MediaStream | null;
  micOn: boolean;
  cameraOn: boolean;
  copied: boolean;
  hasPinRequired?: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onJoin: (settings: { name: string; pin?: string; background: string }) => void;
  onCopy: () => void;
}) {
  const [background, setBackground] = useState<string>("none");
  const [userName, setUserName] = useState("Olivia Rhye");
  const [roomPin, setRoomPin] = useState("");
  const [devices, setDevices] = useState<AvailableDevices>({
    audioInputs: [],
    videoInputs: [],
    audioOutputs: [],
  });
  const [selectedAudio, setSelectedAudio] = useState("");
  const [selectedVideo, setSelectedVideo] = useState("");
  const [testingMic, setTestingMic] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [openDeviceMenu, setOpenDeviceMenu] = useState<
    "mic" | "camera" | "background" | null
  >(null);

  const previewVideoRef = useRef<HTMLVideoElement>(null);

  // Hook up video stream to preview
  useEffect(() => {
    if (previewVideoRef.current && localStream) {
      previewVideoRef.current.srcObject = localStream;
    }
  }, [localStream, cameraOn]);

  // Load available devices
  useEffect(() => {
    getAvailableDevices().then((devs) => {
      setDevices(devs);
      if (devs.audioInputs[0]) setSelectedAudio(devs.audioInputs[0].deviceId);
      if (devs.videoInputs[0]) setSelectedVideo(devs.videoInputs[0].deviceId);
    });
  }, []);

  // Listen to audio level for live microphone meter
  useEffect(() => {
    if (!localStream || !micOn) {
      setMicVolume(0);
      return;
    }
    const cleanup = createAudioLevelMeter(localStream, (vol) => {
      setMicVolume(vol);
    });
    return cleanup;
  }, [localStream, micOn]);

  const testMic = () => {
    setTestingMic(true);
    window.setTimeout(() => setTestingMic(false), 3500);
  };

  const handleJoinClick = () => {
    onJoin({
      name: userName.trim() || "Guest",
      pin: roomPin.trim() || undefined,
      background,
    });
  };

  return (
    <main className={twCss("lobby-shell")}>
      <header className={twCss("lobby-topbar")}>
        <Brand compact />
        <span className={twCss("lobby-secure")}>
          <i /> Ready to join {hasPinRequired && <span className={twCss("pin-badge")}><Lock size={10} /> PIN required</span>}
        </span>
      </header>
      <section className={twCss("lobby-content lobby-focused")}>
        <div className={twCss("lobby-preview-column")}>
          <div className={twCss(`lobby-preview background-${background}`)}>
            <div className={twCss(`self-preview ${cameraOn ? "camera-on" : "camera-off"}`)}>
              <div className={twCss("preview-background-layer")} />
              {cameraOn ? (
                <video
                  ref={previewVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={twCss("self-preview-video")}
                />
              ) : (
                <div className={twCss("preview-avatar")}>
                  {(userName || "O")[0].toUpperCase()}
                </div>
              )}
              <span className={twCss("preview-name")}>{userName} (you)</span>
              <span className={twCss("preview-preview-label")}>
                <i /> LIVE PREVIEW
              </span>
            </div>
          </div>
          <div className={twCss("preview-switches")}>
            <div className={twCss("preview-device-wrap")}>
              <div className={twCss("preview-device-control")}>
                <button
                  className={twCss(`preview-toggle ${micOn ? "enabled" : "disabled"}`)}
                  onClick={onToggleMic}
                  aria-pressed={micOn}
                >
                  <span className={twCss("preview-toggle-icon")}>
                    {micOn ? <Mic size={17} /> : <MicOff size={17} />}
                  </span>
                  <span>
                    <b>Microphone</b>
                    <small>{micOn ? "On" : "Muted"}</small>
                  </span>
                </button>
                <button
                  className={twCss("device-menu-trigger")}
                  aria-label="Microphone settings"
                  aria-expanded={openDeviceMenu === "mic"}
                  onClick={() =>
                    setOpenDeviceMenu(openDeviceMenu === "mic" ? null : "mic")
                  }
                >
                  <ChevronDown size={14} />
                </button>
              </div>
              {openDeviceMenu === "mic" && (
                <div className={twCss("device-dropdown")}>
                  <label>
                    Microphone input
                    <select
                      value={selectedAudio}
                      onChange={(e) => setSelectedAudio(e.target.value)}
                    >
                      {devices.audioInputs.length > 0 ? (
                        devices.audioInputs.map((d, i) => (
                          <option key={d.deviceId || i} value={d.deviceId}>
                            {d.label || `Microphone ${i + 1}`}
                          </option>
                        ))
                      ) : (
                        <option value="">Default microphone</option>
                      )}
                    </select>
                  </label>
                  <div className={twCss("mic-test-row")}>
                    <button
                      className={twCss(`mic-test-button ${testingMic ? "testing" : ""}`)}
                      onClick={testMic}
                    >
                      <AudioLines size={15} />
                      {testingMic ? "Listening…" : "Test microphone"}
                    </button>
                    <div
                      className={twCss(`mic-test-meter ${
                        testingMic || micVolume > 10 ? "active" : ""
                      }`)}
                      aria-label="Microphone test meter"
                    >
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className={twCss("preview-device-wrap")}>
              <div className={twCss("preview-device-control")}>
                <button
                  className={twCss(`preview-toggle ${cameraOn ? "enabled" : "disabled"}`)}
                  onClick={onToggleCamera}
                  aria-pressed={cameraOn}
                >
                  <span className={twCss("preview-toggle-icon")}>
                    {cameraOn ? <Video size={17} /> : <VideoOff size={17} />}
                  </span>
                  <span>
                    <b>Camera</b>
                    <small>{cameraOn ? "On" : "Off"}</small>
                  </span>
                </button>
                <button
                  className={twCss("device-menu-trigger")}
                  aria-label="Camera settings"
                  aria-expanded={openDeviceMenu === "camera"}
                  onClick={() =>
                    setOpenDeviceMenu(openDeviceMenu === "camera" ? null : "camera")
                  }
                >
                  <ChevronDown size={14} />
                </button>
              </div>
              {openDeviceMenu === "camera" && (
                <div className={twCss("device-dropdown camera-device-dropdown")}>
                  <label>
                    Camera input
                    <select
                      value={selectedVideo}
                      onChange={(e) => setSelectedVideo(e.target.value)}
                    >
                      {devices.videoInputs.length > 0 ? (
                        devices.videoInputs.map((d, i) => (
                          <option key={d.deviceId || i} value={d.deviceId}>
                            {d.label || `Camera ${i + 1}`}
                          </option>
                        ))
                      ) : (
                        <option value="">Default camera</option>
                      )}
                    </select>
                  </label>
                </div>
              )}
            </div>

            <div className={twCss("preview-device-wrap background-device-wrap")}>
              <div className={twCss("preview-device-control")}>
                <button
                  className={twCss(`preview-toggle background-toggle ${
                    openDeviceMenu === "background" ? "enabled" : ""
                  }`)}
                  onClick={() =>
                    setOpenDeviceMenu(
                      openDeviceMenu === "background" ? null : "background"
                    )
                  }
                  aria-expanded={openDeviceMenu === "background"}
                >
                  <span className={twCss("preview-toggle-icon")}>
                    <Sparkles size={17} />
                  </span>
                  <span>
                    <b>Video background</b>
                    <small>
                      {backgrounds.find((opt) => opt.id === background)?.label}
                    </small>
                  </span>
                </button>
                <button
                  className={twCss("device-menu-trigger")}
                  aria-label="Video background options"
                  aria-expanded={openDeviceMenu === "background"}
                  onClick={() =>
                    setOpenDeviceMenu(
                      openDeviceMenu === "background" ? null : "background"
                    )
                  }
                >
                  <ChevronDown size={14} />
                </button>
              </div>
              {openDeviceMenu === "background" && (
                <div className={twCss("device-dropdown background-dropdown")}>
                  <div className={twCss("background-options")}>
                    {backgrounds.map((option) => (
                      <button
                        type="button"
                        key={option.id}
                        className={twCss(`background-option ${
                          background === option.id ? "selected" : ""
                        }`)}
                        onClick={() => {
                          setBackground(option.id);
                          setOpenDeviceMenu(null);
                        }}
                        aria-pressed={background === option.id}
                      >
                        <span
                          className={twCss(`background-swatch swatch-${option.id}`)}
                        >
                          {background === option.id && <Check size={13} />}
                        </span>
                        <small>{option.label}</small>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={twCss("lobby-details lobby-setup")}>
          <p className={twCss("lobby-eyebrow")}>
            <span /> BEFORE YOU JOIN
          </p>
          <h1>
            Get your setup
            <br />
            just <em>right.</em>
          </h1>
          <p className={twCss("lobby-subtitle")}>{title}</p>

          <label className={twCss("name-label")} htmlFor="display-name">
            Your name
          </label>
          <input
            id="display-name"
            className={twCss("name-input")}
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Enter your name"
          />

          <div className={twCss("lobby-pin-wrap")}>
            <label className={twCss("lobby-pin-label")} htmlFor="room-pin">
              <span>Meeting PIN {hasPinRequired ? "(Required)" : "(Optional)"}</span>
              <small style={{ color: "#888", fontSize: "9px" }}>
                {hasPinRequired ? "Host requires a PIN" : "Leave empty if not set"}
              </small>
            </label>
            <input
              id="room-pin"
              className={twCss("lobby-pin-input")}
              value={roomPin}
              onChange={(e) => setRoomPin(e.target.value)}
              placeholder="e.g. 1234"
              type="text"
            />
          </div>

          <button className={twCss("join-room-cta")} onClick={handleJoinClick}>
            Join meeting <ArrowRight size={17} />
          </button>
          <button className={twCss("lobby-copy")} onClick={onCopy}>
            {copied ? "Meeting link copied" : "Copy meeting link"}
          </button>
        </div>
      </section>
    </main>
  );
}
