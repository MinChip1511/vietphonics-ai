import React from "react";
import { assetUrl } from "../services/apiClient";

// Figma: 03 Child UX / 13 rewards (cards 7:895, 7:901, 7:910). The state comes from the child's real
// balance and owned list (see views/RewardsView.jsx).
export default function RewardCard({ reward, owned, balance, onRedeem }) {
  const locked = !owned && reward.cost > balance;

  return (
    <article
      data-testid={`reward-${reward.id}`}
      className={`content-stretch flex w-full min-w-0 flex-1 flex-col items-start gap-3 rounded-[20px] border p-4 md:w-auto ${
        owned ? "border-[1.5px] border-[#10B981] bg-white" : "border border-[#E4E4E7] bg-white"
      } ${locked ? "opacity-60" : ""}`}
    >
      <div className="flex h-[120px] w-full shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-[#DDF5FF]">
        {reward.image ? (
          <img src={assetUrl(reward.image)} alt={reward.title} className="h-full w-full object-cover" />
        ) : (
          <span className="font-baloo text-[48px] leading-normal" role="img" aria-label={reward.title}>{reward.icon || "🎁"}</span>
        )}
      </div>

      <div className="flex w-full flex-col gap-1 leading-normal">
        <h2 className="font-baloo text-base font-bold leading-normal text-[#0D3577]">{reward.title}</h2>

        {owned && <p className="font-baloo text-[13px] font-bold leading-normal text-[#10B981]">Đã sở hữu</p>}

        {!owned && !locked && (
          <div className="flex items-center gap-1.5">
            <p className="font-baloo text-[13px] font-bold leading-normal text-[#1978DC]">{reward.cost} ĐIỂM</p>
            <button
              type="button"
              data-testid={`redeem-${reward.id}`}
              onClick={() => onRedeem(reward)}
              className="rounded-[8px] bg-[#1978DC] px-2 py-0.5 font-baloo text-[11px] font-bold leading-normal text-white transition-colors hover:bg-[#1267BD] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1978DC]"
              aria-label={`Đổi ${reward.title} với giá ${reward.cost} điểm`}
            >
              ĐỔI
            </button>
          </div>
        )}

        {!owned && locked && <p className="font-baloo text-[13px] font-normal leading-normal text-[#6B7280]">{reward.cost} ĐIỂM (Chưa đủ)</p>}
      </div>
    </article>
  );
}
