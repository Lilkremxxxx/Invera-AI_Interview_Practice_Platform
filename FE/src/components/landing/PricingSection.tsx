import { Button } from '@/components/ui/button';
import { CheckCircle2, Mic, Crown, Zap } from 'lucide-react';
import { pricingPlans } from '@/lib/mock-data';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const planIcons: Record<string, React.ReactNode> = {
  free: <Mic className="w-5 h-5" />,
  basic: <Crown className="w-5 h-5" />,
  pro: <Crown className="w-5 h-5 text-yellow-500" />,
  premium: <Crown className="w-5 h-5 text-yellow-500" />,
};

const planColors: Record<string, { card: string; header: string; badge: string; divider: string; button: string }> = {
  free: {
    card: 'bg-card border-border',
    header: 'bg-muted/40',
    badge: '',
    divider: 'border-border',
    button: 'variant-outline',
  },
  basic: {
    card: 'bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800',
    header: 'bg-violet-100/60 dark:bg-violet-900/30',
    badge: '',
    divider: 'border-violet-200 dark:border-violet-800',
    button: 'bg-violet-600 hover:bg-violet-700 text-white',
  },
  pro: {
    card: 'bg-violet-100 dark:bg-violet-900/40 border-violet-300 dark:border-violet-700',
    header: 'bg-violet-200/60 dark:bg-violet-800/40',
    badge: '',
    divider: 'border-violet-300 dark:border-violet-700',
    button: 'bg-violet-700 hover:bg-violet-800 text-white',
  },
  premium: {
    card: 'bg-violet-200/70 dark:bg-violet-800/40 border-violet-400 dark:border-violet-600',
    header: 'bg-violet-300/50 dark:bg-violet-700/40',
    badge: '',
    divider: 'border-violet-400 dark:border-violet-600',
    button: 'bg-violet-800 hover:bg-violet-900 text-white',
  },
};

function formatVnd(amount: number | null) {
  if (amount === null) return '—';
  if (amount === 0) return '0đ';
  return amount.toLocaleString('vi-VN') + 'đ';
}

export const PricingSection = () => {
  const [billing, setBilling] = useState<'month' | 'year'>('month');

  return (
    <section id="pricing" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            Bảng giá
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-primary dark:text-foreground mb-4">
            Chọn gói phù hợp với bạn
          </h2>
          <p className="text-lg text-primary/70 dark:text-muted-foreground max-w-2xl mx-auto">
            Bắt đầu miễn phí, nâng cấp khi cần. Không phí ẩn.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <button
            onClick={() => setBilling('month')}
            className={cn(
              'px-5 py-2 rounded-full text-sm font-medium transition-all',
              billing === 'month'
                ? 'bg-accent text-white shadow'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            Theo tháng
          </button>
          <button
            onClick={() => setBilling('year')}
            className={cn(
              'px-5 py-2 rounded-full text-sm font-medium transition-all',
              billing === 'year'
                ? 'bg-accent text-white shadow'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            Theo năm
            <span className="ml-2 text-xs bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 px-2 py-0.5 rounded-full font-semibold">
              Tiết kiệm ~33%
            </span>
          </button>
        </div>

        {/* 4-column grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 max-w-7xl mx-auto items-start">
          {pricingPlans.map((plan) => {
            const colors = planColors[plan.id];
            const price = billing === 'month' ? plan.priceMonth : plan.priceYear;
            const priceSuffix = billing === 'month' ? '/tháng' : '/năm';

            return (
              <div
                key={plan.id}
                className={cn(
                  'relative rounded-2xl border overflow-hidden transition-all duration-300 flex flex-col',
                  colors.card,
                  plan.popular && 'ring-2 ring-violet-500 shadow-xl shadow-violet-200/40 dark:shadow-violet-900/30'
                )}
              >
                {plan.popular && (
                  <div className="absolute top-0 inset-x-0 flex justify-center">
                    <span className="-translate-y-1/2 inline-block px-4 py-1 rounded-full bg-accent text-white text-xs font-semibold shadow">
                      Phổ biến nhất
                    </span>
                  </div>
                )}

                {/* Top section — description + targeting */}
                <div className={cn('p-5 pt-6', colors.header)}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                    <span className="text-foreground/70">{planIcons[plan.id]}</span>
                  </div>
                  <p className="text-sm text-foreground/60 mb-4 leading-snug">{plan.description}</p>

                  <p className="text-xs font-semibold text-foreground/50 uppercase tracking-wide mb-2">
                    Chọn <strong className="font-bold text-foreground">{plan.name}</strong> nếu bạn:
                  </p>
                  <ul className="space-y-1.5 mb-3">
                    {plan.targetUsers.map((u, i) => (
                      <li key={i} className="text-sm text-foreground/70 flex items-start gap-1.5">
                        <span className="mt-0.5 text-foreground/40">•</span>
                        <span>{u}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Divider */}
                <div className={cn('border-t', colors.divider)} />

                {/* Bottom section — price + features */}
                <div className="p-5 flex flex-col flex-1">
                  {/* Price */}
                  <div className="mb-5">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-foreground">
                        {formatVnd(price)}
                      </span>
                      <span className="text-sm text-foreground/50">{priceSuffix}</span>
                    </div>
                    <div className="mt-1.5 text-xs text-foreground/50 space-y-0.5">
                      <div>{plan.sessionsPerMonth} phiên / tháng &nbsp;·&nbsp; {plan.tokensPerSession.toLocaleString()} tokens / phiên</div>
                      <div>
                        Phiên thêm: <span className="font-medium text-foreground/70">{formatVnd(plan.extraSessionMonth)}/phiên</span>
                        {plan.extraSessionYear !== null && (
                          <span className="ml-1 text-foreground/40">({formatVnd(plan.extraSessionYear)}/phiên/năm)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  <p className="text-xs font-semibold text-foreground/50 uppercase tracking-wide mb-3">
                    {plan.id === 'free' ? 'Với Free, bạn nhận được:' :
                      plan.id === 'basic' ? 'Tính năng bạn nhận được:' :
                      plan.id === 'pro' ? 'Tất cả Basic, cộng thêm:' :
                      'Tất cả Pro, cộng thêm:'}
                  </p>
                  <ul className="space-y-2.5 flex-1">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-foreground/80">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Button
                    className={cn('w-full mt-6 font-semibold', colors.button)}
                    variant={plan.popular ? 'default' : 'outline'}
                    size="lg"
                    asChild
                  >
                    <Link to="/signup">{plan.cta}</Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Extra session note */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          * Giá phiên thêm (/year) áp dụng khi mua gói theo năm. Free plan không hỗ trợ mua thêm phiên theo năm.
        </p>
      </div>
    </section>
  );
};
