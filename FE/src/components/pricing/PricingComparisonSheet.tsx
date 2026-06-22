import { Link } from 'react-router-dom';
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { pricingPlans } from '@/lib/mock-data';
import { pricingPlanContent } from '@/lib/pricing-content';

type PricingLanguage = 'vi' | 'en';
type BillingPeriod = 'month' | 'year';
type PricingPlanId = 'free' | 'basic' | 'pro' | 'premium';

type PricingComparisonSheetProps = {
  language: PricingLanguage;
  billingPeriod: BillingPeriod;
  mode?: 'landing' | 'upgrade';
  currentPlanTier?: PricingPlanId | null;
  loadingPlanId?: PricingPlanId | null;
  onSelectPlan?: (planId: PricingPlanId) => void;
  getActionLabel?: (planId: PricingPlanId, isCurrent: boolean) => string;
};

type ComparisonRow = {
  key: string;
  label: { vi: string; en: string };
  values: Record<PricingPlanId, { vi: string; en: string }>;
  emphasized?: boolean;
};

const comparisonRows: ComparisonRow[] = [
  {
    key: 'price',
    label: { vi: 'Giá / tháng', en: 'Price / month' },
    values: {
      free: { vi: '0đ', en: '0đ' },
      basic: { vi: '99.000đ', en: '99,000 VND' },
      pro: { vi: '199.000đ', en: '199,000 VND' },
      premium: { vi: '299.000đ', en: '299,000 VND' },
    },
    emphasized: true,
  },
  {
    key: 'sessions',
    label: { vi: 'Số phiên phỏng vấn / tháng', en: 'Sessions / month' },
    values: {
      free: { vi: '1 phiên', en: '1 session' },
      basic: { vi: '5 phiên', en: '5 sessions' },
      pro: { vi: '8 phiên', en: '8 sessions' },
      premium: { vi: '12 phiên', en: '12 sessions' },
    },
  },
  {
    key: 'tokens',
    label: { vi: 'Tokens / phiên', en: 'Tokens / session' },
    values: {
      free: { vi: '7.8k', en: '7.8k' },
      basic: { vi: '7.8k', en: '7.8k' },
      pro: { vi: '10.8k', en: '10.8k' },
      premium: { vi: '10.8k', en: '10.8k' },
    },
  },
  {
    key: 'extra-session',
    label: { vi: 'Phiên thêm', en: 'Extra session' },
    values: {
      free: { vi: '35.000đ/phiên', en: '35,000 VND/session' },
      basic: { vi: '35.000đ/phiên', en: '35,000 VND/session' },
      pro: { vi: '30.000đ/phiên', en: '30,000 VND/session' },
      premium: { vi: '28.000đ/phiên', en: '28,000 VND/session' },
    },
  },
  {
    key: 'camera',
    label: { vi: 'AI camera interview', en: 'AI camera interview' },
    values: {
      free: { vi: '✓', en: '✓' },
      basic: { vi: '✓', en: '✓' },
      pro: { vi: '✓', en: '✓' },
      premium: { vi: '✓', en: '✓' },
    },
  },
  {
    key: 'role-level',
    label: { vi: 'Chọn vai trò & cấp độ', en: 'Role & level selection' },
    values: {
      free: { vi: 'Cơ bản', en: 'Basic' },
      basic: { vi: '✓', en: '✓' },
      pro: { vi: '✓', en: '✓' },
      premium: { vi: '✓', en: '✓' },
    },
  },
  {
    key: 'behavioral',
    label: { vi: 'Câu hỏi hành vi', en: 'Behavioral questions' },
    values: {
      free: { vi: '—', en: '—' },
      basic: { vi: '✓', en: '✓' },
      pro: { vi: '✓', en: '✓' },
      premium: { vi: '✓', en: '✓' },
    },
  },
  {
    key: 'technical',
    label: { vi: 'Câu hỏi kỹ thuật', en: 'Technical questions' },
    values: {
      free: { vi: '—', en: '—' },
      basic: { vi: '✓', en: '✓' },
      pro: { vi: '✓', en: '✓' },
      premium: { vi: '✓', en: '✓' },
    },
  },
  {
    key: 'rubric',
    label: { vi: 'Chấm điểm theo rubric', en: 'Rubric scoring' },
    values: {
      free: { vi: 'Cơ bản', en: 'Basic' },
      basic: { vi: '✓', en: '✓' },
      pro: { vi: '✓', en: '✓' },
      premium: { vi: '✓', en: '✓' },
    },
  },
  {
    key: 'summary',
    label: { vi: 'Báo cáo tóm tắt phiên', en: 'Session summary report' },
    values: {
      free: { vi: 'Ngắn', en: 'Short' },
      basic: { vi: '✓', en: '✓' },
      pro: { vi: '✓', en: '✓' },
      premium: { vi: '✓', en: '✓' },
    },
  },
  {
    key: 'history',
    label: { vi: 'Lịch sử phiên', en: 'Session history' },
    values: {
      free: { vi: '—', en: '—' },
      basic: { vi: '30 ngày', en: '30 days' },
      pro: { vi: 'Không giới hạn', en: 'Unlimited' },
      premium: { vi: 'Không giới hạn', en: 'Unlimited' },
    },
  },
  {
    key: 'compare',
    label: { vi: 'So sánh điểm giữa các phiên', en: 'Compare scores between sessions' },
    values: {
      free: { vi: '—', en: '—' },
      basic: { vi: '✓', en: '✓' },
      pro: { vi: '✓', en: '✓' },
      premium: { vi: '✓', en: '✓' },
    },
  },
  {
    key: 'analytics',
    label: { vi: 'Phân tích hiệu suất chi tiết', en: 'Detailed performance analysis' },
    values: {
      free: { vi: '—', en: '—' },
      basic: { vi: '—', en: '—' },
      pro: { vi: '✓', en: '✓' },
      premium: { vi: '✓', en: '✓' },
    },
  },
  {
    key: 'progress',
    label: { vi: 'Bảng theo dõi tiến độ', en: 'Progress dashboard' },
    values: {
      free: { vi: '—', en: '—' },
      basic: { vi: '—', en: '—' },
      pro: { vi: '✓', en: '✓' },
      premium: { vi: '✓', en: '✓' },
    },
  },
  {
    key: 'advanced-feedback',
    label: { vi: 'Phản hồi có cấu trúc nâng cao', en: 'Advanced structured feedback' },
    values: {
      free: { vi: '—', en: '—' },
      basic: { vi: '—', en: '—' },
      pro: { vi: '✓', en: '✓' },
      premium: { vi: '✓', en: '✓' },
    },
  },
  {
    key: 'pdf',
    label: { vi: 'Xuất báo cáo PDF', en: 'PDF export' },
    values: {
      free: { vi: '—', en: '—' },
      basic: { vi: '—', en: '—' },
      pro: { vi: '✓', en: '✓' },
      premium: { vi: '✓', en: '✓' },
    },
  },
  {
    key: 'adaptive',
    label: { vi: 'AI điều chỉnh độ khó', en: 'Adaptive AI difficulty' },
    values: {
      free: { vi: '—', en: '—' },
      basic: { vi: '—', en: '—' },
      pro: { vi: '✓', en: '✓' },
      premium: { vi: '✓', en: '✓' },
    },
  },
  {
    key: 'company-packs',
    label: { vi: 'Bộ câu hỏi theo công ty', en: 'Company question packs' },
    values: {
      free: { vi: '—', en: '—' },
      basic: { vi: '—', en: '—' },
      pro: { vi: '✓', en: '✓' },
      premium: { vi: '✓', en: '✓' },
    },
  },
  {
    key: 'mentor-hybrid',
    label: { vi: 'Phỏng vấn kết hợp AI + mentor', en: 'Hybrid AI + mentor interview' },
    values: {
      free: { vi: '—', en: '—' },
      basic: { vi: '—', en: '—' },
      pro: { vi: '—', en: '—' },
      premium: { vi: '✓', en: '✓' },
    },
  },
  {
    key: 'mentor-observe',
    label: { vi: 'Mentor quan sát và can thiệp khi cần', en: 'Mentor observation and intervention' },
    values: {
      free: { vi: '—', en: '—' },
      basic: { vi: '—', en: '—' },
      pro: { vi: '—', en: '—' },
      premium: { vi: '✓', en: '✓' },
    },
  },
  {
    key: 'qualitative-feedback',
    label: { vi: 'Phản hồi định tính thời gian thực', en: 'Real-time qualitative feedback' },
    values: {
      free: { vi: '—', en: '—' },
      basic: { vi: '—', en: '—' },
      pro: { vi: '—', en: '—' },
      premium: { vi: '✓', en: '✓' },
    },
  },
  {
    key: 'personalized-strategy',
    label: { vi: 'Chiến lược cải thiện cá nhân hóa', en: 'Personalized improvement strategy' },
    values: {
      free: { vi: '—', en: '—' },
      basic: { vi: '—', en: '—' },
      pro: { vi: '—', en: '—' },
      premium: { vi: '✓', en: '✓' },
    },
  },
  {
    key: 'resume-tailored',
    label: { vi: 'Tùy chỉnh câu hỏi theo CV', en: 'Resume-tailored questions' },
    values: {
      free: { vi: '—', en: '—' },
      basic: { vi: '—', en: '—' },
      pro: { vi: '—', en: '—' },
      premium: { vi: '✓', en: '✓' },
    },
  },
  {
    key: 'readiness',
    label: { vi: 'Đánh giá sẵn sàng phỏng vấn', en: 'Interview readiness assessment' },
    values: {
      free: { vi: '—', en: '—' },
      basic: { vi: '—', en: '—' },
      pro: { vi: '—', en: '—' },
      premium: { vi: '✓', en: '✓' },
    },
  },
  {
    key: 'priority',
    label: { vi: 'Lên lịch ưu tiên', en: 'Priority scheduling' },
    values: {
      free: { vi: '—', en: '—' },
      basic: { vi: '—', en: '—' },
      pro: { vi: '—', en: '—' },
      premium: { vi: '✓', en: '✓' },
    },
  },
];

