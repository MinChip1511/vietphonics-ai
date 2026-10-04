import React from "react";
import l1 from "../../assets/brand/logo-l1.png";
import l2 from "../../assets/brand/logo-l2.png";
import l3 from "../../assets/brand/logo-l3.png";
import l4 from "../../assets/brand/logo-l4.png";
import l5 from "../../assets/brand/logo-l5.png";

// Whale mark is composed from five Figma image layers (node 23:2338).
const LAYERS = [
  { src: l1, inset: "56.13% 14.92% 5.19% 2.91%" },
  { src: l2, inset: "18.81% -2.08% -1.69% 0" },
  { src: l3, inset: "62.68% 66.62% 25.4% 23.77%" },
  { src: l4, inset: "59.26% 72.27% 31.73% 20.63%" },
  { src: l5, inset: "0 55.54% 74.41% 19.51%" }
];

export function LogoMark({ className = "w-8 h-[25px]" }) {
  return (
    <span className={`relative inline-block shrink-0 ${className}`} aria-hidden="true">
      {LAYERS.map(({ src, inset }) => (
        <span key={src} className="absolute" style={{ inset }}>
          <img src={src} alt="" className="block w-full h-full max-w-none" />
        </span>
      ))}
    </span>
  );
}

export default function Logo({ onClick, size = "md" }) {
  const big = size === "lg";
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-2 select-none" aria-label="VietPhonics AI">
      <LogoMark className={big ? "w-[66px] h-[52px]" : "w-8 h-[25px]"} />
      <span className={`font-heading font-extrabold text-vp-ink whitespace-nowrap ${big ? "text-[40px]" : "text-[22px]"}`}>
        VietPhonics<span className="text-vp-blue"> AI</span>
      </span>
    </button>
  );
}
