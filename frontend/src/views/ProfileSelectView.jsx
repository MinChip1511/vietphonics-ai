import React, { useState } from "react";
import { Play, Plus, Volume2 } from "lucide-react";
import { playSoundEffect, speakVietnamese } from "../services/audioService";
import { MASCOTS, MASCOT_IMAGE } from "../data/mascots";
import ChildAvatar from "../components/ChildAvatar";
import { nameError, MAX_NAME_LENGTH } from "../services/validators";
import { Modal, Button, Field, inputClass } from "../components/ui";

// Figma: 03 Child UX / 01 / child-welcome (7:32), with the profile picker the app needs.
const WELCOME_LINE = "Chào bé yêu! Mình cùng học chữ cái nha!";

export default function ProfileSelectView({ profiles, selectedChild, onSelectChild, onAddNewChild }) {
  const [activeId, setActiveId] = useState(selectedChild?.id || profiles[0]?.id);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState(6);
  const [formError, setFormError] = useState(null);
  const [avatar, setAvatar] = useState(MASCOTS[0].id);
  const active = profiles.find((p) => p.id === activeId) || profiles[0];

  const create = async (e) => {
    e.preventDefault();
    const problem = nameError(name, "tên của bé");
    if (problem) return setFormError({ field: "name", message: problem });
    if (!(Number(age) >= 4 && Number(age) <= 7)) return setFormError({ field: "age", message: "VietPhonics dành cho bé từ 4 đến 7 tuổi." });
    setFormError(null);
    const result = await onAddNewChild({ name: name.trim(), age: Number(age), avatar, initial_needs: ["Thanh điệu", "Âm S - X"] });
    if (!result?.ok) return setFormError({ field: "name", message: result?.error || "Chưa tạo được hồ sơ, vui lòng thử lại." });
    setShowAdd(false);
    setName("");
  };

  return (
    <div className="flex flex-col items-center gap-6 pt-3 text-center">
      <div className="flex flex-col items-center gap-6 px-2">
        <p className="text-sm font-bold uppercase text-vp-blue">VietPhonics AI • Chương trình phát âm tiếng Việt cho trẻ</p>
        <h2 className="mt-2 font-heading text-4xl sm:text-5xl font-extrabold text-vp-ink">
          Học vui cùng <span className="text-vp-blue">Cá Xanh!</span>
        </h2>
        <p className="mt-1.5 max-w-[560px] text-lg leading-[29px] text-vp-muted">
          Ứng dụng luyện phát âm chuẩn Tiếng Việt bằng AI dành riêng cho trẻ em. Luyện đúng từng nguyên âm, phụ âm đầu và thanh điệu đặc trưng.
        </p>
      </div>

      <div className="w-full max-w-[780px] sm:mb-[22px]">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
          <p className="text-xs font-bold uppercase text-vp-muted">Hôm nay ai học nào?</p>
          {profiles.map((child) => (
            <button
              key={child.id}
              data-testid={`profile-${child.id}`}
              onClick={() => { playSoundEffect("click"); setActiveId(child.id); }}
              className={`flex items-center gap-3 rounded-2xl border-2 bg-white px-3 py-0.5 text-left transition ${
                child.id === active?.id ? "border-vp-blue shadow-vp-drop" : "border-vp-border hover:border-vp-blue"
              }`}
            >
              <ChildAvatar avatar={child.avatar} className="w-9 h-9" emojiClass="text-xl" />
              <span>
                <span className="block font-bold text-vp-ink">{child.name}</span>
                <span className="block text-xs text-vp-muted">{child.age} tuổi · {child.stars} điểm</span>
              </span>
            </button>
          ))}
          <button
            onClick={() => setShowAdd(true)}
            aria-label="Thêm bé"
            title="Thêm bé"
            className="grid h-[44px] w-[44px] place-items-center rounded-2xl border-2 border-dashed border-vp-blue/50 bg-white/70 font-bold text-vp-blue hover:bg-vp-sky"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="w-full max-w-[400px] h-[316px] rounded-[32px] border-[3px] border-vp-sky bg-white flex flex-col items-center justify-center gap-6 shadow-vp-lift">
        <img src={MASCOT_IMAGE} alt="Cá Xanh" className="w-[212px] h-[212px] object-contain" />
        <button
          onClick={() => speakVietnamese(WELCOME_LINE)}
          className="flex items-center gap-2 whitespace-nowrap rounded-2xl bg-vp-sky px-5 py-2 text-[15px] font-bold text-vp-blue"
        >
          <Volume2 className="w-5 h-5" /> "{WELCOME_LINE}"
        </button>
      </div>

      <div className="flex flex-col items-center gap-3 w-full sm:mt-[67px]">
        <button
          id="btn-start-learning-child"
          data-testid="start-learning"
          disabled={!active}
          onClick={() => { playSoundEffect("click"); onSelectChild(active); }}
          className="w-full max-w-[400px] flex items-center justify-center gap-3 rounded-[32px] bg-vp-blue px-16 py-5 font-heading text-[22px] leading-[35px] font-extrabold text-white shadow-vp-cta hover:brightness-110"
        >
          Bắt đầu học ngay <Play className="w-6 h-6" />
        </button>
        <p className="rounded-full bg-white/80 px-4 py-1 text-sm text-vp-muted">* Đề xuất: Phụ huynh nên đồng hành và chọn môi trường yên tĩnh cho bé nói.</p>
      </div>

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Thêm hồ sơ cho bé"
      >
        <form onSubmit={create} className="flex flex-col gap-4 text-left">
          <Field label="Tên của bé" error={formError?.field === "name" ? formError.message : null}>
            <input className={inputClass} value={name} maxLength={MAX_NAME_LENGTH} onChange={(e) => { setName(e.target.value); setFormError(null); }} placeholder="VD: Bé Na" autoFocus />
          </Field>
          <Field label="Tuổi (4–7)" error={formError?.field === "age" ? formError.message : null}>
            <input className={inputClass} type="number" min={4} max={7} value={age} onChange={(e) => { setAge(e.target.value); setFormError(null); }} />
          </Field>
          <div>
            <p className="text-sm font-semibold text-vp-ink mb-2">Chọn bạn đồng hành</p>
            <div className="flex flex-wrap gap-2">
              {MASCOTS.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setAvatar(m.id)}
                  className={`rounded-full p-0.5 border-2 ${avatar === m.id ? "border-vp-blue" : "border-transparent"}`}
                  aria-label={m.name}
                >
                  <ChildAvatar avatar={m.id} className="w-14 h-14" />
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>Hủy</Button>
            <Button type="submit" disabled={!name.trim()}>Tạo hồ sơ</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
