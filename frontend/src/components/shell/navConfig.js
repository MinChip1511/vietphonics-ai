import {
  LayoutGrid, BookOpen, Trophy, CircleUser, LineChart, Mic, CreditCard, ShieldCheck,
  Layers, Gift, Users, FileText, BarChart3, Settings, TicketPercent
} from "lucide-react";

export const NAV_ITEMS = {
  kid: [
    { view: "kid_dashboard", label: "Trang chủ", icon: LayoutGrid },
    { view: "lesson_catalog", label: "Bài học", icon: BookOpen },
    { view: "rewards", label: "Cúp của bé", icon: Trophy },
    { view: "kid_progress", label: "Hồ sơ của bé", icon: CircleUser }
  ],
  parent: [
    { view: "parent_dashboard", label: "Trang chủ", icon: LayoutGrid },
    { view: "parent_progress", label: "Tiến độ học", icon: LineChart },
    { view: "parent_pronunciation", label: "Phân tích phát âm", icon: Mic },
    { view: "subscription", label: "Gói học & Thanh toán", icon: CreditCard },
    { view: "parent_child_profile", label: "Hồ sơ của bé", icon: CircleUser },
    { view: "parent_privacy", label: "Cấu hình & Bảo mật", icon: ShieldCheck }
  ],
  admin: [
    { view: "admin_dashboard", label: "Tổng quan", icon: LayoutGrid },
    { view: "admin_lessons", label: "Bài học", icon: BookOpen },
    { view: "admin_content", label: "Nội dung & Bài tập", icon: Layers },
    { view: "admin_rewards", label: "Kho phần thưởng", icon: Gift },
    { view: "admin_users", label: "Người dùng", icon: Users },
    { view: "admin_pricing", label: "Bảng giá", icon: CreditCard },
    { view: "admin_promotions", label: "Khuyến mãi", icon: TicketPercent },
    { view: "admin_orders", label: "Đơn hàng", icon: FileText },
    { view: "admin_revenue", label: "Doanh thu", icon: BarChart3 },
    { view: "admin_analytics", label: "Phân tích", icon: LineChart },
    { view: "admin_settings", label: "Cài đặt hệ thống", icon: Settings }
  ]
};

const titles = {};
const roles = {};
for (const [role, items] of Object.entries(NAV_ITEMS)) {
  for (const item of items) {
    titles[item.view] = item.label;
    roles[item.view] = role;
  }
}

export const VIEW_ROLE = { ...roles, practice: "kid", profile_select: "kid" };

export const VIEW_TITLE = {
  ...titles,
  kid_dashboard: "Trang chủ",
  parent_dashboard: "Trang chủ",
  parent_progress: "Tiến độ học của bé",
  parent_pronunciation: "Bản đồ ngọng & Phân tích âm chuẩn AI",
  subscription: "Quản lý tài khoản VIP & Học phí con",
  parent_child_profile: "Hồ sơ cá nhân của bé",
  parent_privacy: "Cấu hình & Bảo mật",
  admin_dashboard: "Trang chủ",
  admin_lessons: "Quản lý Giáo trình & Bài học",
  admin_content: "Quản lý Bài tập Phát âm & Từ vựng",
  admin_rewards: "Quản lý Kho phần thưởng học tập",
  admin_users: "Tài khoản & Hộ gia đình",
  admin_pricing: "Cấu hình Gói dịch vụ & Bảng giá",
  admin_promotions: "Khuyến mãi & Mã giảm giá",
  admin_orders: "Quản lý Đơn hàng & Thanh toán",
  admin_revenue: "Báo cáo Doanh thu & Đối soát",
  admin_analytics: "Phân tích & Chỉ số Sản phẩm",
  admin_settings: "Cài đặt & Quản trị Hệ thống",
  practice: "Luyện phát âm",
  profile_select: "Chào bé!"
};

// Views that sit in the sidebar shell. Everything else (landing, auth pages) is full-page.
export const SHELL_VIEWS = new Set(Object.keys(VIEW_ROLE));

export const ROLE_HOME = { kid: "kid_dashboard", parent: "parent_dashboard", admin: "admin_dashboard" };

// Views without a sidebar entry show a back button that returns to this view.
export const VIEW_BACK = { practice: "lesson_catalog" };
