// Illustrated page backgrounds from the Figma kid frames (files in public/bg/).
// "cover" scenes fill the content area; "sky" is the practice scene: flat #c8ecfe with the art
// pinned bottom-right at ~81% of the width (Figma 207:3452), so the top stays plain sky.
const BG = {
  home: { image: "/bg/home.webp", color: "#e3f4ff", size: "cover", position: "center bottom" },
  sky: { image: "/bg/practice.webp", color: "#c8ecfe", size: "max(81%, 880px) auto", position: "right bottom" },
  islands: { image: "/bg/rewards.webp", color: "#cfecfd", size: "cover", position: "center bottom" }
};

export const VIEW_BACKGROUND = {
  kid_dashboard: BG.home,
  lesson_catalog: BG.home,
  profile_select: BG.home,
  practice: BG.sky,
  kid_progress: BG.islands,
  rewards: BG.islands
};
