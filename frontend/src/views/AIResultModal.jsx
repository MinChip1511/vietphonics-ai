import React, { useEffect, useMemo, useState } from "react";
import { Volume2, ChevronRight, ArrowRight, ChevronDown } from "lucide-react";
import ConfettiCelebration from "../components/ConfettiCelebration";
import MascotBubble from "../components/MascotBubble";
import { speakVietnamese, playSoundEffect } from "../services/audioService";

// Figma result screens: 09 result-good (7:406), 10 result-nearly-correct (7:559),
// 11 result-needs-practice (27:2468). Rendered in place of the practice screen.
// Parent "ngưỡng nhạy AI" (0-100, default 50) shifts both thresholds by up to ±10 points.
function getResultBand(score, sensitivity = 50) {
  const shift = Math.round((sensitivity - 50) / 5);
  if (score >= 85 + shift) return "good";
  if (score >= 60 + shift) return "nearly";
  return "needs";
}

const BANDS = {
  good: {
    label: "KẾT QUẢ CHÍNH XÁC",
    card: "bg-emerald-50 border-emerald-500 shadow-[0_12px_12px_rgba(16,185,129,0.11)]",
    accent: "text-emerald-500",
    mascot: "Oa! Bé phát âm siêu quá đi mất! Thật chuẩn giọng luôn.",
    hint: () => "Bé làm tốt lắm! Đúng hoàn toàn rồi.",
    cta: "Chuyển bài tiếp theo"
  },
  nearly: {
    label: "SẮP HOÀN THÀNH",
    card: "bg-amber-50 border-amber-400",
    accent: "text-amber-500",
    mascot: (focus) => `Ối, suýt chút nữa là chuẩn luôn rồi bé ơi! Bé thử điều chỉnh lại âm '${focus}' một xíu nhé!`,
    hint: (tip) => `Gợi ý: ${tip}`,
    cta: "Con muốn đọc lại"
  },
  needs: {
    label: "CẦN LUYỆN TẬP THÊM",
    card: "bg-red-50 border-red-400",
    accent: "text-red-500",
    mascot: (focus) => `Đừng buồn nhé bé yêu! Chúng ta cùng làm quen lại khẩu hình chữ '${focus}' để thử lại rinh cúp nhé.`,
    hint: (tip) => `Gợi ý: ${tip}`,
    cta: "Thử lại nhé!"
  }
};

const HIGHLIGHT_COLOR = { red: "text-red-500", amber: "text-amber-500", yellow: "text-amber-500" };

