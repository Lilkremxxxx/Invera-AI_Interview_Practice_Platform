import { UserOut } from '@/lib/api';

type Language = 'vi' | 'en';

export function formatPlanLabel(user: UserOut | null | undefined, language: Language): string {
  if (!user) {
    return language === 'vi' ? 'Người dùng' : 'User';
  }

  if (user.is_admin) {
    return language === 'vi' ? 'Admin' : 'Admin';
  }

  switch (user.plan_tier) {
    case 'basic':
      return language === 'vi' ? 'Gói Basic' : 'Basic';
    case 'pro':
      return language === 'vi' ? 'Gói Pro' : 'Pro';
    default:
      return language === 'vi' ? 'Free trial' : 'Free trial';
  }
}

export function formatBillingPeriod(period: UserOut['plan_billing_period'], language: Language): string {
  if (period === 'year') {
    return language === 'vi' ? 'Theo năm' : 'Yearly';
  }
  if (period === 'month') {
    return language === 'vi' ? 'Theo tháng' : 'Monthly';
  }
  return language === 'vi' ? 'Chưa áp dụng' : 'Not applied';
}

export function formatPlanStatus(user: UserOut | null | undefined, language: Language): string {
  if (!user) {
    return language === 'vi' ? 'Chưa xác định' : 'Unknown';
  }
  if (user.is_admin) {
    return language === 'vi' ? 'Không giới hạn' : 'Unlimited';
  }
  switch (user.plan_status) {
    case 'expired':
      return language === 'vi' ? 'Đã hết hạn' : 'Expired';
    case 'trial_exhausted':
      return language === 'vi' ? 'Đã dùng hết trial' : 'Trial exhausted';
    default:
      return language === 'vi' ? 'Đang hoạt động' : 'Active';
  }
}

export function userInitials(user: UserOut | null | undefined): string {
  if (!user?.email) return '?';
  const source = user.full_name?.trim() || user.email.split('@')[0];
  const parts = source.split(/\s+|[.\-_]/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || '?';
}
