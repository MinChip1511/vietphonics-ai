import caXanh from "../assets/mascots/ca-xanh.png";
import cun from "../assets/mascots/cun.png";
import tho from "../assets/mascots/tho.png";
import ga from "../assets/mascots/ga.png";
import gauTruc from "../assets/mascots/gau-truc.png";
import khungLong from "../assets/mascots/khung-long.png";

// Figma mascot images (211:3467 Cá Xanh, 129:6313, 129:6200, 129:6204, 129:6198, 129:6202).
// Cá Xanh is the app mascot everywhere; the id stays "mascot:ca-voi" for profiles saved earlier.
export const MASCOT_IMAGE = caXanh;
export const MASCOTS = [
  { id: "mascot:ca-voi", name: "Cá Xanh", src: caXanh },
  { id: "mascot:cun", name: "Con cún", src: cun },
  { id: "mascot:tho", name: "Con thỏ", src: tho },
  { id: "mascot:ga", name: "Con gà", src: ga },
  { id: "mascot:gau-truc", name: "Gấu trúc", src: gauTruc },
  { id: "mascot:khung-long", name: "Khủng long", src: khungLong }
];

export function getMascot(avatar) {
  return MASCOTS.find((m) => m.id === avatar);
}
