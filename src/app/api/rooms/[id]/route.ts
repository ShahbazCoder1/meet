import { NextRequest, NextResponse } from "next/server";

interface PeerInfo {
  peerId: string;
  name: string;
  lastSeen: number;
  isHost?: boolean;
}

interface RoomData {
  id: string;
  pin?: string;
  createdAt: number;
  peers: Map<string, PeerInfo>;
}

// Global in-memory storage for room metadata across active invocations
declare global {
  // eslint-disable-next-line no-var
  var __MEET_ROOMS__: Map<string, RoomData> | undefined;
}

if (!globalThis.__MEET_ROOMS__) {
  globalThis.__MEET_ROOMS__ = new Map<string, RoomData>();
}

const rooms = globalThis.__MEET_ROOMS__;

function cleanStalePeers(room: RoomData) {
  const now = Date.now();
  for (const [peerId, peer] of room.peers.entries()) {
    // If peer hasn't sent heartbeat in 40 seconds, remove them
    if (now - peer.lastSeen > 40000) {
      room.peers.delete(peerId);
    }
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const room = rooms.get(id);

  if (!room) {
    return NextResponse.json({
      exists: false,
      hasPin: false,
      peerCount: 0,
    });
  }

  cleanStalePeers(room);

  return NextResponse.json({
    exists: true,
    hasPin: Boolean(room.pin),
    peerCount: room.peers.size,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { action, peerId, name, pin, isHost } = body;

  let room = rooms.get(id);

  if (!room) {
    room = {
      id,
      pin: pin ? String(pin).trim() : undefined,
      createdAt: Date.now(),
      peers: new Map<string, PeerInfo>(),
    };
    rooms.set(id, room);
  }

  cleanStalePeers(room);

  if (action === "join") {
    // Validate PIN if the room has one set
    if (room.pin && room.pin !== String(pin || "").trim()) {
      return NextResponse.json(
        { ok: false, error: "Invalid meeting PIN. Please check with the host." },
        { status: 403 }
      );
    }

    if (!peerId) {
      return NextResponse.json({ ok: false, error: "Missing peerId" }, { status: 400 });
    }

    // Register current peer
    room.peers.set(peerId, {
      peerId,
      name: name || "Guest",
      lastSeen: Date.now(),
      isHost: Boolean(isHost),
    });

    // Return other active peers to call
    const activePeers = Array.from(room.peers.values())
      .filter((p) => p.peerId !== peerId)
      .map((p) => ({ peerId: p.peerId, name: p.name, isHost: p.isHost }));

    return NextResponse.json({
      ok: true,
      hasPin: Boolean(room.pin),
      peers: activePeers,
    });
  }

  if (action === "set-pin") {
    room.pin = pin ? String(pin).trim() : undefined;
    return NextResponse.json({ ok: true, hasPin: Boolean(room.pin) });
  }

  if (action === "heartbeat") {
    if (peerId && room.peers.has(peerId)) {
      const peer = room.peers.get(peerId)!;
      peer.lastSeen = Date.now();
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "leave") {
    if (peerId) {
      room.peers.delete(peerId);
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
}
