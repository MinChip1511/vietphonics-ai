import { useEffect } from "react";
import confetti from "canvas-confetti";

export default function ConfettiCelebration({ active = false }) {
  useEffect(() => {
    if (!active) return;

    // Trigger colorful confetti burst
    const end = Date.now() + 1500;
    const colors = ["#f59e0b", "#10b981", "#3b82f6", "#ec4899", "#8b5cf6"];

    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }, [active]);

  return null;
}