const columnGlow: Record<PricingPlanId, string> = {
  free: 'bg-background',
  basic: 'bg-emerald-50/80 dark:bg-emerald-950/25',
  pro: 'bg-sky-50/80 dark:bg-sky-950/25',
  premium: 'bg-amber-50/80 dark:bg-amber-950/25',
};

function formatTokens(value: number | string): string {
  return typeof value === 'number' ? value.toFixed(1) : value;
}

export function PricingComparisonSheet({
  language,
  billingPeriod,
  mode = 'landing',
  currentPlanTier = null,
  loadingPlanId = null,
  onSelectPlan,
  getActionLabel,
}: PricingComparisonSheetProps) {
  const localizedRows = comparisonRows.map((row) => {
    if (row.key === 'price') {
      return {
        ...row,
        label: {
          vi: billingPeriod === 'year' ? 'Giá / năm' : 'Giá / tháng',
          en: billingPeriod === 'year' ? 'Price / year' : 'Price / month',
        },
        values: {
          free: { vi: billingPeriod === 'year' ? '0đ' : '0đ', en: '0 VND' },
          basic: {
            vi: billingPeriod === 'year' ? '799.000đ' : '99.000đ',
            en: billingPeriod === 'year' ? '799,000 VND' : '99,000 VND',
          },
          pro: {
            vi: billingPeriod === 'year' ? '1.799.000đ' : '199.000đ',
            en: billingPeriod === 'year' ? '1,799,000 VND' : '199,000 VND',
          },
          premium: {
            vi: billingPeriod === 'year' ? '2.799.000đ' : '299.000đ',
            en: billingPeriod === 'year' ? '2,799,000 VND' : '299,000 VND',
          },
        },
      } as ComparisonRow;
    }

    if (row.key === 'extra-session') {
      return {
        ...row,
        values: {
          free: {
            vi: billingPeriod === 'year' ? 'Không hỗ trợ' : '35.000đ/phiên',
            en: billingPeriod === 'year' ? 'Not available' : '35,000 VND/session',
          },
          basic: {
            vi: billingPeriod === 'year' ? '28.000đ/phiên' : '35.000đ/phiên',
            en: billingPeriod === 'year' ? '28,000 VND/session' : '35,000 VND/session',
          },
          pro: {
            vi: billingPeriod === 'year' ? '28.000đ/phiên' : '30.000đ/phiên',
            en: billingPeriod === 'year' ? '28,000 VND/session' : '30,000 VND/session',
          },
          premium: {
            vi: billingPeriod === 'year' ? '—' : '28.000đ/phiên',
            en: billingPeriod === 'year' ? '—' : '28,000 VND/session',
          },
        },
      } as ComparisonRow;
    }

    if (row.key === 'tokens') {
      return {
        ...row,
        values: {
          free: { vi: formatTokens(7.8), en: formatTokens(7.8) },
          basic: { vi: formatTokens(7.8), en: formatTokens(7.8) },
          pro: { vi: formatTokens(10.8), en: formatTokens(10.8) },
          premium: { vi: formatTokens(10.8), en: formatTokens(10.8) },
        },
      } as ComparisonRow;
    }

    return row;
  });

  const summaryRowKeys = new Set(['price', 'sessions', 'tokens', 'extra-session']);
  const mobileHighlightRows = localizedRows.filter((row) => !summaryRowKeys.has(row.key)).slice(0, 8);
  const mobileSummaryRows = localizedRows.filter((row) => summaryRowKeys.has(row.key));

  return (
    <div
      className="overflow-hidden rounded-[32px] border border-border bg-card shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)]"
      data-mode={mode}
    >
      <div className="grid gap-3 p-2 sm:p-3 md:hidden">
        {pricingPlans.map((plan) => {
          const isCurrent = currentPlanTier === plan.id;
          const actionLabel =
            getActionLabel?.(plan.id as PricingPlanId, isCurrent)
            ?? pricingPlanContent[plan.id as keyof typeof pricingPlanContent].cta[language];

          return (
            <div
              key={`mobile-${plan.id}`}
              className={cn(
                'overflow-hidden rounded-[24px] border border-border shadow-sm',
                columnGlow[plan.id as PricingPlanId],
                plan.id === 'pro' && 'ring-2 ring-sky-500/60',
              )}
            >
              <div className="sticky top-0 z-10 border-b border-border/70 bg-background/92 px-3 py-3 backdrop-blur">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                      {language === 'vi' ? 'Gói' : 'Plan'}
                    </div>
                    <div className="truncate text-base font-semibold text-foreground sm:text-lg">{plan.name}</div>
                    <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                      {pricingPlanContent[plan.id as keyof typeof pricingPlanContent].cta[language]}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {plan.popular && (
                      <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
                        {language === 'vi' ? 'Phổ biến' : 'Popular'}
                      </span>
                    )}
                    {isCurrent && (
                      <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/70">
                        {language === 'vi' ? 'Gói hiện tại' : 'Current plan'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-3 pt-3">
                <div className="grid grid-cols-[1fr_auto] gap-x-3 border-b border-border/70 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  <span>{language === 'vi' ? 'Hạng mục' : 'Item'}</span>
                  <span>{language === 'vi' ? 'Giá trị' : 'Value'}</span>
                </div>
                <div className="divide-y divide-border/70 rounded-b-2xl border-x border-b border-border/70 bg-background/70">
                  {mobileSummaryRows.map((row) => (
                    <div key={`${plan.id}-${row.key}`} className={cn(
                      'grid grid-cols-[1fr_auto] items-center gap-x-3 px-2.5 py-2.5',
                      row.emphasized && 'bg-accent/5',
                    )}>
                      <span className={cn(
                        'text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground',
                        row.emphasized && 'text-foreground',
                      )}>
                        {row.label[language]}
                      </span>
                      <span className={cn(
                        'text-[13px] font-semibold text-foreground',
                        row.emphasized && 'text-base',
                      )}>
                        {row.values[plan.id as PricingPlanId][language]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-3 pt-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {language === 'vi' ? 'Điểm nổi bật' : 'Highlights'}
                </p>
                <div className="hidden grid-cols-1 gap-2 sm:grid">
                  {mobileHighlightRows.map((row) => {
                    const value = row.values[plan.id as PricingPlanId][language];
                    return (
                      <span
                        key={`${plan.id}-${row.key}`}
                        className={cn(
                          'inline-flex items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-[11px] leading-5',
                          value === '✓'
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                            : 'border-border bg-background text-foreground/80',
                        )}
                      >
                        <span className="font-medium">{row.label[language]}</span>
                        <span className="shrink-0 font-semibold">{value}</span>
                      </span>
                    );
                  })}
                </div>
                <div className="sm:hidden text-[11px] text-muted-foreground">
                  {language === 'vi'
                    ? 'Vuốt lên để xem chi tiết đầy đủ.'
                    : 'Swipe up to view the full detail list.'}
                </div>
              </div>

              <div className="mt-3 border-t border-border/70 bg-background/80 px-3 py-3">
                <Button
                  className="w-full"
                  variant={plan.id === 'pro' ? 'accent' : 'outline'}
                  disabled={Boolean(onSelectPlan) && loadingPlanId !== null && loadingPlanId !== plan.id}
                  onClick={() => {
                    if (onSelectPlan) {
                      onSelectPlan(plan.id as PricingPlanId);
                    }
                  }}
                  asChild={!onSelectPlan}
                >
                  {onSelectPlan ? (
                    <span>
                      {loadingPlanId === plan.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {language === 'vi' ? 'Đang xử lý' : 'Loading'}
                        </>
                      ) : (
                        actionLabel
                      )}
                    </span>
                  ) : (
                    <Link to="/signup">
                      {loadingPlanId === plan.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {language === 'vi' ? 'Đang xử lý' : 'Loading'}
                        </>
                      ) : (
                        actionLabel
                      )}
                    </Link>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-[980px] w-full border-separate border-spacing-0">
          <thead>
            <tr className="bg-muted/60">
              <th className="sticky left-0 z-20 w-[280px] border-b border-border bg-muted/95 px-5 py-4 text-left text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
                {language === 'vi' ? 'Tính năng' : 'Features'}
              </th>
              {pricingPlans.map((plan) => {
                const isCurrent = currentPlanTier === plan.id;
                return (
                  <th
                    key={plan.id}
                    className={cn(
                      'border-b border-border px-4 py-5 text-left transition-colors',
                      columnGlow[plan.id as PricingPlanId],
                      plan.id === 'pro' && 'ring-inset ring-2 ring-sky-500/60',
                    )}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-lg font-semibold text-foreground">{plan.name}</div>
                          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            {pricingPlanContent[plan.id as keyof typeof pricingPlanContent].cta[language]}
                          </div>
                        </div>
                        {plan.popular && (
                          <span className="rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
                            {language === 'vi' ? 'Phổ biến' : 'Popular'}
                          </span>
                        )}
                      </div>
                      {isCurrent && (
                        <div className="inline-flex items-center gap-1 rounded-full bg-foreground/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/70">
                          <Sparkles className="h-3.5 w-3.5" />
                          {language === 'vi' ? 'Gói hiện tại' : 'Current plan'}
                        </div>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {localizedRows.map((row) => (
              <tr key={row.key} className={row.emphasized ? 'bg-accent/5' : ''}>
                <th className="sticky left-0 z-10 border-b border-border bg-card px-5 py-4 text-left text-sm font-medium text-foreground">
                  {row.label[language]}
                </th>
                {pricingPlans.map((plan) => {
                  const value = row.values[plan.id as PricingPlanId][language];
                  const isFeature = value === '✓';
                  const isMissing = value === '—';
                  return (
                    <td
                      key={`${row.key}-${plan.id}`}
                      className={cn(
                        'border-b border-border px-4 py-4 text-sm text-foreground/80',
                        row.emphasized && 'font-semibold text-foreground',
                        columnGlow[plan.id as PricingPlanId],
                      )}
                    >
                      <span
                        className={cn(
                          'inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm',
                          isFeature && 'bg-emerald-500/10 font-semibold text-emerald-700 dark:text-emerald-300',
                          isMissing && 'text-muted-foreground',
                        )}
                      >
                        {isFeature ? <CheckCircle2 className="h-4 w-4" /> : null}
                        {value}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-muted/40">
              <td className="sticky left-0 z-10 border-t border-border bg-muted/95 px-5 py-5 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
                {language === 'vi' ? 'Thanh toán' : 'Checkout'}
              </td>
              {pricingPlans.map((plan) => {
                const isCurrent = currentPlanTier === plan.id;
                const actionLabel =
                  getActionLabel?.(plan.id as PricingPlanId, isCurrent)
                  ?? pricingPlanContent[plan.id as keyof typeof pricingPlanContent].cta[language];
                const buttonContent = loadingPlanId === plan.id
                  ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {language === 'vi' ? 'Đang xử lý' : 'Loading'}
                      </>
                    )
                  : (
                      <>
                        {actionLabel}
                      </>
                    );

                return (
                  <td
                    key={`cta-${plan.id}`}
                    className={cn(
                      'border-t border-border px-4 py-5',
                      columnGlow[plan.id as PricingPlanId],
                    )}
                  >
                    <Button
                      className="w-full"
                      variant={plan.id === 'pro' ? 'accent' : 'outline'}
                      disabled={Boolean(onSelectPlan) && loadingPlanId !== null && loadingPlanId !== plan.id}
                      onClick={() => {
                        if (onSelectPlan) {
                          onSelectPlan(plan.id as PricingPlanId);
                        }
                      }}
                      asChild={!onSelectPlan}
                    >
                      {onSelectPlan ? (
                        <span>{buttonContent}</span>
                      ) : (
                        <Link to="/signup">{buttonContent}</Link>
                      )}
                    </Button>
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
