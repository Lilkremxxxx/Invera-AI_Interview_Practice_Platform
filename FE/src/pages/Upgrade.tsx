import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, CreditCard, Gift, Loader2, ShieldCheck } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { billingApi, PaymentOrderOut } from '@/lib/api';
import { pricingPlans } from '@/lib/mock-data';
import { formatBillingPeriod, formatPlanLabel, formatPlanStatus } from '@/lib/plans';
import { pricingPlanContent } from '@/lib/pricing-content';
import { useToast } from '@/hooks/use-toast';

function formatCurrency(amount: number) {
  return `${amount.toLocaleString('vi-VN')}đ`;
}

function formatPaymentStatus(status: string, language: 'vi' | 'en') {
  switch (status) {
    case 'pending':
      return language === 'vi' ? 'Đang chờ' : 'Pending';
    case 'succeeded':
      return language === 'vi' ? 'Thành công' : 'Succeeded';
    case 'failed':
      return language === 'vi' ? 'Thất bại' : 'Failed';
    case 'cancelled':
      return language === 'vi' ? 'Đã hủy' : 'Cancelled';
    default:
      return status;
  }
}

const copy = {
  vi: {
    title: 'Nâng cấp gói',
    subtitle: 'Mở khóa Basic hoặc Pro để tiếp tục luyện tập ngoài giới hạn Free trial.',
    qnaLockedTitle: 'QnA đang bị khóa',
    qnaLockedDescription: 'Gói Free không dùng được QnA. Hãy nâng cấp hoặc nhập redeem code để mở khóa.',
    viewSessions: 'Xem lịch sử session',
    currentStatus: 'Trạng thái hiện tại',
    sessionsUsed: 'Sessions đã dùng',
    unlimited: 'Không giới hạn',
    billingCycle: 'Chu kỳ',
    expiresAt: 'Hết hạn',
    notApplied: 'Chưa áp dụng',
    trialExhaustedTitle: 'Free trial đã hết',
    trialExhaustedDescription: 'Bạn đã dùng session miễn phí duy nhất. Hãy chọn Basic hoặc Pro để tiếp tục.',
    choosePlan: 'Chọn gói nâng cấp',
    redeemTitle: 'Redeem code',
    redeemDescription: 'Bạn có thể kích hoạt gói bằng redeem code thay vì thanh toán.',
    redeemPlaceholder: 'Nhập redeem code',
    redeemButton: 'Áp dụng mã',
    redeeming: 'Đang áp dụng mã',
    redeemSuccessTitle: 'Redeem code thành công',
    redeemSuccessDescription: 'Gói của bạn đã được cập nhật bằng redeem code.',
    redeemErrorTitle: 'Không thể áp dụng redeem code',
    monthly: 'Theo tháng',
    yearly: 'Theo năm',
    perMonth: '/tháng',
    perYear: '/năm',
    currentPlan: 'Đang dùng',
    redirecting: 'Đang chuyển sang VNPay',
    renewPlan: 'Gia hạn gói',
    upgradeTo: 'Nâng cấp lên',
    paymentHistory: 'Lịch sử thanh toán',
    noOrders: 'Chưa có giao dịch nào được tạo.',
    orderCode: 'Mã đơn',
    paymentUpdatedTitle: 'Thanh toán thành công',
    paymentUpdatedDescription: 'Gói của bạn đã được cập nhật sau khi VNPay xác nhận giao dịch.',
    paymentSuccessToastTitle: 'Thanh toán thành công',
    paymentSuccessToastDescription: 'Gói của bạn đã được kích hoạt.',
    paymentFailedToastTitle: 'Thanh toán chưa hoàn tất',
    paymentFailedToastDescription: 'VNPay chưa xác nhận giao dịch thành công. Bạn có thể thử lại.',
    paymentInvalidToastTitle: 'Phản hồi thanh toán không hợp lệ',
    paymentInvalidToastDescription: 'Không thể xác minh chữ ký từ cổng thanh toán.',
    checkoutErrorTitle: 'Không thể tạo phiên thanh toán',
  },
  en: {
    title: 'Upgrade plan',
    subtitle: 'Unlock Basic, Pro, or Premium to keep practicing beyond the Free trial limit.',
    qnaLockedTitle: 'QnA is locked',
    qnaLockedDescription: 'The Free plan cannot use QnA. Upgrade or enter a redeem code to unlock it.',
    viewSessions: 'View session history',
    currentStatus: 'Current status',
    sessionsUsed: 'Sessions used',
    unlimited: 'Unlimited',
    billingCycle: 'Billing cycle',
    expiresAt: 'Expires',
    notApplied: 'Not applied',
    trialExhaustedTitle: 'Free trial exhausted',
    trialExhaustedDescription: 'You have used your only free session. Choose Basic or Pro to continue.',
    choosePlan: 'Choose your upgrade',
    redeemTitle: 'Redeem code',
    redeemDescription: 'You can activate a plan with a redeem code instead of paying.',
    redeemPlaceholder: 'Enter your redeem code',
    redeemButton: 'Apply code',
    redeeming: 'Applying code',
    redeemSuccessTitle: 'Redeem code applied',
    redeemSuccessDescription: 'Your plan was updated using the redeem code.',
    redeemErrorTitle: 'Unable to apply redeem code',
    monthly: 'Monthly',
    yearly: 'Yearly',
    perMonth: '/month',
    perYear: '/year',
    currentPlan: 'Current plan',
    redirecting: 'Redirecting to VNPay',
    renewPlan: 'Renew plan',
    upgradeTo: 'Upgrade to',
    paymentHistory: 'Payment history',
    noOrders: 'No transactions have been created yet.',
    orderCode: 'Order code',
    paymentUpdatedTitle: 'Payment successful',
    paymentUpdatedDescription: 'Your plan was updated after VNPay confirmed the transaction.',
    paymentSuccessToastTitle: 'Payment successful',
    paymentSuccessToastDescription: 'Your plan is now active.',
    paymentFailedToastTitle: 'Payment not completed',
    paymentFailedToastDescription: 'VNPay did not confirm a successful transaction. You can try again.',
    paymentInvalidToastTitle: 'Invalid payment response',
    paymentInvalidToastDescription: 'The payment gateway signature could not be verified.',
    checkoutErrorTitle: 'Unable to create payment session',
  },
} as const;

