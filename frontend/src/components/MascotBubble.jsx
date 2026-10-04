import React from "react";
import { Volume2 } from "lucide-react";
import { speakVietnamese } from "../services/audioService";
import { MASCOT_IMAGE } from "../data/mascots";

// Figma "MascotSpeechBubble" used across the child screens.
export default function MascotBubble({ name = "Cá Xanh", message, listenLabel, mascot }) {
  return (
    <div className="bg-white border-2 border-vp-sky rounded-3xl p-5 sm:p-6 flex items-center gap-4 sm:gap-6 shadow-vp-card">
      <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-full bg-vp-sky grid place-items-center overflow-hidden">
        <img src={mascot || MASCOT_IMAGE} alt="Cá Xanh" className="w-[88%] h-[88%] object-contain" />
      </div>
      <div className="flex flex-col gap-2 min-w-0">
        <p className="text-lg font-bold text-vp-ink">{name} bảo nhỏ:</p>
        <p className="text-base leading-normal text-vp-ink">{message}</p>
        <button
          onClick={() => speakVietnamese(message)}
          className="flex items-center gap-2 pt-1 text-[13px] font-semibold text-vp-blue self-start hover:underline"
        >
          <Volume2 className="w-4 h-4" /> {listenLabel || `Nghe ${name} đọc mẫu trước nha`}
        </button>
      </div>
    </div>
  );
}
