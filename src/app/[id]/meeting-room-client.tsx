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
  releaseAllCameraTracks,
  releaseOtherCameraTracks,
  stopMediaStream,
  getAvailableDevices,
  type AvailableDevices,
} from "@/lib/media";
import { useWebRTC } from "@/lib/use-webrtc";
import { useBackgroundStream } from "@/lib/use-background-stream";
import type { BackgroundMode } from "@/lib/background-effects";

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
  const [rawStream, setRawStream] = useState<MediaStream | null>(null);
  const [userName, setUserName] = useState("Olivia Rhye");
  const [roomPin, setRoomPin] = useState("");
  const [hasPinRequired, setHasPinRequired] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [background, setBackground] = useState<BackgroundMode>("none");

  const rawStreamRef = useRef<MediaStream | null>(null);
  rawStreamRef.current = rawStream;
  const micOnRef = useRef(micOn);
  micOnRef.current = micOn;
  const cameraOnRef = useRef(cameraOn);
  cameraOnRef.current = cameraOn;

  // Unload & unmount cleanup to guarantee camera light turns off
  useEffect(() => {
    const handleUnload = () => {
      stopMediaStream(rawStreamRef.current);
      releaseAllCameraTracks();
    };
    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);
      stopMediaStream(rawStreamRef.current);
      releaseAllCameraTracks();
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
  const lobbyCameraBusyRef = useRef(false);

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

  const localStream = useBackgroundStream(rawStream, background, () => {
    setBackground("none");
    flash("Background effects aren't available on this device.");
  });

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
    let acquiredStream: MediaStream | null = null;

    async function setupLobbyMedia() {
      try {
        const stream = await getLocalMediaStream({
          audio: true,
          video: cameraOnRef.current,
        });
        acquiredStream = stream;
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
        if (videoTrack && !cameraOnRef.current) {
          videoTrack.stop();
        } else if (!videoTrack) {
          cameraOnRef.current = false;
          setCameraOn(false);
        }
        setRawStream(stream);

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
      // Stop streams owned by this effect run. Strict Mode and Fast Refresh
      // can clean up and restart the effect while camera capture is active.
      stopMediaStream(acquiredStream);
      releaseAllCameraTracks();
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
      if (!cameraOnRef.current) {
        releaseAllCameraTracks();
        newStream.getVideoTracks().forEach((track) => newStream.removeTrack(track));
      } else {
        releaseOtherCameraTracks(newStream.getVideoTracks());
      }
      const newAudioTrack = newStream.getAudioTracks()[0];
      if (newAudioTrack) newAudioTrack.enabled = micOnRef.current;
      const newVideoTrack = newStream.getVideoTracks()[0];
      if (newVideoTrack) newVideoTrack.enabled = cameraOnRef.current;
      stopMediaStream(rawStream);
      setRawStream(newStream);
    } catch (e) {
      console.warn("Failed to switch audio device:", e);
    }
  }, [rawStream, selectedVideoDevice]);

  // Switch video device
  const handleSelectVideoDevice = useCallback(async (deviceId: string) => {
    setSelectedVideoDevice(deviceId);
    if (!cameraOnRef.current) return;
    try {
      const newStream = await getLocalMediaStream({
        audio: selectedAudioDevice ? { deviceId: selectedAudioDevice } : true,
        video: { deviceId },
      });
      if (!cameraOnRef.current) {
        stopMediaStream(newStream);
        return;
      }
      releaseOtherCameraTracks(newStream.getVideoTracks());
      const newAudioTrack = newStream.getAudioTracks()[0];
      if (newAudioTrack) newAudioTrack.enabled = micOnRef.current;
      const newVideoTrack = newStream.getVideoTracks()[0];
      if (newVideoTrack) newVideoTrack.enabled = cameraOnRef.current;
      stopMediaStream(rawStream);
      setRawStream(newStream);
    } catch (e) {
      console.warn("Failed to switch video device:", e);
    }
  }, [rawStream, selectedAudioDevice]);

  // Local track toggles in lobby
  const handleLobbyToggleMic = useCallback(() => {
    if (rawStream) {
      const track = rawStream.getAudioTracks()[0];
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
  }, [rawStream]);

  const handleLobbyToggleCamera = useCallback(() => {
    if (lobbyCameraBusyRef.current) return;
    const next = !cameraOnRef.current;
    if (!next) {
      const audioTracks = rawStream?.getAudioTracks().filter((track) => track.readyState === "live") ?? [];
      releaseAllCameraTracks();
      rawStream?.getVideoTracks().forEach((track) => rawStream.removeTrack(track));
      cameraOnRef.current = false;
      setCameraOn(false);
      setRawStream(new MediaStream(audioTracks));
      return;
    }

    lobbyCameraBusyRef.current = true;
    void getLocalMediaStream({
      audio: false,
      video: selectedVideoDevice ? { deviceId: selectedVideoDevice } : true,
    }).then((captured) => {
      const videoTrack = captured.getVideoTracks().find((track) => track.readyState === "live");
      if (!videoTrack) throw new Error("No camera track was returned by the browser.");
      const audioTracks = rawStream?.getAudioTracks().filter((track) => track.readyState === "live") ?? [];
      const nextStream = new MediaStream([...audioTracks, videoTrack]);
      cameraOnRef.current = true;
      setCameraOn(true);
      setRawStream(nextStream);
    }).catch((error) => {
      console.warn("Could not enable lobby camera:", error);
      flash("Could not access your camera. Check browser permissions.");
    }).finally(() => {
      lobbyCameraBusyRef.current = false;
    });
  }, [rawStream, selectedVideoDevice, flash]);

  // WebRTC connection
  const webrtc = useWebRTC({
    roomId: joined ? id : "",
    userName,
    localStream: rawStream,
    outgoingStream: localStream,
    onLocalStreamChange: setRawStream,
    pin: roomPin,
    initialMicOn: micOn,
    initialCameraOn: cameraOn,
    videoDeviceId: selectedVideoDevice,
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
    ({ name, pin, background: selectedBackground }: { name: string; pin?: string; background: BackgroundMode }) => {
      setUserName(name);
      if (pin) setRoomPin(pin);
      setBackground(selectedBackground);
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
    stopMediaStream(rawStream);
    stopMediaStream(rawStreamRef.current);
    releaseAllCameraTracks();
    setRawStream(null);
    router.push("/");
  }, [webrtc, rawStream, router]);

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
  const isSomeoneSharing = Boolean(webrtc.localScreenStream || webrtc.remoteScreenStream || webrtc.sharingPeerId);
  const isLocalSharing = webrtc.isLocalSharing;

  // Presenter stream & name
  const presenterParticipant = useMemo(() => {
    if (isLocalSharing) return { name: "You", stream: webrtc.localScreenStream };
    const remote = webrtc.remoteParticipants.find(
      (p) => p.peerId === webrtc.sharingPeerId
    );
    return { name: remote?.name ?? "A participant", stream: webrtc.remoteScreenStream };
  }, [isLocalSharing, webrtc.localScreenStream, webrtc.remoteScreenStream, webrtc.sharingPeerId, webrtc.remoteParticipants]);

  // If still in lobby
  if (!joined) {
    return (
      <>
        <MeetingLobby
          title={title}
          localStream={localStream}
          micOn={micOn}
          cameraOn={cameraOn}
          background={background}
          onBackgroundChange={setBackground}
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
        sharingElsewhere={Boolean(webrtc.sharingPeerId && !isLocalSharing)}
        presenterName={webrtc.remoteParticipants.find((p) => p.peerId === webrtc.sharingPeerId)?.name}
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
