// Labels and formatting shared by the admin and parent screens (the data itself comes from the backend).
export const ORDER_STATUS = {
  paid: { label: "Đã thanh toán", tone: "green" },
  pending: { label: "Chờ thanh toán", tone: "amber" },
  failed: { label: "Thất bại", tone: "red" },
  expired: { label: "Hết hạn", tone: "gray" },
  refunded: { label: "Đã hoàn tiền", tone: "sky" }
};

export const LESSON_STATUS = {
  published: { label: "Đã xuất bản", tone: "green" },
  draft: { label: "Bản nháp", tone: "amber" },
  archived: { label: "Lưu trữ", tone: "red" }
};

export const REWARD_KINDS = ["Mascot Outfit", "Visual Sticker", "Huy hiệu"];

export function formatVnd(amount) {
  return `${Number(amount || 0).toLocaleString("vi-VN")}đ`;
}
