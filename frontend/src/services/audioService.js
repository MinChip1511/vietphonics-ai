// Web Audio and Text-to-Speech service for VietPhonics AI

// Sample audio: pre-generated clips (scripts/generate_audio.py, voice "Linh") in /audio, found through
// /audio/manifest.json. A text without a clip falls back to the browser's own speech, but only with a real
// Vietnamese voice: without one the browser would read Vietnamese with its default (often English) voice.
const AUDIO_BASE = "/audio";
const SLOW_RATE = 0.7; // the app asks for rate <= 0.7 when it wants the slow version

// Must stay identical to normalize() in scripts/generate_audio.py.
export const normalizeSpeech = (text) =>
  String(text ?? "").normalize("NFC").toLowerCase().replace(/[“”"'.!?;:…]/g, "").replace(/\s+/g, " ").trim();

let manifestPromise = null;
const loadManifest = () => {
  manifestPromise ||= fetch(`${AUDIO_BASE}/manifest.json`)
    .then((res) => (res.ok ? res.json() : { clips: {} }))
    .catch(() => ({ clips: {} }));
  return manifestPromise;
};
loadManifest(); // start fetching as soon as the app loads

let playId = 0; // each call gets a number; starting a new one (or stopSpeaking) cancels the older one
let currentAudio = null;

export const stopSpeaking = () => {
  playId += 1;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  window.speechSynthesis?.cancel();
};

// Resolves when the clip has finished (or failed to play).
const playClip = (url) =>
  new Promise((resolve) => {
    const audio = new Audio(url);
    currentAudio = audio;
    audio.addEventListener("ended", () => resolve(), { once: true });
    audio.addEventListener("error", () => resolve(), { once: true });
    audio.play().catch(() => resolve());
  });

// URLs of the clips for `text` (a text with ", " may be a list whose items all have clips), or null.
async function clipUrls(text, slow) {
  const { clips } = await loadManifest();
  const suffix = slow ? "-slow" : "";
  const whole = clips[normalizeSpeech(text)];
  if (whole) return [`${AUDIO_BASE}/${whole}${suffix}.m4a`];
  const parts = String(text).split(",").map(normalizeSpeech).filter(Boolean);
  if (parts.length > 1 && parts.every((part) => clips[part])) return parts.map((part) => `${AUDIO_BASE}/${clips[part]}${suffix}.m4a`);
  return null;
}

// getVoices() is empty until the browser has loaded them: wait for it (at most 1.5 s).
const loadVoices = () =>
  new Promise((resolve) => {
    const synth = window.speechSynthesis;
    if (synth.getVoices().length) return resolve(synth.getVoices());
    const done = () => resolve(synth.getVoices());
    synth.addEventListener("voiceschanged", done, { once: true });
    window.setTimeout(done, 1500);
  });

async function speakWithBrowser(text, rate, id) {
  if (!("speechSynthesis" in window)) return;
  const voices = (await loadVoices()).filter((v) => v.lang.toLowerCase().startsWith("vi"));
  if (id !== playId) return;
  if (voices.length === 0) {
    console.warn("Máy này chưa có giọng đọc tiếng Việt nên không đọc được:", text);
    return;
  }
  // Prefer the macOS "Linh" voice, then Google's, then any Vietnamese voice.
  const voice = voices.find((v) => /linh/i.test(v.name)) || voices.find((v) => /google/i.test(v.name)) || voices[0];
  await new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = rate;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

export const speakVietnamese = async (text, rate = 0.85) => {
  stopSpeaking();
  const id = playId;
  const urls = await clipUrls(text, rate <= SLOW_RATE);
  if (id !== playId) return;
  if (urls) {
    for (const url of urls) {
      if (id !== playId) return;
      await playClip(url);
    }
    return;
  }
  await speakWithBrowser(text, rate, id);
};

// Play nice sound effects for kid celebration or clicks
export const playSoundEffect = (type) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === "success") {
      // Little upbeat chord: C5 -> E5 -> G5 -> C6
      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.1);
      osc.frequency.setValueAtTime(783.99, now + 0.2);
      osc.frequency.setValueAtTime(1046.50, now + 0.3);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
    } else if (type === "click") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === "record_start") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    }
  } catch {
    // AudioContext blocked before user gesture or unavailable
  }
};
