// Captures lightweight JPEG stills from a playable video entirely in the
// browser, so the AI can "watch" a video without uploading gigabytes anywhere.

/** Fast metadata probe (no seeking): duration in seconds plus dimensions. */
export async function probeVideoMeta(
  url: string,
): Promise<{ duration: number; width: number; height: number }> {
  const video = document.createElement("video");
  video.muted = true;
  video.preload = "metadata";
  video.crossOrigin = "anonymous";
  try {
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Video metadata timed out.")), 15000);
      video.onloadedmetadata = () => {
        clearTimeout(timer);
        resolve();
      };
      video.onerror = () => {
        clearTimeout(timer);
        reject(new Error("Could not read this video."));
      };
    });
    return {
      duration: Number.isFinite(video.duration) ? video.duration : 0,
      width: video.videoWidth || 0,
      height: video.videoHeight || 0,
    };
  } finally {
    video.removeAttribute("src");
    video.load();
  }
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      video.onseeked = null;
      reject(new Error("Seeking timed out."));
    }, 8000);
    video.onseeked = () => {
      clearTimeout(timer);
      video.onseeked = null;
      resolve();
    };
    video.currentTime = Math.min(Math.max(time, 0), Math.max((video.duration || 1) - 0.1, 0));
  });
}

/** Capture `count` evenly spaced JPEG data URLs (≤ maxWidth px) from a video URL. */
export async function captureVideoFrames(
  url: string,
  count = 6,
  maxWidth = 560,
): Promise<string[]> {
  const video = document.createElement("video");
  video.muted = true;
  (video as HTMLVideoElement & { playsInline: boolean }).playsInline = true;
  video.preload = "auto";
  video.crossOrigin = "anonymous";

  try {
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("This video took too long to load.")), 30000);
      video.onloadedmetadata = () => {
        clearTimeout(timer);
        resolve();
      };
      video.onerror = () => {
        clearTimeout(timer);
        reject(new Error("Could not load this video for analysis."));
      };
    });

    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
    const canvas = document.createElement("canvas");
    const frames: string[] = [];
    for (let k = 1; k <= count; k++) {
      try {
        await seekTo(video, duration ? (duration * k) / (count + 1) : 0);
        const scale = Math.min(1, maxWidth / (video.videoWidth || maxWidth));
        canvas.width = Math.max(2, Math.round((video.videoWidth || 320) * scale));
        canvas.height = Math.max(2, Math.round((video.videoHeight || 240) * scale));
        canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push(canvas.toDataURL("image/jpeg", 0.72));
      } catch {
        // Skip frames that fail to seek; keep whatever we captured.
      }
    }
    if (!frames.length) throw new Error("Could not read any frames from this video.");
    return frames;
  } finally {
    video.removeAttribute("src");
    video.load();
  }
}
