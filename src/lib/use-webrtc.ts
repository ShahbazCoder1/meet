"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { MediaConnection, DataConnection } from "peerjs";
import {
  createAudioLevelMeter,
  createBlackVideoTrack,
  getLocalMediaStream,
  getScreenMediaStream,
  stopMediaStream,
} from "@/lib/media";

export interface RemoteParticipant {
  peerId: string;
  name: string;
  stream: MediaStream;
  isSpeaking?: boolean;
  micOn?: boolean;
  cameraOn?: boolean;
}

export interface ChatMessageItem {
  id: string;
  sender: string;
  text: string;
  time: string;
  isOwn?: boolean;
}

interface UseWebRTCOptions {
  roomId: string;
  userName: string;
  localStream: MediaStream | null;
  pin?: string;
  isHost?: boolean;
  initialMicOn?: boolean;
  initialCameraOn?: boolean;
  onLocalStreamChange?: (stream: MediaStream) => void;
  onNotice?: (msg: string) => void;
}

export function useWebRTC({
  roomId,
  userName,
  localStream,
  pin,
  isHost,
  initialMicOn = true,
  initialCameraOn = true,
  onLocalStreamChange,
  onNotice,
}: UseWebRTCOptions) {
  const [localPeerId, setLocalPeerId] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessageItem[]>([]);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [sharingPeerId, setSharingPeerId] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(initialMicOn);
  const [cameraOn, setCameraOn] = useState(initialCameraOn);

  // References to keep track of active PeerJS objects
  const peerInstanceRef = useRef<any>(null);
  const activeCallsRef = useRef<Map<string, MediaConnection>>(new Map());
  const activeConnectionsRef = useRef<Map<string, DataConnection>>(new Map());
  const connectingPeersRef = useRef<Set<string>>(new Set());
  const remotePeerStatesRef = useRef<Map<string, Partial<RemoteParticipant>>>(new Map());
  const pendingChatRef = useRef<ChatMessageItem[]>([]);
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(localStream);
  const placeholderMediaRef = useRef<{
    audioTrack: MediaStreamTrack;
    videoTrack: MediaStreamTrack;
    audioContext: AudioContext;
    oscillator: OscillatorNode;
  } | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenShareCallsRef = useRef<Map<string, MediaConnection>>(new Map());
  const stopScreenShareRef = useRef<() => void>(() => {});
  const micOnRef = useRef(initialMicOn);
  micOnRef.current = micOn;
  const cameraOnRef = useRef(initialCameraOn);
  cameraOnRef.current = cameraOn;

  const getPlaceholderMedia = useCallback(() => {
    if (placeholderMediaRef.current) return placeholderMediaRef.current;

    const AudioContextConstructor = window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) throw new Error("Web Audio is not available in this browser.");
    const audioContext = new AudioContextConstructor();
    const destination = audioContext.createMediaStreamDestination();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    gain.gain.value = 0;
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start();

    const audioTrack = destination.stream.getAudioTracks()[0];
    let videoTrack: MediaStreamTrack | undefined;
    try {
      videoTrack = createBlackVideoTrack();
    } catch (error) {
      oscillator.stop();
      void audioContext.close();
      throw error;
    }
    if (!audioTrack || !videoTrack) {
      oscillator.stop();
      void audioContext.close();
      throw new Error("Could not prepare meeting media tracks.");
    }

    placeholderMediaRef.current = { audioTrack, videoTrack, audioContext, oscillator };
    return placeholderMediaRef.current;
  }, []);

  const createCallStream = useCallback((stream: MediaStream | null) => {
    const audioTrack = stream?.getAudioTracks().find((track) => track.readyState === "live");
    const videoTrack = stream?.getVideoTracks().find((track) => track.readyState === "live");
    if (audioTrack && videoTrack) return new MediaStream([audioTrack, videoTrack]);

    const placeholder = getPlaceholderMedia();
    return new MediaStream([audioTrack ?? placeholder.audioTrack, videoTrack ?? placeholder.videoTrack]);
  }, [getPlaceholderMedia]);

  const stopPlaceholderMedia = useCallback(() => {
    const placeholder = placeholderMediaRef.current;
    if (!placeholder) return;
    placeholder.audioTrack.stop();
    placeholder.videoTrack.stop();
    try {
      placeholder.oscillator.stop();
    } catch {
      // The oscillator may already have stopped during cleanup.
    }
    void placeholder.audioContext.close();
    placeholderMediaRef.current = null;
  }, []);

  const syncCallTracks = useCallback((stream: MediaStream | null) => {
    const callStream = createCallStream(stream);
    const tracksByKind = new Map(callStream.getTracks().map((track) => [track.kind, track]));
    activeCallsRef.current.forEach((call) => {
      const connection = call.peerConnection;
      if (!connection) return;
      connection.getSenders().forEach((sender) => {
        const nextTrack = sender.track && tracksByKind.get(sender.track.kind);
        if (nextTrack && sender.track !== nextTrack) {
          void sender.replaceTrack(nextTrack).catch((error) => {
            console.warn("Could not update the outgoing media track:", error);
          });
        }
      });
    });
  }, [createCallStream]);

  useEffect(() => {
    localStreamRef.current = localStream;
    if (roomId) syncCallTracks(localStream);
  }, [localStream, roomId, syncCallTracks]);

  // Keep pre-join preferences in sync. Once joined, in-room toggles are owned
  // by this hook and do not change these props, so they are not reset.
  useEffect(() => {
    setMicOn(initialMicOn);
    micOnRef.current = initialMicOn;
    setCameraOn(initialCameraOn);
    cameraOnRef.current = initialCameraOn;

    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) audioTrack.enabled = initialMicOn;
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) videoTrack.enabled = initialCameraOn;
    }

    if (roomId) {
      const stateUpdate = {
        type: "state-update",
        peerId: peerInstanceRef.current?.id,
        micOn: initialMicOn,
        cameraOn: initialCameraOn,
        isSpeaking: false,
      };
      activeConnectionsRef.current.forEach((connection) => {
        if (!connection.open) return;
        try {
          connection.send(stateUpdate);
        } catch (error) {
          console.warn("Could not sync the initial media state:", error);
        }
      });
    }
  }, [roomId, initialMicOn, initialCameraOn]);

  // Broadcast data payload to all connected peers
  const broadcast = useCallback((data: unknown) => {
    activeConnectionsRef.current.forEach((conn) => {
      if (conn.open) {
        try {
          conn.send(data);
        } catch (e) {
          console.warn("Failed to send data to peer:", e);
        }
      }
    });
  }, []);

  // Update participant state helper
  const updateRemoteParticipant = useCallback((peerId: string, updates: Partial<RemoteParticipant>) => {
    remotePeerStatesRef.current.set(peerId, {
      ...remotePeerStatesRef.current.get(peerId),
      ...updates,
    });
    setRemoteParticipants((prev) =>
      prev.map((p) => (p.peerId === peerId ? { ...p, ...updates } : p))
    );
  }, []);

  // Handle incoming data channel connection
  const setupDataConnection = useCallback((conn: DataConnection) => {
    const remotePeerId = conn.peer;

    const handleOpen = () => {
      activeConnectionsRef.current.set(remotePeerId, conn);
      // Introduce ourselves
      try {
        conn.send({
          type: "user-info",
          peerId: peerInstanceRef.current?.id,
          name: userName,
          micOn: micOnRef.current,
          cameraOn: cameraOnRef.current,
          isSharing: Boolean(screenStreamRef.current),
        });
      } catch (e) {
        console.warn("Error sending initial user-info:", e);
      }
      // Chat can be sent immediately after joining, before PeerJS has finished
      // opening the data channel. Replay local messages to this peer on open.
      pendingChatRef.current.forEach((message) => {
        try {
          conn.send({ type: "chat", ...message });
        } catch (e) {
          console.warn("Could not sync pending chat message:", e);
        }
      });
    };

    if (conn.open) {
      handleOpen();
    } else {
      conn.on("open", handleOpen);
    }

    conn.on("data", (data: any) => {
      if (!data || typeof data !== "object") return;

      if (data.type === "chat") {
        setChatMessages((prev) => [
          ...prev,
          {
            id: data.id || Math.random().toString(),
            sender: data.sender || "Participant",
            text: data.text || "",
            time: data.time || "",
            isOwn: false,
          },
        ]);
        if (onNotice) onNotice(`New message from ${data.sender}`);
      } else if (data.type === "user-info") {
        updateRemoteParticipant(remotePeerId, {
          name: data.name || "Guest",
          micOn: data.micOn,
          cameraOn: data.cameraOn,
        });
        if (data.isSharing) {
          setSharingPeerId(remotePeerId);
        }
      } else if (data.type === "state-update") {
        updateRemoteParticipant(remotePeerId, {
          micOn: data.micOn,
          cameraOn: data.cameraOn,
          isSpeaking: data.isSpeaking,
        });
      } else if (data.type === "screen-share-started") {
        setSharingPeerId(data.peerId);
        if (onNotice) onNotice(`${data.name || "Someone"} started sharing their screen`);
      } else if (data.type === "screen-share-stopped") {
        setSharingPeerId((curr) => (curr === data.peerId ? null : curr));
      }
    });

    conn.on("close", () => {
      activeConnectionsRef.current.delete(remotePeerId);
    });

    conn.on("error", (err) => {
      console.warn("DataConnection error:", err);
      activeConnectionsRef.current.delete(remotePeerId);
    });
  }, [userName, onNotice, updateRemoteParticipant]);

  // Handle incoming or outgoing media call
  const setupMediaCall = useCallback((call: MediaConnection, remoteName?: string, outgoing = false) => {
    const remotePeerId = call.peer;
    activeCallsRef.current.set(remotePeerId, call);
    const meta = call.metadata as any;

    call.on("stream", (remoteStream: MediaStream) => {
      remoteStreamsRef.current.set(remotePeerId, remoteStream);

      setRemoteParticipants((prev) => {
        const existing = prev.find((p) => p.peerId === remotePeerId);
        if (existing) {
          return prev.map((p) => (p.peerId === remotePeerId ? { ...p, stream: remoteStream } : p));
        }
        const peerState = remotePeerStatesRef.current.get(remotePeerId);
        return [
          ...prev,
          {
            peerId: remotePeerId,
            name: peerState?.name || remoteName || (!outgoing ? meta?.name : undefined) || "Guest",
            stream: remoteStream,
            // Outgoing call metadata describes us, not the remote participant.
            micOn: peerState?.micOn ?? (!outgoing && meta?.micOn !== undefined ? Boolean(meta.micOn) : false),
            cameraOn: peerState?.cameraOn ?? (!outgoing && meta?.cameraOn !== undefined ? Boolean(meta.cameraOn) : false),
          },
        ];
      });
    });

    call.on("close", () => {
      activeCallsRef.current.delete(remotePeerId);
      remoteStreamsRef.current.delete(remotePeerId);
      setRemoteParticipants((prev) => prev.filter((p) => p.peerId !== remotePeerId));
      setSharingPeerId((curr) => (curr === remotePeerId ? null : curr));
    });

    call.on("error", (err) => {
      console.warn("MediaConnection error:", err);
      activeCallsRef.current.delete(remotePeerId);
      setRemoteParticipants((prev) => prev.filter((p) => p.peerId !== remotePeerId));
    });
  }, []);

  // Use a stable initiator for each pair so simultaneous room discovery cannot
  // create duplicate data and media connections from both ends.
  const connectToPeer = useCallback((peerInfo: { peerId: string; name?: string }) => {
    const peer = peerInstanceRef.current;
    const localId = peer?.id;
    const remotePeerId = peerInfo.peerId;
    if (!peer || !localId || !remotePeerId || remotePeerId === localId) return;

    // The lexicographically smaller peer owns connection creation. Both sides
    // run discovery, so this also handles peers that joined at the same time.
    if (localId > remotePeerId) return;

    const connection = activeConnectionsRef.current.get(remotePeerId);
    if (!connection && !connectingPeersRef.current.has(remotePeerId)) {
      connectingPeersRef.current.add(remotePeerId);
      try {
        const dataConnection = peer.connect(remotePeerId, { metadata: { name: userName } });
        setupDataConnection(dataConnection);
        const clearPending = () => connectingPeersRef.current.delete(remotePeerId);
        dataConnection.on("open", clearPending);
        dataConnection.on("close", clearPending);
        dataConnection.on("error", clearPending);
      } catch (error) {
        connectingPeersRef.current.delete(remotePeerId);
        console.warn("Could not connect to room participant:", remotePeerId, error);
      }
    }

    if (!activeCallsRef.current.has(remotePeerId)) {
      try {
        const call = peer.call(remotePeerId, createCallStream(localStreamRef.current), {
          metadata: {
            name: userName,
            micOn: micOnRef.current,
            cameraOn: cameraOnRef.current,
          },
        });
        if (call) setupMediaCall(call, peerInfo.name, true);
      } catch (error) {
        console.warn("Could not start media call with participant:", remotePeerId, error);
      }
    }
  }, [createCallStream, setupDataConnection, setupMediaCall, userName]);

  // Initialize PeerJS and Room connection
  useEffect(() => {
    if (!roomId) return;
    let isCancelled = false;
    let heartbeatInterval: ReturnType<typeof setInterval>;

    async function init() {
      // Dynamic import to prevent SSR issues in Next.js
      const { default: Peer } = await import("peerjs");

      if (isCancelled) return;

      const randomSuffix = Math.random().toString(36).slice(2, 7);
      const generatedPeerId = `${roomId}-${randomSuffix}`;
      setLocalPeerId(generatedPeerId);

      const peer = new Peer(generatedPeerId, {
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
          ],
        },
      });

      peerInstanceRef.current = peer;

      peer.on("open", async (id) => {
        if (isCancelled) return;
        setIsConnected(true);

        // Register with room API and fetch other active peers
        try {
          const res = await fetch(`/api/rooms/${roomId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "join",
              peerId: id,
              name: userName,
              pin,
              isHost,
            }),
          });

          const data = await res.json();
          if (!data.ok) {
            if (onNotice) onNotice(data.error || "Failed to join room.");
            return;
          }

          // Discover and connect to active peers. The same reconciliation runs
          // on each heartbeat to recover simultaneous joins and transient errors.
          if (data.peers && Array.isArray(data.peers)) {
            data.peers.forEach((peerInfo: { peerId: string; name: string }) => {
              connectToPeer(peerInfo);
            });
          }
        } catch (e) {
          console.warn("Room registration error:", e);
        }

        // Polling the room roster repairs missed connections (including when
        // both participants register before either sees the other).
        const reconcileRoom = async () => {
          try {
            const response = await fetch(`/api/rooms/${roomId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "heartbeat", peerId: id }),
            });
            const roster = await response.json();
            if (roster.ok && Array.isArray(roster.peers)) {
              roster.peers.forEach((peerInfo: { peerId: string; name: string }) => connectToPeer(peerInfo));
            }
          } catch {
            // The next heartbeat retries discovery.
          }
        };
        heartbeatInterval = setInterval(reconcileRoom, 3000);
      });

      // Handle incoming data connections
      peer.on("connection", (conn) => {
        setupDataConnection(conn);
      });

      // Handle incoming calls
      peer.on("call", (call) => {
        const meta = call.metadata as any;
        if (meta?.type === "screen-share") {
          call.answer();
          call.on("stream", (remoteScreenStream: MediaStream) => {
            setScreenStream(remoteScreenStream);
            setSharingPeerId(call.peer);
          });
          call.on("close", () => {
            setScreenStream(null);
            setSharingPeerId((curr) => (curr === call.peer ? null : curr));
          });
          call.on("error", () => {
            setScreenStream(null);
            setSharingPeerId((curr) => (curr === call.peer ? null : curr));
          });
          return;
        }

        try {
          call.answer(createCallStream(localStreamRef.current));
        } catch (error) {
          console.warn("Could not attach local media to the incoming call:", error);
          call.answer();
        }
        setupMediaCall(call, meta?.name, false);
      });

      peer.on("error", (err) => {
        console.warn("PeerJS error:", err);
      });
    }

    init();

    return () => {
      isCancelled = true;
      clearInterval(heartbeatInterval);

      // Stop any active media streams to release hardware & laptop camera LED
      stopMediaStream(localStreamRef.current);
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      screenShareCallsRef.current.forEach((c) => c.close());
      screenShareCallsRef.current.clear();

      // Notify server we're leaving
      if (peerInstanceRef.current?.id) {
        fetch(`/api/rooms/${roomId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "leave", peerId: peerInstanceRef.current.id }),
        }).catch(() => {});
      }

      // Close all connections and peer
      activeCallsRef.current.forEach((call) => call.close());
      activeCallsRef.current.clear();
      activeConnectionsRef.current.forEach((conn) => conn.close());
      activeConnectionsRef.current.clear();
      stopPlaceholderMedia();
      if (peerInstanceRef.current) {
        peerInstanceRef.current.destroy();
      }
    };
  }, [roomId, userName, pin, isHost, setupDataConnection, setupMediaCall, connectToPeer, createCallStream, stopPlaceholderMedia, onNotice]);

  // Audio level meter for speaking indicator on local stream
  useEffect(() => {
    if (!localStream) return;
    let lastSpeaking = false;
    const cleanup = createAudioLevelMeter(localStream, (volume) => {
      // If mic is off, do not broadcast speaking state; reset if was speaking
      if (!micOnRef.current) {
        if (lastSpeaking) {
          lastSpeaking = false;
          broadcast({
            type: "state-update",
            peerId: localPeerId,
            isSpeaking: false,
            micOn: false,
            cameraOn: cameraOnRef.current,
          });
        }
        return;
      }

      const isSpeaking = volume > 25;
      if (isSpeaking !== lastSpeaking) {
        lastSpeaking = isSpeaking;
        broadcast({
          type: "state-update",
          peerId: localPeerId,
          isSpeaking,
          micOn: true,
          cameraOn: cameraOnRef.current,
        });
      }
    });
    return cleanup;
  }, [localStream, localPeerId, broadcast]);

  // Send a chat message
  const sendChatMessage = useCallback((text: string) => {
    const cleanText = text.trim();
    if (!cleanText) return;

    const time = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).format(new Date());

    const messageItem: ChatMessageItem = {
      id: Math.random().toString(36).slice(2, 9),
      sender: userName,
      text: cleanText,
      time,
      isOwn: true,
    };

    setChatMessages((prev) => [...prev, messageItem]);
    pendingChatRef.current.push(messageItem);

    broadcast({
      type: "chat",
      ...messageItem,
    });
  }, [userName, broadcast]);

  const ensureLocalTrack = useCallback(async (kind: "audio" | "video") => {
    const currentStream = localStreamRef.current;
    const existingTrack = currentStream?.getTracks().find(
      (track) => track.kind === kind && track.readyState === "live"
    );
    if (existingTrack) return existingTrack;

    try {
      const captured = await getLocalMediaStream({ audio: kind === "audio", video: kind === "video" });
      const newTrack = captured.getTracks().find((track) => track.kind === kind && track.readyState === "live");
      if (!newTrack) throw new Error(`No ${kind} track was returned by the browser.`);

      const retainedTracks = currentStream?.getTracks().filter(
        (track) => track.kind !== kind && track.readyState === "live"
      ) ?? [];
      currentStream?.getTracks().filter((track) => track.kind === kind).forEach((track) => track.stop());
      const nextStream = new MediaStream([...retainedTracks, newTrack]);
      localStreamRef.current = nextStream;
      onLocalStreamChange?.(nextStream);
      syncCallTracks(nextStream);
      return newTrack;
    } catch (error) {
      console.warn(`Could not enable ${kind}:`, error);
      onNotice?.(`Could not access your ${kind === "audio" ? "microphone" : "camera"}. Check browser permissions.`);
      return null;
    }
  }, [onLocalStreamChange, onNotice, syncCallTracks]);

  // Toggle local microphone. If capture was unavailable at join, request it now.
  const toggleMic = useCallback(async () => {
    const next = !micOnRef.current;
    let audioTrack = localStreamRef.current?.getAudioTracks().find((track) => track.readyState === "live") ?? null;
    if (next && !audioTrack) audioTrack = await ensureLocalTrack("audio");
    if (next && !audioTrack) return;
    if (audioTrack) audioTrack.enabled = next;

    setMicOn(next);
    micOnRef.current = next;
    broadcast({
      type: "state-update",
      peerId: localPeerId,
      micOn: next,
      cameraOn: cameraOnRef.current,
      isSpeaking: false,
    });
  }, [localPeerId, broadcast, ensureLocalTrack]);

  // Toggle local camera. If capture was unavailable at join, request it now.
  const toggleCamera = useCallback(async () => {
    const next = !cameraOnRef.current;
    let videoTrack = localStreamRef.current?.getVideoTracks().find((track) => track.readyState === "live") ?? null;
    if (next && !videoTrack) videoTrack = await ensureLocalTrack("video");
    if (next && !videoTrack) return;
    if (videoTrack) videoTrack.enabled = next;

    setCameraOn(next);
    cameraOnRef.current = next;
    broadcast({
      type: "state-update",
      peerId: localPeerId,
      micOn: micOnRef.current,
      cameraOn: next,
    });
  }, [localPeerId, broadcast, ensureLocalTrack]);

  // Stop Screen Sharing
  const stopScreenShare = useCallback(() => {
    // 1. Stop all tracks on screen stream to release display capture
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => {
        track.onended = null;
        track.stop();
      });
      screenStreamRef.current = null;
    }

    // 2. Clear state
    setScreenStream(null);
    setSharingPeerId(null);

    // 3. Close secondary screen-share calls to peers
    screenShareCallsRef.current.forEach((call) => {
      try {
        call.close();
      } catch (e) {
        console.warn("Error closing screen-share call:", e);
      }
    });
    screenShareCallsRef.current.clear();

    // 4. Notify all peers that screen sharing has stopped
    broadcast({
      type: "screen-share-stopped",
      peerId: localPeerId || peerInstanceRef.current?.id,
    });
  }, [localPeerId, broadcast]);

  stopScreenShareRef.current = stopScreenShare;

  // Start Screen Sharing
  const startScreenShare = useCallback(async () => {
    try {
      const screenMedia = await getScreenMediaStream();
      screenStreamRef.current = screenMedia;
      setScreenStream(screenMedia);

      const myPeerId = localPeerId || peerInstanceRef.current?.id || "local";
      setSharingPeerId(myPeerId);

      const screenVideoTrack = screenMedia.getVideoTracks()[0];

      // Call each active peer with screen stream as a secondary call (preserving webcam)
      if (peerInstanceRef.current) {
        activeConnectionsRef.current.forEach((conn, remotePeerId) => {
          try {
            const screenCall = peerInstanceRef.current.call(remotePeerId, screenMedia, {
              metadata: { type: "screen-share", name: userName },
            });
            if (screenCall) {
              screenShareCallsRef.current.set(remotePeerId, screenCall);
              screenCall.on("close", () => {
                screenShareCallsRef.current.delete(remotePeerId);
              });
            }
          } catch (e) {
            console.warn("Could not initiate screen share call to peer:", remotePeerId, e);
          }
        });
      }

      broadcast({
        type: "screen-share-started",
        peerId: myPeerId,
        name: userName,
      });

      // When browser's native "Stop sharing" button is clicked
      if (screenVideoTrack) {
        screenVideoTrack.onended = () => {
          stopScreenShareRef.current();
        };
      }
    } catch (err: unknown) {
      if ((err as Error)?.name !== "NotAllowedError") {
        console.error("Screen share error:", err);
        if (onNotice) onNotice("Could not start screen share.");
      }
    }
  }, [localPeerId, userName, broadcast, onNotice]);

  // Clean disconnect
  const leaveRoom = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    screenShareCallsRef.current.forEach((c) => c.close());
    screenShareCallsRef.current.clear();
    stopMediaStream(localStreamRef.current);

    if (peerInstanceRef.current?.id) {
      fetch(`/api/rooms/${roomId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave", peerId: peerInstanceRef.current.id }),
      }).catch(() => {});
    }
    activeCallsRef.current.forEach((c) => c.close());
    activeConnectionsRef.current.forEach((c) => c.close());
    if (peerInstanceRef.current) {
      peerInstanceRef.current.destroy();
    }
    stopPlaceholderMedia();
  }, [roomId, stopPlaceholderMedia]);

  return {
    localPeerId,
    isConnected,
    remoteParticipants,
    chatMessages,
    screenStream,
    sharingPeerId,
    micOn,
    cameraOn,
    sendChatMessage,
    toggleMic,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
    leaveRoom,
  };
}
