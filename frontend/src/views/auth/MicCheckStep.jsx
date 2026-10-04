import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Mic, CheckCircle2, AlertTriangle } from "lucide-react";
import { RECORD_CONSTRAINTS } from "../practice/useRecorder";

// Sign-up step 4: ask for the microphone, let the parent speak for a moment and show the level, with
// instructions when the permission is refused. Skipping is allowed (a laptop may have no microphone),
// but the practice screens repeat the permission and device checks.
const LISTEN_SECONDS = 4;
const HEARD_LEVEL = 0.03; // RMS of the signal (0..1) that counts as "a voice"

const STATES = {
  idle: { icon: Mic, tone: "text-vp-blue", title: "Bật micro để thử giọng", body: "Bấm nút bên dưới, cho phép trình duyệt dùng micro rồi nói “Xin chào Cá Xanh” trong vài giây." },
  listening: { icon: Mic, tone: "text-vp-blue", title: "Cá Xanh đang nghe…", body: "Ba mẹ hoặc bé hãy nói to, rõ ràng." },
  heard: { icon: CheckCircle2, tone: "text-emerald-600", title: "Micro hoạt động tốt!", body: "Cá Xanh đã nghe thấy giọng nói. Bé có thể bắt đầu học." },
  quiet: { icon: AlertTriangle, tone: "text-amber-600", title: "Cá Xanh chưa nghe thấy gì", body: "Hãy nói to hơn, đến gần micro hơn hoặc chọn đúng micro trong cài đặt của máy rồi thử lại." },
  denied: { icon: AlertTriangle, tone: "text-red-500", title: "Trình duyệt đang chặn micro", body: "Bấm biểu tượng ổ khóa cạnh thanh địa chỉ → Micro → Cho phép, rồi bấm “Thử lại”. Nếu vẫn không được, hãy tải lại trang." },
  missing: { icon: AlertTriangle, tone: "text-red-500", title: "Không tìm thấy micro", body: "Hãy cắm micro hoặc tai nghe có micro, kiểm tra không có ứng dụng khác đang dùng rồi bấm “Thử lại”." },
  unsupported: { icon: AlertTriangle, tone: "text-red-500", title: "Trình duyệt chưa hỗ trợ thu âm", body: "Hãy dùng Chrome, Edge, Safari hoặc Firefox bản mới và mở trang bằng địa chỉ https." }
};

export default function MicCheckStep({ error, onBack, onFinish }) {
  const [state, setState] = useState("idle");
  const [level, setLevel] = useState(0);
  const [seconds, setSeconds] = useState(LISTEN_SECONDS);
  const [busy, setBusy] = useState(false);
  const cleanup = useRef(() => {});

  useEffect(() => () => cleanup.current(), []);

  const start = useCallback(async () => {
    cleanup.current();
    if (!navigator.mediaDevices?.getUserMedia) return setState("unsupported");
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: RECORD_CONSTRAINTS });
    } catch (err) {
      const name = err?.name || "";
      return setState(name === "NotFoundError" || name === "OverconstrainedError" ? "missing" : "denied");
    }
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    audioContext.createMediaStreamSource(stream).connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    let peak = 0;
    let left = LISTEN_SECONDS;
    setState("listening");
    setSeconds(left);

    const tick = window.setInterval(() => {
      analyser.getFloatTimeDomainData(samples);
      const rms = Math.sqrt(samples.reduce((sum, v) => sum + v * v, 0) / samples.length);
      peak = Math.max(peak, rms);
      setLevel(Math.min(1, rms * 8));
    }, 80);
    const countdown = window.setInterval(() => {
      left -= 1;
      setSeconds(left);
      if (left <= 0) {
        finish();
        setState(peak >= HEARD_LEVEL ? "heard" : "quiet");
      }
    }, 1000);

    function finish() {
      window.clearInterval(tick);
      window.clearInterval(countdown);
      stream.getTracks().forEach((t) => t.stop());
      audioContext.close().catch(() => {});
      setLevel(0);
    }
    cleanup.current = finish;
  }, []);

  const done = async () => {
    setBusy(true);
    await onFinish();
    setBusy(false);
  };

  const { icon: Icon, tone, title, body } = STATES[state];
  const retry = state === "quiet" || state === "denied" || state === "missing";

  return (
    <div className="flex flex-col gap-5" data-testid="signup-step-4">
      <div>
        <h1 className="font-heading text-3xl font-extrabold uppercase text-vp-ink">Kiểm tra micro của bé</h1>
        <p className="text-sm text-vp-muted max-w-2xl">Bước cuối: thử micro ngay bây giờ để lúc học bé không bị gián đoạn. Giọng nói chỉ dùng để chấm điểm và không được lưu trên máy chủ.</p>
      </div>
      <div className="max-w-[640px] rounded-3xl bg-white p-6 sm:p-8 flex flex-col items-center gap-5 text-center shadow-[0_12px_32px_rgba(30,27,75,0.05)]">
        <span className={`w-20 h-20 rounded-full bg-vp-sky grid place-items-center ${tone}`}><Icon className="w-9 h-9" /></span>
        <div role="status" data-testid={`mic-state-${state}`}>
          <p className={`font-heading text-xl font-extrabold ${tone}`}>{title}</p>
          <p className="text-sm text-vp-muted mt-1">{body}</p>
        </div>
        {state === "listening" && (
          <div className="w-full flex flex-col gap-2">
            <div className="h-3 w-full rounded-full bg-[#EEF1FA] overflow-hidden"><div className="h-full rounded-full bg-vp-blue transition-[width] duration-100" style={{ width: `${Math.round(level * 100)}%` }} /></div>
            <p className="text-xs text-vp-muted">Còn {seconds} giây…</p>
          </div>
        )}
        {(state === "idle" || retry) && (
          <button data-testid="mic-start" type="button" onClick={start} className="h-12 rounded-full bg-vp-blue px-6 text-sm font-bold text-white">
            {retry ? "Thử lại" : "Bật micro & thử giọng"}
          </button>
        )}
        {error && <p className="w-full rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-500">{error}</p>}
      </div>
      <div className="flex flex-wrap justify-between gap-3 max-w-[640px]">
        <button type="button" onClick={onBack} className="h-12 rounded-full bg-[#EEF1FA] px-5 text-sm font-bold text-vp-ink flex items-center gap-2"><ArrowLeft className="w-4 h-4" /> Quay lại</button>
        <button data-testid="su-finish" type="button" disabled={busy || state === "listening"} onClick={done} className="h-12 rounded-full bg-vp-blue px-6 text-sm font-bold text-white disabled:opacity-60">
          {state === "heard" ? "Hoàn Tất & Vào Học Thử Miễn Phí 🚀" : "Bỏ qua, hoàn tất đăng ký"}
        </button>
      </div>
    </div>
  );
}
