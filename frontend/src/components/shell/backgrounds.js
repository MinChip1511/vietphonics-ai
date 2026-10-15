// Illustrated page backgrounds from the Figma kid frames (files in public/bg/).
// Every scene is a full 1440x1024 picture that covers the content area (Figma 199:3144, 207:3452, 207:3445).
const BG = {
  home: { image: "/bg/home.webp", color: "#e3f4ff", size: "cover", position: "center bottom" },
  sky: { image: "/bg/practice.webp", color: "#c8ecfe", size: "cover", position: "center bottom" },
  islands: { image: "/bg/rewards.webp", color: "#cfecfd", size: "cover", position: "center bottom" }
};

export const VIEW_BACKGROUND = {
  kid_dashboard: BG.home,
  lesson_catalog: BG.home,
  profile_select: BG.home,
  practice: BG.sky,
  practice_meadow: BG.home, // mic-permission and recording-errors use the meadow scene (Figma 27:2469, 27:2470)
  kid_progress: BG.islands,
  rewards: BG.islands
};
