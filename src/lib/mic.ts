export function pickRecorderMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const options = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/aac",
    "audio/ogg;codecs=opus",
  ];
  return options.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
}

export function extForMime(mime: string): string {
  if (mime.includes("mp4") || mime.includes("aac")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("wav")) return "wav";
  return "webm";
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function micErrorMessage(err: unknown): string {
  const name =
    err && typeof err === "object" && "name" in err
      ? String((err as { name: string }).name)
      : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Microphone permission was denied. Allow it when the browser asks, or type your answers.";
  }
  if (name === "NotFoundError") {
    return "No microphone found. Type your answers.";
  }
  if (name === "NotReadableError") {
    return "Microphone is in use by another app. Type for now, or close the other app.";
  }
  if (name === "SecurityError") {
    return "This window blocked the microphone. Type your answers.";
  }
  return "Could not open the microphone. You can still type.";
}

export async function requestMic(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw Object.assign(new Error("Microphone is not available in this browser."), {
      name: "NotFoundError",
    });
  }
  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false,
  });
}

export type RecordHandle = {
  stop: () => void;
  cancel: () => void;
  promise: Promise<Blob | null>;
};

function rmsFrom(analyser: AnalyserNode, buffer: Uint8Array<ArrayBuffer>): number {
  analyser.getByteTimeDomainData(buffer);
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    const v = (buffer[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / buffer.length);
}

export function recordUtterance(
  stream: MediaStream,
  opts: {
    mime?: string;
    maxMs?: number;
    silenceMs?: number;
    onLevel?: (level: number) => void;
    signal?: AbortSignal;
  } = {},
): RecordHandle {
  const mime = opts.mime ?? "";
  const maxMs = opts.maxMs ?? 18000;
  const silenceMs = opts.silenceMs ?? 1400;
  const chunks: Blob[] = [];
  let rec: MediaRecorder | null = null;
  let drop = false;
  let settled = false;
  let poll: number | undefined;
  let cap: number | undefined;
  let ctx: AudioContext | null = null;

  let resolve!: (blob: Blob | null) => void;
  const promise = new Promise<Blob | null>((res) => {
    resolve = res;
  });

  const cleanup = () => {
    if (poll !== undefined) window.clearInterval(poll);
    if (cap !== undefined) window.clearTimeout(cap);
    opts.onLevel?.(0);
    if (ctx) {
      void ctx.close().catch(() => undefined);
      ctx = null;
    }
  };

  const settle = (blob: Blob | null) => {
    if (settled) return;
    settled = true;
    cleanup();
    resolve(blob);
  };

  const stopRec = () => {
    try {
      if (rec && rec.state !== "inactive") rec.stop();
      else settle(null);
    } catch {
      settle(null);
    }
  };

  const cancel = () => {
    drop = true;
    stopRec();
  };

  if (opts.signal) {
    if (opts.signal.aborted) {
      settle(null);
      return { stop: () => undefined, cancel: () => undefined, promise };
    }
    opts.signal.addEventListener("abort", cancel, { once: true });
  }

  try {
    rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
  } catch {
    settle(null);
    return { stop: () => undefined, cancel: () => undefined, promise };
  }

  rec.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) chunks.push(ev.data);
  };
  rec.onerror = () => stopRec();
  rec.onstop = () => {
    if (drop) {
      settle(null);
      return;
    }
    const type = rec?.mimeType || mime || "audio/webm";
    settle(chunks.length ? new Blob(chunks, { type }) : null);
  };

  try {
    rec.start(250);
  } catch {
    try {
      rec.start();
    } catch {
      settle(null);
      return { stop: () => undefined, cancel: () => undefined, promise };
    }
  }

  cap = window.setTimeout(stopRec, maxMs);

  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AC) {
      ctx = new AC();
      if (ctx.state === "suspended") void ctx.resume();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      const buffer = new Uint8Array(new ArrayBuffer(analyser.fftSize));
      let heard = false;
      let silentFor = 0;
      const tick = 80;
      poll = window.setInterval(() => {
        const level = rmsFrom(analyser, buffer);
        opts.onLevel?.(level);
        if (!heard) {
          if (level > 0.045) heard = true;
          return;
        }
        if (level < 0.02) silentFor += tick;
        else silentFor = 0;
        if (silentFor >= silenceMs) stopRec();
      }, tick);
    }
  } catch {
    /* VAD is optional — maxMs still ends the clip */
  }

  return { stop: stopRec, cancel, promise };
}
