import React from "react";
import { ChevronDown } from "lucide-react";
import ChildAvatar from "../../components/ChildAvatar";
import { useStore } from "../../services/store";

const REGION_LABEL = { north: "Giọng miền Bắc", south: "Giọng miền Nam", mixed: "Đa vùng miền" };

// Child picker shown in parent page headers (Figma 7:1421).
export default function ChildSwitcher({ profiles, selectedChild, onSelectChild }) {
  const { getChildSettings } = useStore();
  if (!selectedChild) return null;
  const region = REGION_LABEL[getChildSettings(selectedChild.id).region];
  return (
    <label className="relative flex items-center gap-2.5 rounded-xl border border-vp-border bg-white pl-3 pr-9 py-2 cursor-pointer">
      <ChildAvatar avatar={selectedChild.avatar} className="w-8 h-8" emojiClass="text-lg" />
      <span className="text-left">
        <span className="block text-[13px] font-bold text-vp-ink">{selectedChild.name}</span>
        <span className="block text-[11px] text-vp-muted">{selectedChild.age} tuổi • {region}</span>
      </span>
      <ChevronDown className="absolute right-3 w-4 h-4 text-vp-muted pointer-events-none" />
      <select
        aria-label="Chọn hồ sơ bé"
        className="absolute inset-0 opacity-0 cursor-pointer"
        value={selectedChild.id}
        onChange={(e) => onSelectChild(profiles.find((p) => p.id === e.target.value))}
      >
        {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </label>
  );
}
