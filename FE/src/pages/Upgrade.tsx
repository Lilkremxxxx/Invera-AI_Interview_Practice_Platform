import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CreditCard, Gift, Loader2, ShieldCheck, ShoppingBag, Plus, Minus } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { billingApi, PaymentOrderOut } from '@/lib/api';
import { formatBillingPeriod, formatPlanLabel, formatPlanStatus } from '@/lib/plans';
import { PricingComparisonSheet } from '@/components/pricing/PricingComparisonSheet';
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

function getPaymentStatusBadgeClass(status: string) {
  switch (status) {
    case 'pending':
      return 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-50';
    case 'succeeded':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50';
    case 'failed':
      return 'border-red-200 bg-red-50 text-red-700 hover:bg-red-50';
    case 'cancelled':
      return 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-50';
    default:
      return 'border-border bg-muted text-foreground';
  }
}

const copy = {
  vi: {
    title: 'Nâng cấp gói',
    subtitle: 'Mở khóa Basic hoặc Pro để tiếp tục luyện tập ngoài giới hạn Free trial.',
    qnaLockedTitle: 'QnA đang bị khóa',
    qnaLockedDescription: 'Gói Free không dùng được QnA. Hãy nâng cấp hoặc nhập redeem code UUID do admin cấp để mở khóa.',
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
    redeemDescription: 'Bạn có thể kích hoạt gói bằng redeem code UUID do admin cấp thay vì thanh toán.',
    redeemPlaceholder: 'Nhập redeem code UUID',
    redeemButton: 'Áp dụng mã',
    redeeming: 'Đang áp dụng mã',
    redeemSuccessTitle: 'Redeem code thành công',
    redeemSuccessDescription: 'Gói của bạn đã được cập nhật bằng redeem code UUID.',
    redeemErrorTitle: 'Không thể áp dụng redeem code',
    monthly: 'Theo tháng',
    yearly: 'Theo năm',
    perMonth: '/tháng',
    perYear: '/năm',
    currentPlan: 'Đang dùng',
    redirecting: 'Đang chuyển sang PayOS',
    renewPlan: 'Gia hạn gói',
    upgradeTo: 'Nâng cấp lên',
    paymentHistory: 'Lịch sử thanh toán',
    noOrders: 'Chưa có giao dịch nào được tạo.',
    orderCode: 'Mã đơn',
    continuePayment: 'Tiếp tục ->',
    paymentUpdatedTitle: 'Thanh toán thành công',
    paymentUpdatedDescription: 'Gói của bạn đã được cập nhật sau khi PayOS xác nhận giao dịch.',
    paymentSuccessToastTitle: 'Thanh toán thành công',
    paymentSuccessToastDescription: 'Gói của bạn đã được kích hoạt.',
    paymentFailedToastTitle: 'Thanh toán chưa hoàn tất',
    paymentFailedToastDescription: 'PayOS chưa xác nhận giao dịch thành công. Bạn có thể thử lại.',
    paymentInvalidToastTitle: 'Phản hồi thanh toán không hợp lệ',
    paymentInvalidToastDescription: 'Không thể xác minh chữ ký từ cổng thanh toán.',
    checkoutErrorTitle: 'Không thể tạo phiên thanh toán',
    additionalSessionsLabel: 'Số phiên mua thêm',
    buySessionsTitle: 'Mua thêm phiên luyện tập',
    buySessionsDescription: 'Mua thêm phiên luyện tập riêng lẻ để tiếp tục sử dụng mà không cần nâng cấp gói.',
    sessionQtyLabel: 'Số lượng phiên',
    unitPriceLabel: 'Đơn giá',
    totalAmountLabel: 'Tổng tiền',
    buyNowButton: 'Thanh toán ngay',
    pricingTierLabel: 'Đơn giá áp dụng cho gói',
    checkoutSessionsErrorTitle: 'Không thể tạo phiên thanh toán mua session',
  },
  en: {
    title: 'Upgrade plan',
    subtitle: 'Unlock Basic, Pro, or Premium to keep practicing beyond the Free trial limit.',
    qnaLockedTitle: 'QnA is locked',
    qnaLockedDescription: 'The Free plan cannot use QnA. Upgrade or enter a UUID redeem code issued by an admin to unlock it.',
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
    redeemDescription: 'You can activate a plan with an admin-issued UUID redeem code instead of paying.',
    redeemPlaceholder: 'Enter your UUID redeem code',
    redeemButton: 'Apply code',
    redeeming: 'Applying code',
    redeemSuccessTitle: 'Redeem code applied',
    redeemSuccessDescription: 'Your plan was updated using the UUID redeem code.',
    redeemErrorTitle: 'Unable to apply redeem code',
    monthly: 'Monthly',
    yearly: 'Yearly',
    perMonth: '/month',
    perYear: '/year',
    currentPlan: 'Current plan',
    redirecting: 'Redirecting to PayOS',
    renewPlan: 'Renew plan',
    upgradeTo: 'Upgrade to',
    paymentHistory: 'Payment history',
    noOrders: 'No transactions have been created yet.',
    orderCode: 'Order code',
    continuePayment: 'Continue ->',
    paymentUpdatedTitle: 'Payment successful',
    paymentUpdatedDescription: 'Your plan was updated after PayOS confirmed the transaction.',
    paymentSuccessToastTitle: 'Payment successful',
    paymentSuccessToastDescription: 'Your plan is now active.',
    paymentFailedToastTitle: 'Payment not completed',
    paymentFailedToastDescription: 'PayOS did not confirm a successful transaction. You can try again.',
    paymentInvalidToastTitle: 'Invalid payment response',
    paymentInvalidToastDescription: 'The payment gateway signature could not be verified.',
    checkoutErrorTitle: 'Unable to create payment session',
    additionalSessionsLabel: 'Extra sessions balance',
    buySessionsTitle: 'Purchase extra sessions',
    buySessionsDescription: 'Buy individual sessions to keep practicing without upgrading your plan.',
    sessionQtyLabel: 'Number of sessions',
    unitPriceLabel: 'Unit price',
    totalAmountLabel: 'Total amount',
    buyNowButton: 'Purchase now',
    pricingTierLabel: 'Price tier applied for',
    checkoutSessionsErrorTitle: 'Unable to create session purchase session',
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
  const [sessionQty, setSessionQty] = useState<number>(5);
  const [loadingSessions, setLoadingSessions] = useState<boolean>(false);

  const unitPrice = useMemo(() => {
    const tier = user?.plan_tier;
    if (tier === 'pro') return 30000;
    if (tier === 'premium') return 28000;
    return 35000;
  }, [user?.plan_tier]);

  const handleBuySessions = async () => {
    if (sessionQty <= 0) return;
    setLoadingSessions(true);
    try {
      const response = await billingApi.createBuySessionsCheckout(sessionQty);
      window.location.href = response.payment_url;
    } catch (error) {
      toast({
        title: text.checkoutSessionsErrorTitle,
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setLoadingSessions(false);
    }
  };

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
      let successDesc = text.paymentSuccessToastDescription;
      if (paymentPlan) {
        if (paymentPlan === 'additional_sessions') {
          successDesc = language === 'vi'
            ? 'Mua thêm phiên thành công. Các phiên bổ sung đã được cộng vào tài khoản của bạn.'
            : 'Additional sessions purchased successfully. Extra sessions have been added to your account.';
        } else {
          successDesc = language === 'vi'
            ? `Gói ${paymentPlan.toUpperCase()} đã được kích hoạt.`
            : `Your ${paymentPlan.toUpperCase()} plan is now active.`;
        }
      }
      toast({
        title: text.paymentSuccessToastTitle,
        description: successDesc,
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

      {/* Current Status Bar (Full width) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            {text.currentStatus}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="px-3 py-1 text-sm">{formatPlanLabel(user, language)}</Badge>
              {user?.plan_status && (
                <Badge variant={user.plan_status === 'active' ? 'default' : 'outline'} className="px-3 py-1 text-sm">
                  {formatPlanStatus(user, language)}
                </Badge>
              )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 flex-1 max-w-3xl">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">{text.sessionsUsed}</div>
                <div className="text-sm font-semibold text-foreground">
                  {user?.sessions_used ?? 0}
                  {typeof user?.session_limit === 'number' ? ` / ${user.session_limit}` : ` / ${text.unlimited}`}
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">{text.billingCycle}</div>
                <div className="text-sm font-semibold text-foreground">
                  {formatBillingPeriod(user?.plan_billing_period ?? null, language)}
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">{text.expiresAt}</div>
                <div className="text-sm font-semibold text-foreground">
                  {user?.plan_expires_at ? new Date(user.plan_expires_at).toLocaleString(locale) : text.notApplied}
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">{text.additionalSessionsLabel}</div>
                <div className="text-sm font-semibold text-foreground">
                  {user?.additional_sessions ?? 0}
                </div>
              </div>
            </div>
          </div>

          {((!user?.can_start_new_session) || (user && !user.can_use_qna)) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Grid Below Status */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Choose Plan (Pricing Comparison Sheet) */}
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
            <CardContent>
              <PricingComparisonSheet
                billingPeriod={billingPeriod}
                currentPlanTier={(user?.plan_tier as 'basic' | 'pro' | 'premium' | 'free' | undefined) ?? null}
                language={language}
                loadingPlanId={loadingPlanId as 'basic' | 'pro' | 'premium' | null}
                mode="upgrade"
                getActionLabel={(planId, isCurrent) =>
                  isCurrent ? text.renewPlan : `${text.upgradeTo} ${planId === 'free' ? 'Free' : planId.charAt(0).toUpperCase() + planId.slice(1)}`
                }
                onSelectPlan={(planId) => {
                  if (planId === 'free') return;
                  void handleCheckout(planId as 'basic' | 'pro' | 'premium');
                }}
              />
            </CardContent>
          </Card>

          {/* Payment History */}
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
                        {order.plan_tier === 'additional_sessions' ? (
                          language === 'vi' ? (
                            `Mua thêm ${order.billing_period} phiên`
                          ) : (
                            `Purchase ${order.billing_period} sessions`
                          )
                        ) : (
                          `${order.plan_tier.toUpperCase()} · ${formatBillingPeriod(order.billing_period, language)}`
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(order.amount_vnd)} · {text.orderCode} {order.provider_order_ref}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getPaymentStatusBadgeClass(order.status)}>
                        {formatPaymentStatus(order.status, language)}
                      </Badge>
                      {order.provider === 'payos' && order.status === 'pending' && order.payment_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="border-sky-200 text-sky-700 hover:bg-sky-50 hover:text-sky-800"
                        >
                          <a href={order.payment_url}>{text.continuePayment}</a>
                        </Button>
                      )}
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

        <div className="space-y-6">
          {/* Redeem Code */}
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

          {/* Buy Sessions */}
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                {text.buySessionsTitle}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {text.buySessionsDescription}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-muted/40">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">
                    {text.pricingTierLabel}: <strong className="text-foreground">{formatPlanLabel(user, language)}</strong>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {text.unitPriceLabel}: <strong className="text-foreground">{formatCurrency(unitPrice)}</strong> / {language === 'vi' ? 'phiên' : 'session'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSessionQty(Math.max(1, sessionQty - 1))}
                    disabled={sessionQty <= 1 || loadingSessions}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={sessionQty}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setSessionQty(isNaN(val) ? 1 : Math.max(1, val));
                    }}
                    className="w-16 text-center"
                    disabled={loadingSessions}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSessionQty(sessionQty + 1)}
                    disabled={loadingSessions}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {[1, 5, 10, 20].map((qty) => (
                  <Button
                    key={qty}
                    variant="outline"
                    size="sm"
                    onClick={() => setSessionQty(qty)}
                    disabled={loadingSessions}
                    className={sessionQty === qty ? 'border-accent text-accent bg-accent/5' : ''}
                  >
                    +{qty}
                  </Button>
                ))}
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <div>
                  <div className="text-sm text-muted-foreground">{text.totalAmountLabel}</div>
                  <div className="text-2xl font-bold text-accent">{formatCurrency(unitPrice * sessionQty)}</div>
                </div>
                <Button
                  onClick={handleBuySessions}
                  disabled={loadingSessions || sessionQty <= 0}
                  className="px-6"
                >
                  {loadingSessions ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      {language === 'vi' ? 'Đang xử lý...' : 'Processing...'}
                    </>
                  ) : (
                    <>
                      {text.buyNowButton}
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
