import { useEffect, useMemo, useState } from 'react';
import { Check, Clock3, Copy, Gift, Loader2, RefreshCw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { adminApi, AdminRedeemCodeOut } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

type PlanTier = 'basic' | 'pro' | 'premium';
type ExpiryMode = '7_days' | '30_days' | 'custom';

function formatCodeDate(value: string, language: 'vi' | 'en') {
  return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function resolveStatus(code: AdminRedeemCodeOut) {
  if (code.redeemed_at) {
    return 'redeemed';
  }
  if (new Date(code.expires_at).getTime() <= Date.now()) {
    return 'expired';
  }
  return 'active';
}

export function AdminRedeemCodes() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [planTier, setPlanTier] = useState<PlanTier>('basic');
  const [expiryMode, setExpiryMode] = useState<ExpiryMode>('7_days');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCodes, setLoadingCodes] = useState(true);
  const [codes, setCodes] = useState<AdminRedeemCodeOut[]>([]);
  const [generatedCode, setGeneratedCode] = useState<AdminRedeemCodeOut | null>(null);

  const copy = useMemo(() => {
    return language === 'vi'
      ? {
          title: 'Redeem code',
          subtitle: 'Sinh mã UUID cho Basic, Pro hoặc Premium. Mỗi mã chỉ dùng được một lần và có thể hết hạn theo thời gian.',
          generatorTitle: 'Tạo redeem code',
          generatorDescription: 'Chọn gói, chọn thời hạn rồi bấm generate. Code mới sẽ xuất hiện ngay bên dưới.',
          planLabel: 'Chọn gói',
          expiryLabel: 'Hạn dùng',
          expiry7: '7 ngày',
          expiry30: '30 ngày',
          expiryCustom: 'Ngày cụ thể',
          customPlaceholder: 'Chọn ngày hết hạn',
          generate: 'Generate code',
          generating: 'Đang tạo',
          generatedTitle: 'Code vừa tạo',
          copy: 'Sao chép',
          copied: 'Đã sao chép',
          recentTitle: 'Code gần đây',
          noCodes: 'Chưa có redeem code nào.',
          statusActive: 'Đang chờ',
          statusRedeemed: 'Đã dùng',
          statusExpired: 'Hết hạn',
          usedBy: 'Dùng bởi',
        }
      : {
          title: 'Redeem Codes',
          subtitle: 'Generate UUID codes for Basic, Pro, or Premium. Each code can only be redeemed once and can expire over time.',
          generatorTitle: 'Generate redeem code',
          generatorDescription: 'Pick a plan, choose an expiry rule, then generate. The new code will appear below immediately.',
          planLabel: 'Choose plan',
          expiryLabel: 'Expiry',
          expiry7: '7 days',
          expiry30: '30 days',
          expiryCustom: 'Exact date',
          customPlaceholder: 'Choose expiration date',
          generate: 'Generate code',
          generating: 'Generating',
          generatedTitle: 'Generated code',
          copy: 'Copy',
          copied: 'Copied',
          recentTitle: 'Recent codes',
          noCodes: 'No redeem codes yet.',
          statusActive: 'Active',
          statusRedeemed: 'Redeemed',
          statusExpired: 'Expired',
          usedBy: 'Used by',
        };
  }, [language]);

  const loadCodes = async () => {
    setLoadingCodes(true);
    try {
      const rows = await adminApi.getRedeemCodes();
      setCodes(rows);
    } catch (error) {
      toast({
        title: language === 'vi' ? 'Không thể tải redeem code' : 'Unable to load redeem codes',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setLoadingCodes(false);
    }
  };

  useEffect(() => {
    void loadCodes();
  }, []);

  const handleGenerate = async () => {
    if (expiryMode === 'custom' && !expiresAt) {
      toast({
        title: language === 'vi' ? 'Thiếu ngày hết hạn' : 'Missing expiration date',
        description: language === 'vi' ? 'Hãy chọn ngày hết hạn cho redeem code.' : 'Pick an expiration date for the redeem code.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await adminApi.createRedeemCode(
        expiryMode === 'custom'
          ? {
              plan_tier: planTier,
              expires_at: new Date(expiresAt).toISOString(),
            }
          : {
              plan_tier: planTier,
              expires_in_days: expiryMode === '7_days' ? 7 : 30,
            },
      );
      setGeneratedCode(response);
      setCodes((current) => [response, ...current.filter((item) => item.code !== response.code)]);
      toast({
        title: language === 'vi' ? 'Đã tạo redeem code' : 'Redeem code created',
        description: response.code,
      });
    } catch (error) {
      toast({
        title: language === 'vi' ? 'Không thể tạo redeem code' : 'Unable to create redeem code',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast({
      title: copy.copied,
      description: value,
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{copy.title}</h2>
          <p className="mt-2 text-muted-foreground max-w-2xl">{copy.subtitle}</p>
        </div>
        <Button variant="outline" onClick={() => void loadCodes()} disabled={loadingCodes}>
          {loadingCodes ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/50 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle>{copy.generatorTitle}</CardTitle>
            <CardDescription>{copy.generatorDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="text-sm font-medium">{copy.planLabel}</div>
              <div className="grid grid-cols-3 gap-2">
                {(['basic', 'pro', 'premium'] as PlanTier[]).map((tier) => (
                  <Button
                    key={tier}
                    variant={planTier === tier ? 'default' : 'outline'}
                    className="capitalize"
                    onClick={() => setPlanTier(tier)}
                  >
                    {tier}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium">{copy.expiryLabel}</div>
              <div className="grid gap-2 sm:grid-cols-3">
                <Button
                  variant={expiryMode === '7_days' ? 'default' : 'outline'}
                  onClick={() => setExpiryMode('7_days')}
                >
                  {copy.expiry7}
                </Button>
                <Button
                  variant={expiryMode === '30_days' ? 'default' : 'outline'}
                  onClick={() => setExpiryMode('30_days')}
                >
                  {copy.expiry30}
                </Button>
                <Button
                  variant={expiryMode === 'custom' ? 'default' : 'outline'}
                  onClick={() => setExpiryMode('custom')}
                >
                  {copy.expiryCustom}
                </Button>
              </div>

              {expiryMode === 'custom' ? (
                <Input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(event) => setExpiresAt(event.target.value)}
                  className="max-w-sm"
                  placeholder={copy.customPlaceholder}
                />
              ) : null}
            </div>

            <Button onClick={() => void handleGenerate()} disabled={loading} className="w-full sm:w-auto">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Gift className="mr-2 h-4 w-4" />}
              {loading ? copy.generating : copy.generate}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/50 bg-card/80 shadow-sm">
            <CardHeader>
              <CardTitle>{copy.generatedTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              {generatedCode ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-sm">
                    <span className="truncate">{generatedCode.code}</span>
                    <Button size="icon" variant="ghost" onClick={() => void handleCopy(generatedCode.code)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {generatedCode.plan_tier.toUpperCase()} · {formatCodeDate(generatedCode.expires_at, language)}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {language === 'vi'
                    ? 'Code mới sẽ xuất hiện ở đây sau khi bạn generate.'
                    : 'The new code will appear here after you generate it.'}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>{copy.recentTitle}</CardTitle>
                <CardDescription>
                  {language === 'vi'
                    ? 'Mã gần nhất được sắp xếp theo thời gian tạo.'
                    : 'Newest codes are shown first.'}
                </CardDescription>
              </div>
              <Clock3 className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-3">
              {codes.length === 0 && !loadingCodes ? (
                <p className="text-sm text-muted-foreground">{copy.noCodes}</p>
              ) : null}
              {codes.map((code) => {
                const status = resolveStatus(code);
                const statusLabel =
                  status === 'redeemed' ? copy.statusRedeemed : status === 'expired' ? copy.statusExpired : copy.statusActive;
                return (
                  <div key={code.code} className="rounded-lg border border-border bg-background/60 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-mono text-sm">{code.code}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {code.plan_tier.toUpperCase()} · {formatCodeDate(code.expires_at, language)}
                        </div>
                      </div>
                      <Badge variant={status === 'redeemed' ? 'default' : 'secondary'}>{statusLabel}</Badge>
                    </div>
                    {code.redeemed_by_email ? (
                      <div className="mt-2 text-xs text-muted-foreground">
                        {copy.usedBy}: {code.redeemed_by_email}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default AdminRedeemCodes;
