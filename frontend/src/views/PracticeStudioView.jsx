import React, { useCallback, useEffect, useState } from "react";
import { playSoundEffect } from "../services/audioService";
import { Tabs } from "../components/ui";
import WordPractice from "./practice/WordPractice";
import {
  WarmupStage, DiscriminateStage, MouthStage, SyllablesStage, PairsStage, SentencesStage
} from "./practice/ExtraStages";

const STAGES = [
  { id: "words", label: "Luyện từ với AI" },
  { id: "warmup", label: "Khởi động" },
  { id: "discriminate", label: "Phân biệt" },
  { id: "mouth", label: "Khẩu hình" },
  { id: "syllables", label: "Âm tiết" },
  { id: "pairs", label: "Cặp từ" },
  { id: "sentences", label: "Luyện câu" }
];

export default function PracticeStudioView({ lesson, aiEnabled = true, childId, onBack, onFinishExercise, onTitleChange }) {
  const [stage, setStage] = useState("words");

  const [phase, setPhase] = useState("intro");
  const onPhaseChange = useCallback((p) => {
    setPhase(p);
    onTitleChange?.(p === "mic-permission" ? "Cấp quyền truy cập" : p === "recording-errors" ? "Kiểm tra môi trường học" : undefined);
  }, [onTitleChange]);

  useEffect(() => () => onTitleChange?.(undefined), [onTitleChange]);

  const go = (id) => {
    playSoundEffect("click");
    setStage(id);
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1096px]">
      {stage !== "words" && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-heading text-2xl font-extrabold text-vp-ink">{lesson?.title}</h2>
          <Tabs tabs={STAGES} value={stage} onChange={go} />
        </div>
      )}

      {stage === "words" && <WordPractice lesson={lesson} aiEnabled={aiEnabled} childId={childId} onFinishExercise={onFinishExercise} onPhaseChange={onPhaseChange} />}
      {stage === "words" && phase === "intro" && (
        <div className="-mt-3 flex justify-center" data-testid="practice-more">
          <div className="inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full bg-white/85 p-1 shadow-vp-drop backdrop-blur-sm" role="group" aria-label="Bài tập khác trong bài học">
            {STAGES.map((t) => (
              <button
                key={t.id}
                onClick={() => go(t.id)}
                className={`h-6 shrink-0 whitespace-nowrap rounded-full px-2.5 text-[11px] font-semibold ${stage === t.id ? "bg-vp-blue text-white" : "text-vp-ink hover:bg-vp-sky"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {stage === "warmup" && <WarmupStage lesson={lesson} onNext={() => go("discriminate")} />}
      {stage === "discriminate" && <DiscriminateStage lesson={lesson} onNext={() => go("mouth")} />}
      {stage === "mouth" && <MouthStage lesson={lesson} onNext={() => go("syllables")} />}
      {stage === "syllables" && <SyllablesStage lesson={lesson} onNext={() => go("words")} />}
      {stage === "pairs" && <PairsStage lesson={lesson} onNext={() => go("sentences")} />}
      {stage === "sentences" && <SentencesStage lesson={lesson} onDone={onBack} />}
    </div>
  );
}
