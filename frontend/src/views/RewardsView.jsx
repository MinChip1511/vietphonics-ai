import React, { useEffect, useState } from "react";
import ConfettiCelebration from "../components/ConfettiCelebration";
import RewardCard from "../components/RewardCard";
import { fetchChildRewards, redeemReward } from "../services/apiService";
import { playSoundEffect } from "../services/audioService";

// Figma: 03 Child UX / 13 rewards (7:891). Balance, owned rewards and the leaderboard all come from the
// server, and the balance is the same "điểm" number shown in the header and the progress screen.
export default function RewardsView({ selectedChild, onProfileChange }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [celebrate, setCelebrate] = useState(false);
  const childId = selectedChild?.id;

  const [reloadTick, setReloadTick] = useState(0);

  // Fetch the child's wallet whenever the child, their points or an explicit reload change.
  useEffect(() => {
    if (!childId) return undefined;
    let alive = true;
    fetchChildRewards(childId).then(
      (next) => { if (alive) { setData(next); setError(null); } },
      (err) => { if (alive) setError(err.message); }
    );
    return () => { alive = false; };
  }, [childId, selectedChild?.stars, reloadTick]);

  useEffect(() => {
    if (!celebrate) return undefined;
    const id = window.setTimeout(() => setCelebrate(false), 100);
    return () => window.clearTimeout(id);
  }, [celebrate]);

  const redeem = async (reward) => {
    setError(null);
    try {
      const next = await redeemReward(childId, reward.id);
      setData(next);
      onProfileChange?.(next.profile);
      playSoundEffect("success");
      setCelebrate(false);
      window.requestAnimationFrame(() => setCelebrate(true));
    } catch (err) {
      setError(err.message);
      setReloadTick((t) => t + 1);
    }
  };

  if (!childId) return <p className="text-vp-muted">Hãy chọn một hồ sơ bé để xem quà.</p>;

  return (
    <div className="w-full">
      <ConfettiCelebration active={celebrate} />
      <div className="content-stretch mx-auto flex w-full max-w-7xl flex-col items-start gap-6 p-4 font-baloo sm:p-6 lg:p-8">
        <header className="flex w-full flex-col items-start justify-between gap-2 leading-normal sm:flex-row sm:items-center">
          <h1 className="font-baloo text-[28px] font-extrabold leading-normal text-[#0D3577]">Đổi Quà Đáng Yêu</h1>
          <p data-testid="wallet" className="font-baloo text-[15px] font-bold leading-normal text-[#1978DC] sm:text-right">
            Ví của con: {data ? data.balance : selectedChild.stars} điểm
          </p>
        </header>
        {error && <p role="alert" className="w-full rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-500">{error}</p>}

        <section aria-label="Danh sách phần thưởng" className="flex w-full flex-col items-stretch gap-4 md:flex-row md:flex-wrap">
          {data && data.rewards.length === 0 && <p className="text-vp-muted">Chưa có phần thưởng nào. Ba mẹ quay lại sau nhé!</p>}
          {data?.rewards.map((reward) => (
            <div key={reward.id} className="flex md:w-[calc(33.333%-0.75rem)]">
              <RewardCard reward={reward} owned={data.owned.includes(reward.id)} balance={data.balance} onRedeem={redeem} />
            </div>
          ))}
        </section>

        <section className="content-stretch flex w-full flex-col items-start gap-4 rounded-[24px] border border-[#E4E4E7] bg-white p-6 leading-normal">
          <h2 className="font-baloo text-xl font-bold leading-normal text-[#0D3577]">Bảng vàng của gia đình</h2>
          <ol className="flex w-full flex-col items-start gap-3">
            {data?.leaderboard.map((entry) => (
              <li key={entry.id} className={`flex w-full items-center justify-between rounded-[12px] p-3 ${entry.isCurrent ? "bg-[#DDF5FF] font-bold" : "bg-[#FAF9F5]"}`}>
                <div className="flex min-w-0 items-center gap-3">
                  <span className="shrink-0 font-baloo text-sm font-bold text-[#1978DC]">{entry.rank}</span>
                  <span className={`truncate font-baloo text-[15px] text-[#0D3577] ${entry.isCurrent ? "font-bold" : "font-medium"}`}>{entry.name}</span>
                </div>
                <span className="shrink-0 font-baloo text-sm font-bold text-[#0D3577]">{entry.points} điểm</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
