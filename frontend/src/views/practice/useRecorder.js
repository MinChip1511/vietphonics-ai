import { useCallback, useEffect, useRef, useState } from "react";
import { playSoundEffect } from "../../services/audioService";
import { convertBlobTo16kHzMonoWav } from "../../services/audioResampler";

const MAX_SECONDS = 6;
const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac", "audio/ogg;codecs=opus", "audio/wav"];

function pickMimeType() {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return "";
  return MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t)) || "";
}

// Auto-gain and noise suppression are off so the server can tell silence and background noise from
// speech by level (backend/app/audio_quality.py); with them on, the browser lifts a silent room to speech level.
export const RECORD_CONSTRAINTS = { echoCancellation: true, noiseSuppression: false, autoGainControl: false };

// Maps getUserMedia failures onto the Figma error screens (12 microphone-permission, 13 recording-errors).
export function classifyMicError(err) {
  const name = err?.name || "";
  if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError") return "permission";
  if (name === "NotFoundError" || name === "NotReadableError" || name === "OverconstrainedError" || name === "DevicesNotFoundError") return "device";
  return "failed";
}

// Anything smaller than this is not a real recording (a WAV header alone is 44 bytes).
const MIN_RECORDING_BYTES = 1000;

/**
 * Records up to MAX_SECONDS of audio and hands a 16 kHz mono WAV blob to onComplete.
 * It never fakes a recording: if the browser cannot record (no API, e.g. an http:// LAN
 * address or an embedded preview), the mic fails, or nothing was captured, `error` is set
 * and onComplete is not called.
 */
export default function useRecorder(onComplete) {
  const [status, setStatus] = useState("idle"); // idle | requesting | recording | finishing (WAV conversion)
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState(null); // null | permission | device | unsupported | failed | empty
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  // Bumped on every start/reset so a late onstop from an older recording is ignored.
  const sessionRef = useRef(0);
  onCompleteRef.current = onComplete;

  const releaseStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const reset = useCallback(() => {
    sessionRef.current += 1;
    clearTimer();
    const rec = recorderRef.current;
    if (rec) {
      rec.onstop = null;
      rec.ondataavailable = null;
      if (rec.state === "recording") rec.stop();
    }
    recorderRef.current = null;
    releaseStream();
    chunksRef.current = [];
    setStatus("idle");
    setSeconds(0);
  }, []);

  useEffect(() => reset, [reset]);

  const stop = useCallback(() => {
    clearTimer();
    const rec = recorderRef.current;
    if (rec && rec.state === "recording") {
      playSoundEffect("click");
      rec.stop();
    }
  }, []);

  const startTimer = (onLimit) => {
    setSeconds(0);
    timerRef.current = setInterval(() => {
      setSeconds((prev) => {
        if (prev + 1 >= MAX_SECONDS) onLimit();
        return Math.min(prev + 1, MAX_SECONDS);
      });
    }, 1000);
  };

  const start = useCallback(async () => {
    reset();
    setError(null);
    playSoundEffect("record_start");

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("unsupported");
      return;
    }

    setStatus("requesting");
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: RECORD_CONSTRAINTS });
    } catch (err) {
      console.warn("Microphone error:", err);
      setStatus("idle");
      setError(classifyMicError(err));
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];
    const mimeType = pickMimeType();
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data?.size > 0) chunksRef.current.push(e.data);
    };
    const session = sessionRef.current;
    recorder.onstop = async () => {
      releaseStream();
      const raw = new Blob(chunksRef.current, { type: mimeType || chunksRef.current[0]?.type || "audio/webm" });
      if (raw.size < MIN_RECORDING_BYTES) {
        setStatus("idle");
        setError("empty");
        return;
      }
      // Stay out of "idle" while converting, so the UI never offers the mic button mid-conversion.
      setStatus("finishing");
      let wav = raw;
      try {
        wav = await convertBlobTo16kHzMonoWav(raw);
      } catch (err) {
        console.warn("Resampling error, using raw blob:", err);
      }
      if (session !== sessionRef.current) return; // superseded by reset/new recording
      onCompleteRef.current?.(wav);
      setStatus("idle");
    };

    recorder.start(100);
    setStatus("recording");
    startTimer(() => setTimeout(stop, 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reset, stop]);

  return { status, seconds, error, start, stop, reset, clearError: () => setError(null), maxSeconds: MAX_SECONDS };
}
