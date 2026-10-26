"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { MediaConnection, DataConnection } from "peerjs";
import { getScreenMediaStream, stopMediaStream, createAudioLevelMeter } from "@/lib/media";

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
  const pendingIncomingCallsRef = useRef<Map<string, MediaConnection>>(new Map());
  const activeConnectionsRef = useRef<Map<string, DataConnection>>(new Map());
  const connectingPeersRef = useRef<Set<string>>(new Set());
  const remotePeerStatesRef = useRef<Map<string, Partial<RemoteParticipant>>>(new Map());
  const pendingChatRef = useRef<ChatMessageItem[]>([]);
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(localStream);
  localStreamRef.current = localStream;
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenShareCallsRef = useRef<Map<string, MediaConnection>>(new Map());
  const stopScreenShareRef = useRef<() => void>(() => {});
  const micOnRef = useRef(initialMicOn);
  micOnRef.current = micOn;
  const cameraOnRef = useRef(initialCameraOn);
  cameraOnRef.current = cameraOn;

  // Sync state with initial values before joining or upon room connection
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (!roomId) {
      setMicOn(initialMicOn);
      micOnRef.current = initialMicOn;
      setCameraOn(initialCameraOn);
      cameraOnRef.current = initialCameraOn;
      hasInitializedRef.current = false;
    } else if (!hasInitializedRef.current) {
      setMicOn(initialMicOn);
      micOnRef.current = initialMicOn;
      setCameraOn(initialCameraOn);
      cameraOnRef.current = initialCameraOn;
      hasInitializedRef.current = true;

      // Ensure audio and video track enabled states match initial preferences
      if (localStreamRef.current) {
        const audioTrack = localStreamRef.current.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = initialMicOn;
        }
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = initialCameraOn;
        }
      }
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

    if (localStreamRef.current && !activeCallsRef.current.has(remotePeerId)) {
      try {
        const call = peer.call(remotePeerId, localStreamRef.current, {
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
  }, [setupDataConnection, setupMediaCall, userName]);

  // Initialize PeerJS and Room connection
  useEffect(() => {
    if (!roomId) return;
    let isCancelled = false;
    let heartbeatInterval: ReturnType<typeof setInterval>;
    const pendingIncomingCalls = pendingIncomingCallsRef.current;

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

        const stream = localStreamRef.current;
        if (!stream) {
          // Wait briefly for lobby capture to settle so a just-joined peer gets
          // a two-way call instead of a permanently one-way call.
          pendingIncomingCallsRef.current.set(call.peer, call);
          call.on("close", () => pendingIncomingCallsRef.current.delete(call.peer));
          return;
        }
        call.answer(stream);
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
      pendingIncomingCalls.forEach((call) => call.close());
      pendingIncomingCalls.clear();
      activeConnectionsRef.current.forEach((conn) => conn.close());
      activeConnectionsRef.current.clear();
      if (peerInstanceRef.current) {
        peerInstanceRef.current.destroy();
      }
    };
  }, [roomId, userName, pin, isHost, setupDataConnection, setupMediaCall, connectToPeer, onNotice]);

  // If joining beat getUserMedia, answer any waiting incoming call once the
  // local stream arrives so the other participant receives our tracks too.
  useEffect(() => {
    if (!localStream) return;
    pendingIncomingCallsRef.current.forEach((call, remotePeerId) => {
      try {
        call.answer(localStream);
        setupMediaCall(call, (call.metadata as any)?.name, false);
        pendingIncomingCallsRef.current.delete(remotePeerId);
      } catch (error) {
        console.warn("Could not answer pending media call:", remotePeerId, error);
      }
    });
  }, [localStream, setupMediaCall]);

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

  // Toggle local microphone
  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicOn(audioTrack.enabled);
        micOnRef.current = audioTrack.enabled;
        broadcast({
          type: "state-update",
          peerId: localPeerId,
          micOn: audioTrack.enabled,
          cameraOn: cameraOnRef.current,
          isSpeaking: false,
        });
      }
    } else {
      setMicOn((prev) => {
        const next = !prev;
        micOnRef.current = next;
        return next;
      });
    }
  }, [localPeerId, broadcast]);

  // Toggle local camera
  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraOn(videoTrack.enabled);
        cameraOnRef.current = videoTrack.enabled;
        broadcast({
          type: "state-update",
          peerId: localPeerId,
          micOn: micOnRef.current,
          cameraOn: videoTrack.enabled,
        });
        return;
      }
    }
    setCameraOn((prev) => {
      const next = !prev;
      cameraOnRef.current = next;
      broadcast({
        type: "state-update",
        peerId: localPeerId,
        micOn: micOnRef.current,
        cameraOn: next,
      });
      return next;
    });
  }, [localPeerId, broadcast]);

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
    pendingIncomingCallsRef.current.forEach((c) => c.close());
    pendingIncomingCallsRef.current.clear();
    activeConnectionsRef.current.forEach((c) => c.close());
    if (peerInstanceRef.current) {
      peerInstanceRef.current.destroy();
    }
  }, [roomId]);

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
