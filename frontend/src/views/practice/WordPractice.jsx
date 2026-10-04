import React, { useState } from "react";
import { Volume2, ArrowRight, ChevronRight, Mic, Square, Loader, ChevronLeft } from "lucide-react";
import MascotBubble from "../../components/MascotBubble";
import { speakVietnamese, playSoundEffect } from "../../services/audioService";
import { submitAudioAnalysis } from "../../services/apiService";
import useRecorder from "./useRecorder";
import { MicPermissionScreen, RecordingErrorsScreen } from "./MicScreens";

// Figma child screens 04 lesson-introduction (7:208), 05 listen-example (7:250),
// 06 recording-ready (7:293), 07 recording-active (7:332), 08 ai-processing (7:375).
function Waveform() {
  return (
    <div className="flex items-center gap-1.5 h-12" aria-hidden="true">
      {[0.35, 0.6, 1, 0.75, 0.5, 0.25].map((h, i) => (
        <span
          key={i}
          className="w-1.5 rounded-full bg-vp-blue animate-[wave-bar_0.9s_ease-in-out_infinite]"
          style={{ height: `${h * 100}%`, animationDelay: `${i * 0.12}s` }}
        />
      ))}
    </div>
  );
}

function focusSyllable(word) {
  const parts = word.split(" ");
  return parts[parts.length - 1];
}