function HighlightedWord({ word, highlights, band }) {
  const segments = highlights?.length ? highlights : [{ text: word, color: "green" }];
  return (
    <p className="font-heading text-4xl sm:text-5xl font-extrabold text-center leading-tight">
      {band === "good" && <span className="text-vp-ink">"</span>}
      {segments.map((seg, i) => (
        <span key={i} className={`whitespace-pre ${HIGHLIGHT_COLOR[seg.color] || "text-vp-ink"}`}>{seg.text}</span>
      ))}
      {band === "good" && <span className="text-vp-ink">"</span>}
    </p>
  );
}

export default function AIResultModal({ isOpen, word, result, recording, awarded, sensitivity, onRetry, onNext }) {
  const [showDetails, setShowDetails] = useState(false);
  const score = Math.round(result?.score ?? 0);
  const band = getResultBand(score, sensitivity);
  const cfg = BANDS[band];
  const rows = useMemo(() => result?.elsa_rows || result?.alignment_details || [], [result]);
  const firstError = rows.find((r) => !(r.is_correct || r.status === "CORRECT"));
  // Speech-to-text heard something different from the target word (see backend verification.py).
  const heard = result?.asr_match === false && result?.asr_transcript ? result.asr_transcript : null;
  const badSegment = result?.letter_highlights?.find((s) => s.color === "red" || s.color === "amber" || s.color === "yellow");
  const focus = (badSegment?.text || word?.word?.split(" ").pop() || "").trim();
  const tip = firstError?.mouth_tip || word?.mouthTip || result?.feedback?.encouragement || "Bé đọc chậm và rõ từng âm nhé.";
  const hasRecording = Boolean(recording && recording.size >= 1000);

  useEffect(() => {
    if (isOpen && result) playSoundEffect(band === "good" ? "success" : "click");
  }, [isOpen, result, band]);

  if (!isOpen || !result || !word) return null;

  // Only ever plays the child's real recording; never substitutes the text-to-speech voice.
  // The object URL is created per click and revoked when playback finishes. (Creating it once and
  // revoking in an effect cleanup breaks under React StrictMode, which runs that cleanup on mount.)
  const playRecording = () => {
    if (!hasRecording) return;
    playSoundEffect("click");
    const url = URL.createObjectURL(recording);
    const audio = new Audio(url);
    const release = () => URL.revokeObjectURL(url);
    audio.addEventListener("ended", release, { once: true });
    audio.addEventListener("error", release, { once: true });
    audio.play().catch((err) => {
      release();
      console.warn("Không phát được bản ghi:", err);
    });
  };
  const playModel = (rate = 0.85) => {
    playSoundEffect("click");
    speakVietnamese(word.word, rate);
  };

  const mascotText = typeof cfg.mascot === "function" ? cfg.mascot(focus) : cfg.mascot;
  const primary = band === "good" ? onNext : onRetry;

  return (
    <div className="flex flex-col items-center gap-8" data-testid={`result-${band}`}>
      <ConfettiCelebration active={band === "good"} />
      <div className="w-full">
        <MascotBubble message={mascotText} listenLabel={band === "good" ? "Nghe Cá Xanh đọc mẫu trước nha" : "Nghe tớ đọc lại xem khác thế nào nha"} />
      </div>

      <div className={`w-full ${band === "good" ? "max-w-[500px]" : ""} rounded-[28px] border-[2.5px] p-6 sm:p-8 flex flex-col items-center gap-5 ${cfg.card}`}>
        <div className={`w-full flex items-center justify-between ${cfg.accent}`}>
          <span className="text-[13px] font-bold">{cfg.label}</span>
          <span data-testid="result-score" className="font-heading text-[32px] font-extrabold">{score}%</span>
        </div>
        <div className="flex flex-col items-center gap-2 py-4">
          <HighlightedWord word={word.word} highlights={result.letter_highlights} band={band} />
          <p className={`text-base font-bold text-center ${cfg.accent}`}>{cfg.hint(tip)}</p>
          {awarded > 0 && (
            <p data-testid="stars-awarded" className="text-sm font-bold text-emerald-600 text-center">Con nhận thêm +{awarded} điểm!</p>
          )}
          {awarded === 0 && (
            <p data-testid="stars-none" className="text-sm text-vp-muted text-center">Đạt từ 70 điểm là con nhận thêm điểm thưởng, mình thử lại nhé!</p>
          )}
          {result?.noise_warning && (
            <p data-testid="noise-warning" className="text-sm font-semibold text-amber-600 text-center">
              Xung quanh hơi ồn nên điểm có thể chưa đúng. Con thử đọc lại ở chỗ yên tĩnh hơn nhé.
            </p>
          )}
          {heard && (
            <p data-testid="asr-heard" className="text-sm text-vp-muted text-center">
              Cá Xanh nghe thấy: <b className="text-vp-ink">“{heard}”</b> — chưa giống từ “{word.word}”.
            </p>
          )}
        </div>
        <div className="grid w-full gap-3 sm:grid-cols-2">
          <button
            data-testid="replay-recording"
            onClick={playRecording}
            disabled={!hasRecording}
            title={hasRecording ? undefined : "Không có bản ghi của bé để nghe lại"}
            className={`flex items-center justify-center gap-2 rounded-[20px] px-5 py-3 text-sm font-bold text-vp-blue disabled:opacity-50 disabled:cursor-not-allowed ${band === "good" ? "bg-vp-sky" : "bg-white border border-vp-border"}`}
          >
            <Volume2 className="w-4 h-4" /> Nghe lại con đọc
          </button>
          <button
            onClick={() => playModel(band === "good" ? 0.85 : 0.6)}
            className={`rounded-[20px] px-5 py-3 text-sm font-bold text-white ${band === "good" ? "bg-emerald-500" : "bg-vp-blue"}`}
          >
            {band === "good" ? "Nghe mẫu lại" : band === "nearly" ? "Phát âm mẫu chậm" : "Luyện khẩu hình"}
          </button>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="w-full max-w-[700px]">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="mx-auto flex items-center gap-1 text-sm font-semibold text-vp-blue"
          >
            Chi tiết từng âm <ChevronDown className={`w-4 h-4 transition-transform ${showDetails ? "rotate-180" : ""}`} />
          </button>
          {showDetails && (
            <div className="mt-3 grid gap-2">
              {rows.map((row, i) => {
                const ok = row.is_correct || row.status === "CORRECT";
                const unsure = row.status === "UNSURE";
                const tone = ok ? "emerald" : unsure ? "amber" : "red";
                return (
                  <div key={i} className="flex items-start gap-3 rounded-2xl border border-vp-border bg-white p-3">
                    <button
                      onClick={() => speakVietnamese(row.canonical_name || row.canonical_token || word.word, 0.7)}
                      className={`w-10 h-10 shrink-0 rounded-xl grid place-items-center font-bold ${{ emerald: "bg-emerald-50 text-emerald-600", amber: "bg-amber-50 text-amber-600", red: "bg-red-50 text-red-500" }[tone]}`}
                    >
                      {row.canonical_symbol || row.expected || "—"}
                    </button>
                    <div className="text-sm">
                      <p className={`font-bold ${{ emerald: "text-emerald-600", amber: "text-amber-600", red: "text-red-500" }[tone]}`}>
                        {ok
                          ? `Chuẩn: ${row.canonical_name || "âm này"}`
                          : unsure
                            ? `Chưa chắc: ${row.canonical_name || "âm này"}${row.confidence != null ? ` (${Math.round(row.confidence * 100)}%)` : ""}`
                            : `Bé đọc thành: ${row.observed_symbol || row.observed || "—"}`}
                      </p>
                      {!ok && <p className="text-vp-muted">{row.mouth_tip || `Chú ý khẩu hình ${row.canonical_name || ""}.`}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <button
        data-testid="result-primary"
        onClick={() => { playSoundEffect("click"); primary(); }}
        className="w-full max-w-[400px] flex items-center justify-center gap-2 rounded-[28px] bg-vp-blue px-12 py-5 font-heading text-xl font-extrabold text-white shadow-[0_8px_8px_rgba(25,120,220,0.25)] hover:brightness-110"
      >
        {cfg.cta} {band === "good" ? <ChevronRight className="w-5 h-5" /> : band === "nearly" ? <ArrowRight className="w-5 h-5" /> : null}
      </button>
      {band !== "good" && (
        <button onClick={() => { playSoundEffect("click"); onNext(); }} className="-mt-4 text-sm font-semibold text-vp-muted hover:text-vp-blue">
          Bỏ qua, sang từ tiếp theo
        </button>
      )}
    </div>
  );
}
