import React, { useState } from "react";
import { Volume2, CheckCircle2, AlertCircle, ChevronRight, Check } from "lucide-react";
import { speakVietnamese, playSoundEffect } from "../../services/audioService";

// Supporting curriculum stages (not drawn in Figma), restyled with the Figma tokens.

function StageCard({ title, subtitle, children, next }) {
  return (
    <div className="rounded-3xl border-2 border-vp-sky bg-white p-6 sm:p-10 text-center flex flex-col items-center gap-6">
      <div>
        <h3 className="font-heading text-2xl font-extrabold text-vp-ink">{title}</h3>
        {subtitle && <p className="mt-1 text-sm text-vp-muted max-w-md mx-auto">{subtitle}</p>}
      </div>
      {children}
      {next}
    </div>
  );
}

function NextButton({ label, onClick, done }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-3xl px-8 py-4 font-bold text-white hover:brightness-110 ${done ? "bg-emerald-500" : "bg-vp-blue"}`}
    >
      {done && <Check className="w-5 h-5" />} {label} {!done && <ChevronRight className="w-4 h-4" />}
    </button>
  );
}

function SpeakChip({ text, className = "" }) {
  return (
    <button
      onClick={() => { playSoundEffect("click"); speakVietnamese(text); }}
      className={`inline-flex items-center gap-2 rounded-2xl border-2 border-vp-sky bg-white px-5 py-3 font-heading text-xl font-extrabold text-vp-ink hover:border-vp-blue ${className}`}
    >
      {text} <Volume2 className="w-4 h-4 text-vp-blue" />
    </button>
  );
}

export function WarmupStage({ lesson, onNext }) {
  return (
    <StageCard
      title="Khởi động tai nghe"
      subtitle="Bé hãy lắng nghe các cặp âm mẫu để cảm nhận sự khác biệt trước khi luyện nói nhé."
      next={<NextButton label="Sang game phân biệt âm" onClick={onNext} />}
    >
      <div className="flex flex-wrap justify-center gap-3">
        {(lesson.warmup || []).map((item) => <SpeakChip key={item} text={item} />)}
      </div>
    </StageCard>
  );
}

export function DiscriminateStage({ lesson, onNext }) {
  const game = lesson.discriminationGame || lesson.discrimination_game || {};
  const [chosen, setChosen] = useState(null);
  const correct = chosen !== null && chosen === game.correct;

  return (
    <StageCard
      title="Game nghe & phân biệt"
      subtitle="Bấm nút loa để nghe từ bí mật, sau đó chọn từ đúng mà bé nghe thấy nhé!"
      next={<NextButton label="Sang học khẩu hình" onClick={onNext} />}
    >
      <button
        onClick={() => { playSoundEffect("click"); speakVietnamese(game.prompt || ""); }}
        className="inline-flex items-center gap-2.5 rounded-[20px] bg-vp-blue px-6 py-4 font-bold text-white"
      >
        <Volume2 className="w-6 h-6" /> Nghe từ bí mật
      </button>
      <div className="grid grid-cols-2 gap-4 w-full max-w-md">
        {(game.options || []).map((opt) => {
          const picked = chosen === opt;
          const tone = picked ? (opt === game.correct ? "bg-emerald-500 border-emerald-500 text-white" : "bg-red-500 border-red-500 text-white") : "bg-white border-vp-border text-vp-ink hover:border-vp-blue";
          return (
            <button
              key={opt}
              onClick={() => { setChosen(opt); playSoundEffect(opt === game.correct ? "success" : "click"); }}
              className={`rounded-2xl border-2 py-5 font-heading text-xl font-extrabold transition ${tone}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {chosen !== null && (
        <p className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold ${correct ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
          {correct ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {correct ? "Chính xác! Tai nghe của bé rất nhạy bén!" : "Gần đúng rồi! Hãy nghe lại và thử đáp án khác nhé!"}
        </p>
      )}
    </StageCard>
  );
}

export function MouthStage({ lesson, onNext }) {
  const guide = lesson.mouthGuide || lesson.mouth_guide || {};
  return (
    <StageCard title="Học cách tạo âm & khẩu hình" subtitle={guide.title} next={<NextButton label="Sang luyện âm tiết" onClick={onNext} />}>
      <div className="grid gap-4 sm:grid-cols-2 w-full max-w-3xl text-left">
        <div className="rounded-2xl bg-vp-sky p-5">
          <p className="text-[11px] font-bold uppercase text-vp-blue mb-2">Vị trí môi & luồng hơi</p>
          <p className="text-sm font-semibold text-vp-ink leading-relaxed">{guide.tip}</p>
        </div>
        <div className="rounded-2xl bg-blue-50 p-5">
          <p className="text-[11px] font-bold uppercase text-vp-blue mb-2">Vị trí lưỡi</p>
          <p className="text-sm font-semibold text-vp-ink leading-relaxed">{guide.tongue}</p>
        </div>
      </div>
    </StageCard>
  );
}

export function SyllablesStage({ lesson, onNext }) {
  return (
    <StageCard
      title="Luyện âm tiết cơ bản"
      subtitle="Bấm vào từng âm tiết để nghe đọc mẫu và đọc theo nhé!"
      next={<NextButton label="Sang luyện từ với AI" onClick={onNext} />}
    >
      <div className="flex flex-wrap justify-center gap-3 max-w-2xl">
        {(lesson.syllables || []).map((s) => <SpeakChip key={s} text={s} />)}
      </div>
    </StageCard>
  );
}

export function PairsStage({ lesson, onNext }) {
  const pairs = lesson.minimalPairs || lesson.minimal_pairs || [];
  return (
    <StageCard
      title="Cặp từ tối thiểu"
      subtitle="So sánh 2 từ chỉ khác nhau ở âm mục tiêu để khắc phục lỗi nhầm lẫn."
      next={<NextButton label="Sang luyện câu" onClick={onNext} />}
    >
      <div className="grid gap-4 sm:grid-cols-2 w-full max-w-2xl">
        {pairs.map((p) => (
          <div key={p.word1 + p.word2} className="rounded-2xl border border-vp-border p-5 flex flex-col gap-3">
            <div className="flex items-center justify-around gap-2">
              <SpeakChip text={p.word1} className="text-lg px-4 py-2" />
              <span className="text-xs font-bold text-vp-muted">VS</span>
              <SpeakChip text={p.word2} className="text-lg px-4 py-2" />
            </div>
            <p className="text-xs text-vp-muted">{p.focus}</p>
          </div>
        ))}
      </div>
    </StageCard>
  );
}

export function SentencesStage({ lesson, onDone }) {
  return (
    <StageCard
      title="Phát âm trong câu ngắn"
      subtitle="Áp dụng các âm đã luyện vào câu hoàn chỉnh với ngữ điệu tự nhiên."
      next={<NextButton label="Hoàn thành bài học" onClick={onDone} done />}
    >
      <div className="flex flex-col gap-3 w-full max-w-xl">
        {(lesson.sentences || []).map((s) => (
          <div key={s.sentence} className="rounded-2xl border border-vp-border p-4 flex items-center justify-between gap-3 text-left">
            <p className="font-heading text-lg font-bold text-vp-ink">{s.sentence}</p>
            <button
              onClick={() => { playSoundEffect("click"); speakVietnamese(s.sentence); }}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-vp-blue px-4 py-2 text-xs font-bold text-white"
            >
              <Volume2 className="w-4 h-4" /> Nghe câu
            </button>
          </div>
        ))}
      </div>
    </StageCard>
  );
}