export default function WordPractice({ lesson, aiEnabled = true, onFinishExercise }) {
  const words = lesson?.words || [];
  const [index, setIndex] = useState(0);
  const [step, setPhase] = useState("intro");
  const [rate, setRate] = useState(0.85);
  // A recording that was not scored (silence, noise, another word) or could not be analysed.
  const [notice, setNotice] = useState(null);
  const word = words[index];

  const analyze = async (blob) => {
    setPhase("processing");
    setNotice(null);
    let result;
    try {
      result = await submitAudioAnalysis(blob, word.canonical, word.word);
    } catch (err) {
      console.warn("Chấm điểm thất bại:", err);
      setNotice({ tone: "error", headline: "Cá Xanh chưa chấm được lần này", instruction: "Con thử đọc lại một lần nữa nhé. Nếu vẫn vậy, nhờ ba mẹ kiểm tra kết nối." });
      setPhase("ready");
      return;
    }
    if (result.scored === false) {
      setNotice({ tone: result.result_type, ...result.message, heard: result.asr_transcript });
      setPhase("ready");
      return;
    }
    onFinishExercise({
      word,
      result,
      recording: blob,
      onNextWord: () => {
        setIndex((i) => (i + 1) % words.length);
        setPhase("listen");
      },
      onRetry: () => setPhase("ready")
    });
  };

  const recorder = useRecorder(analyze);
  // While the recorder is live the screen is recording-active; while it converts the audio it is already processing.
  const phase = recorder.status === "recording" ? "recording" : recorder.status === "finishing" ? "processing" : step;

  if (!word) {
    return <p className="text-vp-muted">Bài học này chưa có từ vựng để luyện.</p>;
  }

  if (recorder.error === "permission") {
    return <MicPermissionScreen onRetry={() => { recorder.clearError(); recorder.start(); }} />;
  }
  if (recorder.error) {
    return <RecordingErrorsScreen active={recorder.error} onRescan={() => { recorder.clearError(); setPhase("ready"); }} />;
  }

  const listen = (text) => {
    playSoundEffect("click");
    speakVietnamese(text, rate);
  };

  const guide = lesson.mouthGuide || {};
  const introLetter = (lesson.targetPhonemes?.[0] || word.phoneme || "a").replace(/[^A-Za-zÀ-ỹ]/g, "").toLowerCase() || "a";
  const introTitle = guide.title || word.phonemeName;
  const introMessage = `Chào mừng bé đến với ${lesson.title.replace(/^Bài \d+: /, "bài ")}! Bé hãy nghe cách đọc và một số từ mẫu trước nha.`;

  const mascotMessage = {
    intro: introMessage,
    listen: `Hãy nghe Cá Xanh đọc thật to từ '${word.word}' này nha bé yêu!`,
    ready: "Giờ bé hãy bấm chiếc micrô màu xanh dưới đây và đọc to từ này nhé!",
    recording: `Đang nghe bé nói... Hãy đọc rõ âm tiết chữ '${focusSyllable(word.word)}' nha!`,
    processing: "Chờ tớ tí tẹo nhé bé yêu ơi! Cá Xanh đang lắng nghe rất kỹ phát âm của con..."
  }[phase];

  return (
    <div className="flex flex-col items-center gap-8" data-testid={`practice-phase-${phase}`}>
      <div className="w-full">
        <MascotBubble message={mascotMessage} listenLabel="Nghe Cá Xanh đọc mẫu trước nha" />
      </div>

      {phase !== "intro" && (
        <div className="flex items-center gap-3 text-sm font-semibold text-vp-muted">
          <button
            aria-label="Từ trước"
            disabled={index === 0 || phase === "recording" || phase === "processing"}
            onClick={() => { setIndex(index - 1); setPhase("listen"); }}
            className="w-8 h-8 grid place-items-center rounded-full bg-white border border-vp-border disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>Từ {index + 1} / {words.length}</span>
          <button
            aria-label="Từ sau"
            disabled={index === words.length - 1 || phase === "recording" || phase === "processing"}
            onClick={() => { setIndex(index + 1); setPhase("listen"); }}
            className="w-8 h-8 grid place-items-center rounded-full bg-white border border-vp-border disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {phase === "intro" && (
        <>
          <div className="w-full max-w-[480px] rounded-[28px] border-2 border-vp-sky bg-white p-8 sm:p-10 flex flex-col items-center gap-6 shadow-[0_8px_12px_rgba(30,27,75,0.04)]">
            <div className="w-40 h-40 rounded-full bg-vp-sky grid place-items-center">
              <span className="font-heading text-8xl font-extrabold text-vp-blue leading-none">{introLetter}</span>
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <p className="font-heading text-[28px] font-extrabold text-vp-ink leading-tight">{introTitle}</p>
              <p className="text-base text-vp-muted">{guide.tip || word.guide}</p>
            </div>
            <button
              onClick={() => listen((lesson.warmup || [word.word]).join(", "))}
              className="flex items-center gap-2.5 rounded-[20px] bg-vp-sky px-6 py-3 text-[15px] font-bold text-vp-blue hover:brightness-95"
            >
              <Volume2 className="w-5 h-5" /> Nghe âm mẫu chuẩn
            </button>
          </div>
          <button
            id="btn-start-practice"
            onClick={() => { playSoundEffect("click"); setPhase("listen"); }}
            className="w-full max-w-[400px] flex items-center justify-center gap-2 rounded-3xl bg-vp-blue px-12 py-[18px] font-heading text-xl font-extrabold text-white hover:brightness-110"
          >
            Bắt đầu luyện tập <ArrowRight className="w-5 h-5" />
          </button>
        </>
      )}

      {phase === "listen" && (
        <>
          <div className="w-full max-w-[500px] rounded-3xl border-2 border-vp-sky bg-white p-6 flex flex-col items-center gap-4 shadow-[0_8px_12px_rgba(30,27,75,0.04)]">
            <div className="w-full h-[200px] rounded-2xl bg-vp-sky grid place-items-center">
              <span className="text-8xl" aria-hidden="true">{word.illustration}</span>
            </div>
            <p className="text-xs font-bold uppercase text-vp-blue mt-2">Từ khóa bài học</p>
            <p className="font-heading text-[40px] font-extrabold text-vp-ink leading-tight text-center">{word.word}</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => listen(word.word)}
                className="flex items-center gap-2.5 rounded-[20px] bg-vp-blue px-6 py-3 text-base font-bold text-white hover:brightness-110"
              >
                <Volume2 className="w-5 h-5" /> Nhấn để Nghe Lại
              </button>
              <button
                onClick={() => setRate(rate === 0.85 ? 0.6 : 0.85)}
                className="rounded-[20px] bg-vp-sky px-4 py-3 text-sm font-bold text-vp-blue"
              >
                Tốc độ {rate === 0.85 ? "1x" : "0.75x"}
              </button>
            </div>
            <p className="text-sm text-vp-muted text-center">{word.mouthTip}</p>
          </div>
          <button
            onClick={() => { playSoundEffect("click"); setPhase("ready"); }}
            className="w-full max-w-[400px] flex items-center justify-center gap-2 rounded-3xl bg-emerald-500 px-12 py-[18px] font-heading text-xl font-extrabold text-white hover:bg-emerald-600"
          >
            Con đã sẵn sàng đọc <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {phase === "ready" && (
        <>
          <div className="w-full max-w-[500px] rounded-3xl border-[1.5px] border-vp-sky bg-white p-8 flex flex-col items-center gap-3">
            <p className="text-base font-semibold text-vp-muted">BÉ HÃY ĐỌC TO:</p>
            <p className="font-heading text-5xl font-extrabold text-vp-ink text-center">{word.word}</p>
          </div>
          {notice && (
            <div data-testid={`practice-notice-${notice.tone}`} role="alert" className="w-full max-w-[500px] rounded-3xl bg-amber-50 border-2 border-amber-300 px-6 py-4 text-center">
              <p className="font-heading text-lg font-extrabold text-amber-700">{notice.headline}</p>
              <p className="text-sm text-amber-700">{notice.instruction}</p>
              {notice.heard && <p className="mt-1 text-xs text-vp-muted">Cá Xanh nghe được: “{notice.heard}”</p>}
            </div>
          )}
          {!aiEnabled && (
            <p data-testid="ai-disabled" className="max-w-[500px] rounded-2xl bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-700">
              Phụ huynh đang tắt quyền phân tích giọng nói bằng AI. Bé vẫn có thể nghe mẫu và luyện đọc theo, nhưng chưa được chấm điểm.
            </p>
          )}
          <div className="flex flex-col items-center gap-4">
            <button
              id="btn-start-recording"
              onClick={() => { setNotice(null); recorder.start(); }}
              disabled={!aiEnabled || recorder.status === "requesting"}
              aria-label="Bắt đầu thu âm"
              className="w-[140px] h-[140px] rounded-full bg-vp-blue grid place-items-center text-white shadow-[0_8px_12px_rgba(255,122,0,0.25)] hover:brightness-110 disabled:opacity-60"
            >
              {recorder.status === "requesting" ? <Loader className="w-12 h-12 animate-spin" /> : <Mic className="w-16 h-16" strokeWidth={1.5} />}
            </button>
            <p className="font-heading text-[22px] font-extrabold text-vp-blue">Chạm một chạm để nói</p>
          </div>
          <p className="flex items-center gap-2 text-sm text-vp-muted">
            <span className="w-3 h-3 rounded-full bg-emerald-500" /> Hệ thống nghe thông minh sẵn sàng
          </p>
        </>
      )}

      {phase === "recording" && (
        <>
          <div className="w-full max-w-[500px] rounded-3xl border-[1.5px] border-vp-blue bg-white p-8 grid place-items-center">
            <p className="font-heading text-5xl font-extrabold text-vp-blue text-center">{word.word}</p>
          </div>
          <div className="relative grid place-items-center">
            <span className="absolute w-36 h-36 rounded-full bg-vp-sky animate-pulse-ring" />
            <button
              id="btn-stop-recording"
              onClick={recorder.stop}
              aria-label="Dừng thu âm"
              className="relative w-[116px] h-[116px] rounded-full bg-vp-blue ring-8 ring-vp-sky grid place-items-center text-white"
            >
              <span className="w-12 h-12 rounded-full border-2 border-white grid place-items-center">
                <Square className="w-4 h-4" />
              </span>
            </button>
          </div>
          <Waveform />
          <p className="text-sm font-semibold text-vp-muted">{recorder.seconds}s / {recorder.maxSeconds}s</p>
          <button
            onClick={recorder.stop}
            className="rounded-[20px] bg-vp-sky px-9 py-3 text-base font-bold text-vp-blue"
          >
            Nhấn để hoàn thành ghi âm
          </button>
        </>
      )}

      {phase === "processing" && (
        <div data-testid="ai-processing" className="w-full max-w-[480px] rounded-3xl border border-vp-border bg-white p-10 flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-blue-50 grid place-items-center">
            <Loader className="w-10 h-10 text-vp-blue animate-spin" />
          </div>
          <p className="font-heading text-xl font-extrabold text-vp-ink">Đang phân tích âm thanh...</p>
          <p className="text-sm text-vp-muted">Học vần bằng trí tuệ nhân tạo mượt mà</p>
        </div>
      )}
    </div>
  );
}

