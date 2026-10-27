"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { BackgroundMode, BackgroundProcessor } from "./background-effects";

interface ProcessedTrack {
  source: MediaStreamTrack;
  track: MediaStreamTrack;
}

export function useBackgroundStream(
  rawStream: MediaStream | null,
  mode: BackgroundMode,
  onError?: () => void
) {
  const active = mode !== "none";
  const rawVideo = rawStream?.getVideoTracks().find((track) => track.readyState === "live") ?? null;
  const [processed, setProcessed] = useState<ProcessedTrack | null>(null);
  const processorRef = useRef<BackgroundProcessor | null>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    processorRef.current?.setMode(mode);
  }, [mode]);

  useEffect(() => {
    let cancelled = false;
    let processor: BackgroundProcessor | null = null;
    setProcessed(null);

    if (!active || !rawVideo) return;

    void import("./background-effects")
      .then(({ BackgroundProcessor }) => {
        if (cancelled) return null;
        processor = new BackgroundProcessor();
        processorRef.current = processor;
        return processor.start(rawVideo, modeRef.current).then((track) => {
          processor?.setMode(modeRef.current);
          return track;
        });
      })
      .then((track) => {
        if (!track) return;
        if (cancelled) {
          track.stop();
          return;
        }
        setProcessed({ source: rawVideo, track });
      })
      .catch((error: unknown) => {
        processor?.stop();
        if (!cancelled) {
          console.warn("Background effect failed:", error);
          onErrorRef.current?.();
        }
      });

    return () => {
      cancelled = true;
      processor?.stop();
      if (processorRef.current === processor) processorRef.current = null;
    };
  }, [rawVideo, active]);

  return useMemo(() => {
    if (!rawStream) return null;
    if (!active) return rawStream;

    const audioTracks = rawStream.getAudioTracks().filter((track) => track.readyState === "live");
    const processedVideo = processed?.source === rawVideo && processed.track.readyState === "live"
      ? [processed.track]
      : [];
    // While segmentation starts, never expose the unprocessed camera track.
    return new MediaStream([...audioTracks, ...processedVideo]);
  }, [rawStream, active, rawVideo, processed]);
}