export default function Upgrade() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, refreshUser } = useAuthContext();
  const { language } = useLanguage();
  const { toast } = useToast();
  const text = copy[language];
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';
  const [billingPeriod, setBillingPeriod] = useState<'month' | 'year'>('month');
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  const purchasablePlans = useMemo(
    () => pricingPlans.filter((plan) => plan.id === 'basic' || plan.id === 'pro' || plan.id === 'premium'),
    [],
  );

  const paymentState = searchParams.get('payment');
  const paymentPlan = searchParams.get('plan');

  useEffect(() => {
    if (user?.is_admin) {
      navigate('/app', { replace: true });
    }
  }, [navigate, user?.is_admin]);

  useEffect(() => {
    if (!user || user.is_admin) return;
    void refreshUser();
  }, [refreshUser, user?.id, user?.is_admin]);

  useEffect(() => {
    if (!paymentState) return;

    void refreshUser();

    if (paymentState === 'success') {
      toast({
        title: text.paymentSuccessToastTitle,
        description: paymentPlan
          ? language === 'vi'
            ? `Gói ${paymentPlan.toUpperCase()} đã được kích hoạt.`
            : `Your ${paymentPlan.toUpperCase()} plan is now active.`
          : text.paymentSuccessToastDescription,
      });
      return;
    }

    if (paymentState === 'failed') {
      toast({
        title: text.paymentFailedToastTitle,
        description: text.paymentFailedToastDescription,
        variant: 'destructive',
      });
      return;
    }

    if (paymentState === 'invalid') {
      toast({
        title: text.paymentInvalidToastTitle,
        description: text.paymentInvalidToastDescription,
        variant: 'destructive',
      });
    }
  }, [language, paymentPlan, paymentState, refreshUser, text, toast]);

  const { data: orders = [], isLoading: isLoadingOrders } = useQuery<PaymentOrderOut[]>({
    queryKey: ['payment-orders'],
    queryFn: billingApi.listOrders,
    enabled: !user?.is_admin,
  });

  const handleCheckout = async (planId: 'basic' | 'pro' | 'premium') => {
    setLoadingPlanId(planId);
    try {
      const response = await billingApi.createCheckout(planId, billingPeriod);
      window.location.href = response.payment_url;
    } catch (error) {
      toast({
        title: text.checkoutErrorTitle,
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setLoadingPlanId(null);
    }
  };

  const handleRedeem = async () => {
    if (!redeemCode.trim()) return;

    setRedeeming(true);
    try {
      await billingApi.redeemCode(redeemCode.trim());
      await refreshUser();
      setRedeemCode('');
      toast({
        title: text.redeemSuccessTitle,
        description: text.redeemSuccessDescription,
      });
    } catch (error) {
      toast({
        title: text.redeemErrorTitle,
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{text.title}</h1>
          <p className="text-muted-foreground">{text.subtitle}</p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/app/sessions">{text.viewSessions}</Link>
        </Button>
      </div>

      {paymentState === 'success' && (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>{text.paymentUpdatedTitle}</AlertTitle>
          <AlertDescription>{text.paymentUpdatedDescription}</AlertDescription>
        </Alert>
      )}

      <div className="grid lg:grid-cols-[1.1fr_1.6fr] gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              {text.currentStatus}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{formatPlanLabel(user, language)}</Badge>
              {user?.plan_status && (
                <Badge variant={user.plan_status === 'active' ? 'default' : 'outline'}>
                  {formatPlanStatus(user, language)}
                </Badge>
              )}
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                {text.sessionsUsed}:{' '}
                <strong className="text-foreground">{user?.sessions_used ?? 0}</strong>
                {typeof user?.session_limit === 'number' ? (
                  <>
                    {' '}
                    / <strong className="text-foreground">{user.session_limit}</strong>
                  </>
                ) : (
                  <>
                    {' '}
                    / <strong className="text-foreground">{text.unlimited}</strong>
                  </>
                )}
              </p>
              <p>
                {text.billingCycle}:{' '}
                <strong className="text-foreground">
                  {formatBillingPeriod(user?.plan_billing_period ?? null, language)}
                </strong>
              </p>
              <p>
                {text.expiresAt}:{' '}
                <strong className="text-foreground">
                  {user?.plan_expires_at ? new Date(user.plan_expires_at).toLocaleString(locale) : text.notApplied}
                </strong>
              </p>
            </div>
            {!user?.can_start_new_session && (
              <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                <AlertTitle>{text.trialExhaustedTitle}</AlertTitle>
                <AlertDescription>{text.trialExhaustedDescription}</AlertDescription>
              </Alert>
            )}
            {user && !user.can_use_qna && (
              <Alert className="border-sky-200 bg-sky-50 text-sky-900">
                <AlertTitle>{text.qnaLockedTitle}</AlertTitle>
                <AlertDescription>{text.qnaLockedDescription}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5" />
                {text.redeemTitle}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{text.redeemDescription}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col gap-3 md:flex-row">
                <Input
                  value={redeemCode}
                  onChange={(event) => setRedeemCode(event.target.value)}
                  placeholder={text.redeemPlaceholder}
                />
                <Button onClick={handleRedeem} disabled={redeeming || !redeemCode.trim()}>
                  {redeeming ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {text.redeeming}
                    </>
                  ) : (
                    text.redeemButton
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-4">
              <CardTitle>{text.choosePlan}</CardTitle>
              <Tabs value={billingPeriod} onValueChange={(value) => setBillingPeriod(value as 'month' | 'year')}>
                <TabsList>
                  <TabsTrigger value="month">{text.monthly}</TabsTrigger>
                  <TabsTrigger value="year">{text.yearly}</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              {purchasablePlans.map((plan) => {
                const price = billingPeriod === 'month' ? plan.priceMonth : plan.priceYear;
                const isCurrent = user?.plan_tier === plan.id && user?.plan_status === 'active';
                const localizedPlan = pricingPlanContent[plan.id as 'basic' | 'pro' | 'premium'];
                return (
                  <div key={plan.id} className="rounded-2xl border border-border p-5 bg-card space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-semibold text-foreground">{plan.name}</h2>
                        <p className="text-sm text-muted-foreground">{localizedPlan.description[language]}</p>
                      </div>
                      {isCurrent && <Badge>{text.currentPlan}</Badge>}
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-foreground">{formatCurrency(price)}</div>
                      <div className="text-sm text-muted-foreground">
                        {billingPeriod === 'month' ? text.perMonth : text.perYear}
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {localizedPlan.features[language].slice(0, 5).map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      variant={plan.id === 'pro' ? 'accent' : 'outline'}
                      onClick={() => handleCheckout(plan.id as 'basic' | 'pro' | 'premium')}
                      disabled={loadingPlanId !== null}
                    >
                      {loadingPlanId === plan.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {text.redirecting}
                        </>
                      ) : (
                        <>
                          {isCurrent ? text.renewPlan : `${text.upgradeTo} ${plan.name}`}
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{text.paymentHistory}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoadingOrders ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-accent" />
                </div>
              ) : orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">{text.noOrders}</p>
              ) : (
                orders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-xl border border-border p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="font-medium text-foreground">
                        {order.plan_tier.toUpperCase()} · {formatBillingPeriod(order.billing_period, language)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(order.amount_vnd)} · {text.orderCode} {order.provider_order_ref}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={order.status === 'succeeded' ? 'default' : 'outline'}>
                        {formatPaymentStatus(order.status, language)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleString(locale)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
