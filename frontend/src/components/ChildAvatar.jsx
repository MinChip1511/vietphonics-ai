import React from "react";
import { getMascot } from "../data/mascots";

// Renders a Figma mascot image ("mascot:<id>") or falls back to the legacy emoji avatar.
export default function ChildAvatar({ avatar, className = "w-16 h-16", emojiClass = "text-4xl" }) {
  const mascot = getMascot(avatar);
  return (
    <span className={`shrink-0 rounded-full bg-vp-sky grid place-items-center overflow-hidden ${className}`}>
      {mascot ? (
        <img src={mascot.src} alt={mascot.name} className="w-[85%] h-[85%] object-contain" />
      ) : (
        <span className={emojiClass} aria-hidden="true">{avatar || "🙂"}</span>
      )}
    </span>
  );
}
