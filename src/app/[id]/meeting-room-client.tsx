"use client";

import { twCss } from "@/lib/tailwind-classes";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock } from "lucide-react";
import { Brand, Toast } from "@/components/ui";
import {
  MeetingChat,
  MeetingControlBar,
  MeetingLobby,
  ParticipantGrid,
  PeoplePanel,
  ShareStage,
  type Participant,
} from "@/components/meeting-room";
import {
  getLocalMediaStream,
  stopMediaStream,
  getAvailableDevices,
  type AvailableDevices,
} from "@/lib/media";
import { useWebRTC } from "@/lib/use-webrtc";

export default function MeetingRoomClient({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const router = useRouter();

  // Pre-join & local media state
  const [joined, setJoined] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [userName, setUserName] = useState("Olivia Rhye");
  const [roomPin, setRoomPin] = useState("");
  const [hasPinRequired, setHasPinRequired] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);

  const localStreamRef = useRef<MediaStream | null>(null);
  localStreamRef.current = localStream;
  const micOnRef = useRef(micOn);
  micOnRef.current = micOn;
  const cameraOnRef = useRef(cameraOn);
  cameraOnRef.current = cameraOn;

  // Unload & unmount cleanup to guarantee camera light turns off
  useEffect(() => {
    const handleUnload = () => {
      stopMediaStream(localStreamRef.current);
    };
    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);
      stopMediaStream(localStreamRef.current);
    };
  }, []);

  // Available devices
  const [devices, setDevices] = useState<AvailableDevices>({
    audioInputs: [],
    videoInputs: [],
    audioOutputs: [],
  });
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>("");
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>("");

  // In-room UI panels
  const [chatOpen, setChatOpen] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);

  const flash = useCallback((text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice(""), 2800);
  }, []);

  // Check if room requires PIN
  useEffect(() => {
    fetch(`/api/rooms/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.hasPin) {
          setHasPinRequired(true);
        }
      })
      .catch((err) => console.warn("Could not check room status:", err));
  }, [id]);

  // Request initial camera & microphone for lobby preview
  useEffect(() => {
    let active = true;

    async function setupLobbyMedia() {
      try {
        const stream = await getLocalMediaStream({ audio: true, video: true });
        if (!active) {
          stopMediaStream(stream);
          return;
        }
        const audioTrack = stream.getAudioTracks().find((track) => track.readyState === "live");
        if (audioTrack) {
          audioTrack.enabled = micOnRef.current;
        } else {
          micOnRef.current = false;
          setMicOn(false);
        }
        const videoTrack = stream.getVideoTracks().find((track) => track.readyState === "live");
        if (videoTrack && cameraOnRef.current) {
          videoTrack.enabled = cameraOnRef.current;
        } else if (videoTrack) {
          videoTrack.stop();
          stream.removeTrack(videoTrack);
        } else {
          cameraOnRef.current = false;
          setCameraOn(false);
        }
        setLocalStream(stream);

        const devs = await getAvailableDevices();
        if (active) {
          setDevices(devs);
          if (devs.audioInputs[0]) setSelectedAudioDevice(devs.audioInputs[0].deviceId);
          if (devs.videoInputs[0]) setSelectedVideoDevice(devs.videoInputs[0].deviceId);
        }
      } catch (err: unknown) {
        console.warn("Could not acquire media stream for lobby:", err);
        micOnRef.current = false;
        cameraOnRef.current = false;
        setMicOn(false);
        setCameraOn(false);
        flash("Could not access camera/microphone. You can still join.");
      }
    }

    setupLobbyMedia();

    return () => {
      active = false;
    };
  }, [flash]);

  // Switch audio device
  const handleSelectAudioDevice = useCallback(async (deviceId: string) => {
    setSelectedAudioDevice(deviceId);
    try {
      const newStream = await getLocalMediaStream({
        audio: { deviceId },
        video: cameraOnRef.current
          ? selectedVideoDevice ? { deviceId: selectedVideoDevice } : true
          : false,
      });
      const newAudioTrack = newStream.getAudioTracks()[0];
      if (newAudioTrack) newAudioTrack.enabled = micOnRef.current;
      const newVideoTrack = newStream.getVideoTracks()[0];
      if (newVideoTrack) newVideoTrack.enabled = cameraOnRef.current;
      stopMediaStream(localStream);
      setLocalStream(newStream);
    } catch (e) {
      console.warn("Failed to switch audio device:", e);
    }
  }, [localStream, selectedVideoDevice]);

  // Switch video device
  const handleSelectVideoDevice = useCallback(async (deviceId: string) => {
    setSelectedVideoDevice(deviceId);
    if (!cameraOnRef.current) return;
    try {
      const newStream = await getLocalMediaStream({
        audio: selectedAudioDevice ? { deviceId: selectedAudioDevice } : true,
        video: { deviceId },
      });
      const newAudioTrack = newStream.getAudioTracks()[0];
      if (newAudioTrack) newAudioTrack.enabled = micOnRef.current;
      const newVideoTrack = newStream.getVideoTracks()[0];
      if (newVideoTrack) newVideoTrack.enabled = cameraOnRef.current;
      stopMediaStream(localStream);
      setLocalStream(newStream);
    } catch (e) {
      console.warn("Failed to switch video device:", e);
    }
  }, [localStream, selectedAudioDevice]);

  // Local track toggles in lobby
  const handleLobbyToggleMic = useCallback(() => {
    if (localStream) {
      const track = localStream.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        micOnRef.current = track.enabled;
        setMicOn(track.enabled);
      }
    } else {
      const next = !micOnRef.current;
      micOnRef.current = next;
      setMicOn(next);
    }
  }, [localStream]);

  const handleLobbyToggleCamera = useCallback(async () => {
    if (cameraOnRef.current) {
      const currentStream = localStreamRef.current;
      currentStream?.getVideoTracks().forEach((track) => track.stop());
      const retainedTracks = currentStream?.getTracks().filter(
        (track) => track.kind !== "video" && track.readyState === "live"
      ) ?? [];
      const nextStream = new MediaStream(retainedTracks);
      localStreamRef.current = nextStream;
      setLocalStream(nextStream);
      cameraOnRef.current = false;
      setCameraOn(false);
      return;
    }

    try {
      const captured = await getLocalMediaStream({
        audio: false,
        video: selectedVideoDevice ? { deviceId: selectedVideoDevice } : true,
      });
      const videoTrack = captured.getVideoTracks().find((track) => track.readyState === "live");
      if (!videoTrack) throw new Error("No live camera track was returned.");
      const retainedTracks = localStreamRef.current?.getTracks().filter(
        (track) => track.kind !== "video" && track.readyState === "live"
      ) ?? [];
      const nextStream = new MediaStream([...retainedTracks, videoTrack]);
      localStreamRef.current = nextStream;
      setLocalStream(nextStream);
      cameraOnRef.current = true;
      setCameraOn(true);
    } catch (error) {
      console.warn("Could not enable camera in the lobby:", error);
      cameraOnRef.current = false;
      setCameraOn(false);
      flash("Could not access your camera. Check browser permissions.");
    }
  }, [flash, selectedVideoDevice]);

  // WebRTC connection
  const webrtc = useWebRTC({
    roomId: joined ? id : "",
    userName,
    localStream,
    onLocalStreamChange: setLocalStream,
    selectedVideoDevice,
    pin: roomPin,
    initialMicOn: micOn,
    initialCameraOn: cameraOn,
    onNotice: flash,
  });

  useEffect(() => {
    if (!joined) return;
    micOnRef.current = webrtc.micOn;
    cameraOnRef.current = webrtc.cameraOn;
  }, [joined, webrtc.micOn, webrtc.cameraOn]);

  // Call duration counter
  useEffect(() => {
    if (!joined) return;
    const timer = window.setInterval(() => setElapsed((val) => val + 1), 1000);
    return () => window.clearInterval(timer);
  }, [joined]);

  const clock = useMemo(() => {
    const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const secs = String(elapsed % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  }, [elapsed]);

  // Copy meeting link
  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      flash("Meeting link copied to clipboard!");
    } catch {
      flash("Your meeting link is ready to share.");
    }
  }, [flash]);

  // Join meeting from lobby
  const handleJoinMeeting = useCallback(
    ({ name, pin }: { name: string; pin?: string }) => {
      setUserName(name);
      if (pin) setRoomPin(pin);
      setJoined(true);
      flash("Connected to room. Friends can join with your link!");
    },
    [flash]
  );

  // Send chat message
  const handleSendMessage = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (chatInput.trim()) {
        webrtc.sendChatMessage(chatInput);
        setChatInput("");
      }
    },
    [chatInput, webrtc]
  );

  // Leave meeting
  const handleLeaveMeeting = useCallback(() => {
    webrtc.leaveRoom();
    stopMediaStream(localStream);
    stopMediaStream(localStreamRef.current);
    setLocalStream(null);
    router.push("/");
  }, [webrtc, localStream, router]);

  // Assemble full participants list (Local + Remote)
  const allParticipants = useMemo<Participant[]>(() => {
    const localPart: Participant = {
      peerId: webrtc.localPeerId || "local",
      name: userName,
      stream: localStream,
      micOn: webrtc.micOn,
      cameraOn: webrtc.cameraOn,
      isLocal: true,
    };

    const remotes: Participant[] = webrtc.remoteParticipants.map((r) => ({
      peerId: r.peerId,
      name: r.name,
      stream: r.stream,
      speaking: r.isSpeaking,
      micOn: r.micOn,
      cameraOn: r.cameraOn,
      isLocal: false,
    }));

    return [localPart, ...remotes];
  }, [userName, localStream, webrtc.localPeerId, webrtc.micOn, webrtc.cameraOn, webrtc.remoteParticipants]);

  // Screen share status
  const isSomeoneSharing = Boolean(webrtc.screenStream || webrtc.sharingPeerId);
  const isLocalSharing = Boolean(
    webrtc.screenStream &&
    (webrtc.sharingPeerId === webrtc.localPeerId || webrtc.sharingPeerId === "local")
  );

  // Presenter stream & name
  const presenterParticipant = useMemo(() => {
    if (isLocalSharing) return { name: "You", stream: webrtc.screenStream };
    const presenter = webrtc.remoteParticipants.find((participant) =>
      participant.peerId === webrtc.sharingPeerId
    );
    return {
      name: presenter?.name ?? "A participant",
      stream: webrtc.sharingPeerId ? webrtc.screenStream : null,
    };
  }, [isLocalSharing, webrtc.screenStream, webrtc.sharingPeerId, webrtc.remoteParticipants]);

  // If still in lobby
  if (!joined) {
    return (
      <>
        <MeetingLobby
          title={title}
          localStream={localStream}
          micOn={micOn}
          cameraOn={cameraOn}
          copied={copied}
          hasPinRequired={hasPinRequired}
          onToggleMic={handleLobbyToggleMic}
          onToggleCamera={handleLobbyToggleCamera}
          onJoin={handleJoinMeeting}
          onCopy={copyLink}
        />
        {notice && <Toast room>{notice}</Toast>}
      </>
    );
  }

  return (
    <main className={twCss(`meeting-shell ${isSomeoneSharing ? "is-sharing" : ""}`)}>
      <header className={twCss("meeting-topbar")}>
        <Brand compact />
        <div className={twCss("room-heading")}>
          <span className={twCss("meeting-elapsed")}>
            <i /> {clock}
          </span>
          {hasPinRequired && (
            <span className={twCss("pin-badge")} title="Room has PIN protection">
              <Lock size={11} /> Secured
            </span>
          )}
        </div>
        <div className={twCss("room-header-actions")}>
          <span className={twCss("room-encrypted")}>✳ &nbsp;WebRTC P2P Encrypted</span>
          <button className={twCss("copy-room-link")} onClick={copyLink}>
            {copied ? "Copied!" : "Share link"}
            <ArrowRight size={14} strokeWidth={1.7} />
          </button>
        </div>
      </header>

      <section
        className={`meeting-stage relative flex-1 min-h-0 w-full flex items-center justify-center p-2 sm:p-3 overflow-hidden transition-all duration-200 ${
          chatOpen || peopleOpen ? "md:pr-[350px]" : ""
        } ${isSomeoneSharing ? "sharing-stage" : ""}`}
      >
        {isSomeoneSharing ? (
          <ShareStage
            participants={allParticipants}
            screenStream={presenterParticipant.stream}
            presenterName={presenterParticipant.name}
            isLocalSharing={isLocalSharing}
            onStop={webrtc.stopScreenShare}
          />
        ) : (
          <ParticipantGrid participants={allParticipants} />
        )}
      </section>

      {chatOpen && (
        <MeetingChat
          messages={webrtc.chatMessages}
          message={chatInput}
          onMessageChange={setChatInput}
          onSend={handleSendMessage}
          onClose={() => setChatOpen(false)}
        />
      )}

      {peopleOpen && (
        <PeoplePanel
          participants={allParticipants}
          onClose={() => setPeopleOpen(false)}
        />
      )}

      <MeetingControlBar
        micOn={webrtc.micOn}
        cameraOn={webrtc.cameraOn}
        chatOpen={chatOpen}
        peopleOpen={peopleOpen}
        sharing={isLocalSharing}
        clock={clock}
        roomId={id}
        devices={devices}
        selectedAudioDevice={selectedAudioDevice}
        selectedVideoDevice={selectedVideoDevice}
        peopleCount={allParticipants.length}
        onSelectAudioDevice={handleSelectAudioDevice}
        onSelectVideoDevice={handleSelectVideoDevice}
        onToggleMic={webrtc.toggleMic}
        onToggleCamera={webrtc.toggleCamera}
        onToggleChat={() => {
          setChatOpen((v) => !v);
          setPeopleOpen(false);
        }}
        onTogglePeople={() => {
          setPeopleOpen((v) => !v);
          setChatOpen(false);
        }}
        onToggleShare={
          isLocalSharing ? webrtc.stopScreenShare : webrtc.startScreenShare
        }
        onLeave={handleLeaveMeeting}
      />

      {notice && <Toast room>{notice}</Toast>}
    </main>
  );
}
