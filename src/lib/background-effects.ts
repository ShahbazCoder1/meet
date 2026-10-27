import {
  FilesetResolver,
  ImageSegmenter,
  type ImageSegmenterResult,
  type MPMask,
} from "@mediapipe/tasks-vision";

export type BackgroundMode = "none" | "warm" | "blur" | "green-screen";

let segmenterPromise: Promise<ImageSegmenter> | null = null;

function getSegmenter() {
  segmenterPromise ??= FilesetResolver.forVisionTasks("/mediapipe/wasm")
    .then(async (fileset) => {
      const options = {
        runningMode: "VIDEO" as const,
        outputConfidenceMasks: true,
        outputCategoryMask: false,
      };
      try {
        return await ImageSegmenter.createFromOptions(fileset, {
          ...options,
          baseOptions: {
            modelAssetPath: "/mediapipe/selfie_segmenter.tflite",
            delegate: "GPU",
          },
        });
      } catch (gpuError) {
        console.warn("GPU background segmentation is unavailable; using CPU.", gpuError);
        return ImageSegmenter.createFromOptions(fileset, {
          ...options,
          baseOptions: {
            modelAssetPath: "/mediapipe/selfie_segmenter.tflite",
            delegate: "CPU",
          },
        });
      }
    })
    .catch((error) => {
      segmenterPromise = null;
      throw error;
    });

  return segmenterPromise;
}

export class BackgroundProcessor {
  private readonly video = document.createElement("video");
  private readonly outputCanvas = document.createElement("canvas");
  private readonly personCanvas = document.createElement("canvas");
  private readonly maskCanvas = document.createElement("canvas");
  private outputTrack: MediaStreamTrack | null = null;
  private frameRequest = 0;
  private stopped = false;
  private segmenting = false;
  private lastVideoTime = -1;
  private maskImageData: ImageData | null = null;
  private mode: BackgroundMode = "blur";

  setMode(mode: BackgroundMode) {
    this.mode = mode;
  }

  async start(rawTrack: MediaStreamTrack, mode: BackgroundMode) {
    this.mode = mode;
    const segmenter = await getSegmenter();
    if (this.stopped) throw new Error("Background processing was cancelled.");

    this.video.muted = true;
    this.video.playsInline = true;
    this.video.srcObject = new MediaStream([rawTrack]);
    await this.video.play();
    if (this.video.videoWidth === 0 || this.video.videoHeight === 0) {
      await new Promise<void>((resolve, reject) => {
        const onLoaded = () => {
          cleanup();
          resolve();
        };
        const onError = () => {
          cleanup();
          reject(new Error("Could not load camera frames for background processing."));
        };
        const cleanup = () => {
          this.video.removeEventListener("loadeddata", onLoaded);
          this.video.removeEventListener("error", onError);
        };
        this.video.addEventListener("loadeddata", onLoaded, { once: true });
        this.video.addEventListener("error", onError, { once: true });
      });
    }
    if (this.stopped) throw new Error("Background processing was cancelled.");

    const width = this.video.videoWidth || 960;
    const height = this.video.videoHeight || 540;
    this.outputCanvas.width = this.personCanvas.width = width;
    this.outputCanvas.height = this.personCanvas.height = height;
    this.outputTrack = this.outputCanvas.captureStream(24).getVideoTracks()[0] ?? null;
    if (!this.outputTrack) throw new Error("Could not create a processed camera track.");

    const processFrame = () => {
      if (this.stopped) return;
      if (
        this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        this.video.currentTime !== this.lastVideoTime &&
        !this.segmenting
      ) {
        this.lastVideoTime = this.video.currentTime;
        this.segmenting = true;
        try {
          segmenter.segmentForVideo(this.video, performance.now(), (result) => {
            try {
              const mask = result.confidenceMasks?.[0];
              if (mask && !this.stopped) this.compose(result, mask, width, height);
            } finally {
              result.close();
              this.segmenting = false;
            }
          });
        } catch (error) {
          this.segmenting = false;
          console.warn("Could not segment a camera frame:", error);
        }
      }
      this.frameRequest = requestAnimationFrame(processFrame);
    };

    processFrame();
    return this.outputTrack;
  }

  private compose(result: ImageSegmenterResult, mask: MPMask, width: number, height: number) {
    const maskWidth = mask.width;
    const maskHeight = mask.height;
    if (
      !this.maskImageData ||
      this.maskImageData.width !== maskWidth ||
      this.maskImageData.height !== maskHeight
    ) {
      this.maskCanvas.width = maskWidth;
      this.maskCanvas.height = maskHeight;
      this.maskImageData = new ImageData(maskWidth, maskHeight);
    }

    const confidence = mask.getAsFloat32Array();
    const pixels = this.maskImageData.data;
    for (let index = 0; index < confidence.length; index += 1) {
      pixels[index * 4] = 255;
      pixels[index * 4 + 1] = 255;
      pixels[index * 4 + 2] = 255;
      pixels[index * 4 + 3] = Math.round(Math.max(0, Math.min(1, confidence[index])) * 255);
    }
    this.maskCanvas.getContext("2d")?.putImageData(this.maskImageData, 0, 0);

    const personContext = this.personCanvas.getContext("2d");
    const outputContext = this.outputCanvas.getContext("2d");
    if (!personContext || !outputContext) return;

    personContext.globalCompositeOperation = "copy";
    personContext.filter = "none";
    personContext.drawImage(this.video, 0, 0, width, height);
    personContext.globalCompositeOperation = "destination-in";
    personContext.filter = "blur(2px)";
    personContext.drawImage(this.maskCanvas, 0, 0, width, height);
    personContext.filter = "none";

    outputContext.globalCompositeOperation = "source-over";
    outputContext.filter = "none";
    if (this.mode === "blur") {
      outputContext.filter = "blur(14px)";
      outputContext.drawImage(this.video, -16, -16, width + 32, height + 32);
      outputContext.filter = "none";
    } else {
      const gradient = outputContext.createLinearGradient(0, 0, width, height);
      const colors = this.mode === "green-screen" ? ["#37a66d", "#147b56"] : ["#b98a6a", "#4a3329"];
      gradient.addColorStop(0, colors[0]);
      gradient.addColorStop(1, colors[1]);
      outputContext.fillStyle = gradient;
      outputContext.fillRect(0, 0, width, height);
    }
    outputContext.drawImage(this.personCanvas, 0, 0);
  }

  stop() {
    if (this.stopped) return;
    this.stopped = true;
    cancelAnimationFrame(this.frameRequest);
    this.outputTrack?.stop();
    this.video.pause();
    this.video.srcObject = null;
  }
}
