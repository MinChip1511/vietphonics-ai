import React, { useState } from "react";
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

export default function PracticeStudioView({ lesson, aiEnabled = true, childId, onBack, onFinishExercise }) {
  const [stage, setStage] = useState("words");

  const go = (id) => {
    playSoundEffect("click");
    setStage(id);
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1096px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-vp-blue">{lesson?.categoryName} · Level {lesson?.level ?? 1}</p>
          <h2 className="font-heading text-2xl font-extrabold text-vp-ink">{lesson?.title}</h2>
        </div>
        <Tabs tabs={STAGES} value={stage} onChange={go} />
      </div>

      {stage === "words" && <WordPractice lesson={lesson} aiEnabled={aiEnabled} childId={childId} onFinishExercise={onFinishExercise} />}
      {stage === "warmup" && <WarmupStage lesson={lesson} onNext={() => go("discriminate")} />}
      {stage === "discriminate" && <DiscriminateStage lesson={lesson} onNext={() => go("mouth")} />}
      {stage === "mouth" && <MouthStage lesson={lesson} onNext={() => go("syllables")} />}
      {stage === "syllables" && <SyllablesStage lesson={lesson} onNext={() => go("words")} />}
      {stage === "pairs" && <PairsStage lesson={lesson} onNext={() => go("sentences")} />}
      {stage === "sentences" && <SentencesStage lesson={lesson} onDone={onBack} />}
    </div>
  );
}
