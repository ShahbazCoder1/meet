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
  const activeConnectionsRef = useRef<Map<string, DataConnection>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(localStream);
  localStreamRef.current = localStream;
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenShareCallsRef = useRef<Map<string, MediaConnection>>(new Map());
  const stopScreenShareRef = useRef<() => void>(() => {});

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
    setRemoteParticipants((prev) =>
      prev.map((p) => (p.peerId === peerId ? { ...p, ...updates } : p))
    );
  }, []);

  // Handle incoming data channel connection
  const setupDataConnection = useCallback((conn: DataConnection) => {
    const remotePeerId = conn.peer;

    conn.on("open", () => {
      activeConnectionsRef.current.set(remotePeerId, conn);
      // Introduce ourselves
      conn.send({
        type: "user-info",
        peerId: peerInstanceRef.current?.id,
        name: userName,
        micOn,
        cameraOn,
        isSharing: Boolean(screenStream),
      });
    });

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
  }, [userName, micOn, cameraOn, screenStream, onNotice, updateRemoteParticipant]);

  // Handle incoming or outgoing media call
  const setupMediaCall = useCallback((call: MediaConnection, remoteName?: string) => {
    const remotePeerId = call.peer;
    activeCallsRef.current.set(remotePeerId, call);

    call.on("stream", (remoteStream: MediaStream) => {
      remoteStreamsRef.current.set(remotePeerId, remoteStream);

      setRemoteParticipants((prev) => {
        const existing = prev.find((p) => p.peerId === remotePeerId);
        if (existing) {
          return prev.map((p) => (p.peerId === remotePeerId ? { ...p, stream: remoteStream } : p));
        }
        return [
          ...prev,
          {
            peerId: remotePeerId,
            name: remoteName || (call.metadata as any)?.name || "Guest",
            stream: remoteStream,
            micOn: true,
            cameraOn: true,
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

  // Initialize PeerJS and Room connection
  useEffect(() => {
    if (!roomId) return;
    let isCancelled = false;
    let heartbeatInterval: NodeJS.Timeout;

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

          // Call all other active peers in room
          if (data.peers && Array.isArray(data.peers)) {
            data.peers.forEach((peerInfo: { peerId: string; name: string }) => {
              if (peerInfo.peerId === id) return;

              // 1. Data connection for chat & state
              const conn = peer.connect(peerInfo.peerId, {
                metadata: { name: userName },
              });
              setupDataConnection(conn);

              // 2. Media call if we have local stream
              if (localStreamRef.current) {
                const call = peer.call(peerInfo.peerId, localStreamRef.current, {
                  metadata: { name: userName },
                });
                setupMediaCall(call, peerInfo.name);
              }
            });
          }
        } catch (e) {
          console.warn("Room registration error:", e);
        }

        // Heartbeat every 20s
        heartbeatInterval = setInterval(() => {
          fetch(`/api/rooms/${roomId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "heartbeat", peerId: id }),
          }).catch(() => {});
        }, 20000);
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

        if (localStreamRef.current) {
          call.answer(localStreamRef.current);
          setupMediaCall(call, meta?.name);
        } else {
          // If no local stream yet, answer without stream
          call.answer();
          setupMediaCall(call, meta?.name);
        }
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
      if (peerInstanceRef.current) {
        peerInstanceRef.current.destroy();
      }
    };
  }, [roomId, userName, pin, isHost, setupDataConnection, setupMediaCall, onNotice]);

  // Audio level meter for speaking indicator on local stream
  useEffect(() => {
    if (!localStream || !micOn) return;
    const cleanup = createAudioLevelMeter(localStream, (volume) => {
      const isSpeaking = volume > 25;
      broadcast({
        type: "state-update",
        peerId: localPeerId,
        isSpeaking,
        micOn,
        cameraOn,
      });
    });
    return cleanup;
  }, [localStream, micOn, cameraOn, localPeerId, broadcast]);

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
        broadcast({
          type: "state-update",
          peerId: localPeerId,
          micOn: audioTrack.enabled,
          cameraOn,
        });
      }
    } else {
      setMicOn((prev) => !prev);
    }
  }, [cameraOn, localPeerId, broadcast]);

  // Toggle local camera (hardware stop & re-acquire to turn laptop camera light OFF)
  const toggleCamera = useCallback(async () => {
    if (cameraOn) {
      // Turn off: stop video track to immediately release hardware and shut off camera light
      if (localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.stop();
          localStreamRef.current.removeTrack(videoTrack);
        }
      }
      setCameraOn(false);

      // Replace track on peer connections with null
      activeCallsRef.current.forEach((call) => {
        const sender = call.peerConnection?.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          try {
            sender.replaceTrack(null as any);
          } catch (e) {
            console.warn(e);
          }
        }
      });

      broadcast({
        type: "state-update",
        peerId: localPeerId,
        micOn,
        cameraOn: false,
      });
    } else {
      // Turn on: re-acquire camera video track
      try {
        const { getLocalMediaStream } = await import("@/lib/media");
        const freshStream = await getLocalMediaStream({ video: true, audio: false });
        const newTrack = freshStream.getVideoTracks()[0];
        if (newTrack && localStreamRef.current) {
          localStreamRef.current.addTrack(newTrack);
          setCameraOn(true);

          activeCallsRef.current.forEach((call) => {
            const sender = call.peerConnection?.getSenders().find((s) => s.track?.kind === "video");
            if (sender) {
              sender.replaceTrack(newTrack);
            }
          });

          broadcast({
            type: "state-update",
            peerId: localPeerId,
            micOn,
            cameraOn: true,
          });
        }
      } catch (err) {
        console.warn("Could not re-enable camera:", err);
        if (onNotice) onNotice("Could not access camera.");
      }
    }
  }, [cameraOn, micOn, localPeerId, broadcast, onNotice]);

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
