// Real media stream utilities for camera, microphone, screen sharing, and audio metering.

export interface MediaDeviceOptions {
  audioDeviceId?: string;
  videoDeviceId?: string;
}

export interface AvailableDevices {
  audioInputs: MediaDeviceInfo[];
  videoInputs: MediaDeviceInfo[];
  audioOutputs: MediaDeviceInfo[];
}

/**
 * Request real user media stream with optional specific device IDs.
 */
export async function getLocalMediaStream(options: {
  audio?: boolean | { deviceId?: string };
  video?: boolean | { deviceId?: string };
} = { audio: true, video: true }): Promise<MediaStream> {
  if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("MediaDevices API is not available in this environment.");
  }

  const constraints: MediaStreamConstraints = {
    audio: options.audio
      ? typeof options.audio === "object" && options.audio.deviceId
        ? { deviceId: { exact: options.audio.deviceId }, echoCancellation: true, noiseSuppression: true }
        : { echoCancellation: true, noiseSuppression: true }
      : false,
    video: options.video
      ? typeof options.video === "object" && options.video.deviceId
        ? { deviceId: { exact: options.video.deviceId }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }
        : { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }
      : false,
  };

  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err: unknown) {
    // If exact device constraint fails, fallback to default devices
    console.warn("Failed to get media with exact constraints, trying defaults:", err);
    return await navigator.mediaDevices.getUserMedia({
      audio: Boolean(options.audio),
      video: Boolean(options.video),
    });
  }
}

/**
 * Enumerate all available audio and video devices.
 */
export async function getAvailableDevices(): Promise<AvailableDevices> {
  if (typeof window === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
    return { audioInputs: [], videoInputs: [], audioOutputs: [] };
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs: MediaDeviceInfo[] = [];
    const videoInputs: MediaDeviceInfo[] = [];
    const audioOutputs: MediaDeviceInfo[] = [];

    devices.forEach((device) => {
      if (device.kind === "audioinput") audioInputs.push(device);
      else if (device.kind === "videoinput") videoInputs.push(device);
      else if (device.kind === "audiooutput") audioOutputs.push(device);
    });

    return { audioInputs, videoInputs, audioOutputs };
  } catch (error) {
    console.error("Error enumerating devices:", error);
    return { audioInputs: [], videoInputs: [], audioOutputs: [] };
  }
}

/**
 * Request real screen share stream.
 */
export async function getScreenMediaStream(): Promise<MediaStream> {
  if (typeof window === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
    throw new Error("Screen sharing is not supported by your browser.");
  }

  return await navigator.mediaDevices.getDisplayMedia({
    video: {
      cursor: "always",
      displaySurface: "monitor",
    } as MediaTrackConstraints,
    audio: false,
  });
}

/**
 * Safely stop all tracks in a MediaStream.
 */
export function stopMediaStream(stream?: MediaStream | null) {
  if (!stream) return;
  try {
    stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch (e) {
        console.warn("Error stopping track:", e);
      }
    });
  } catch (error) {
    console.warn("Error stopping stream:", error);
  }
}

/**
 * Attach audio volume analyser to a stream to get real-time audio volume (0-100).
 */
export function createAudioLevelMeter(
  stream: MediaStream,
  onVolumeChange: (volume: number) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const audioTrack = stream.getAudioTracks()[0];
  if (!audioTrack) return () => {};

  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return () => {};

  let isDestroyed = false;
  let animationFrameId: number;
  let audioContext: AudioContext;

  try {
    audioContext = new AudioCtx();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.5;

    const source = audioContext.createMediaStreamSource(new MediaStream([audioTrack]));
    source.connect(analyser);

    const buffer = new Uint8Array(analyser.frequencyBinCount);

    const checkVolume = () => {
      if (isDestroyed) return;
      analyser.getByteFrequencyData(buffer);
      
      let sum = 0;
      for (let i = 0; i < buffer.length; i++) {
        sum += buffer[i];
      }
      const average = sum / buffer.length;
      // Normalise to 0-100 range with sensitivity boost
      const normalizedVolume = Math.min(100, Math.round((average / 128) * 100));
      onVolumeChange(normalizedVolume);

      animationFrameId = requestAnimationFrame(checkVolume);
    };

    animationFrameId = requestAnimationFrame(checkVolume);

    return () => {
      isDestroyed = true;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      try {
        source.disconnect();
        analyser.disconnect();
        if (audioContext.state !== "closed") {
          audioContext.close();
        }
      } catch (e) {
        console.warn("Error cleaning up audio analyser:", e);
      }
    };
  } catch (err) {
    console.warn("Could not initialise AudioContext level meter:", err);
    return () => {};
  }
}
