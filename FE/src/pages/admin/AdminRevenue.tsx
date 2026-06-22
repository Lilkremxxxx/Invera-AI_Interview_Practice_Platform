import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BarChart3, DollarSign, Loader2, ShoppingBag, type LucideIcon } from 'lucide-react';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

import { adminApi, AdminRevenueResponse } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

type RevenueMetricKey = 'total' | 'basic' | 'pro' | 'premium' | 'additional_sessions';
type RevenueMetricKind = 'currency' | 'count';

type RevenueMetricConfig = {
  key: RevenueMetricKey;
  field: 'total_revenue' | 'basic_revenue' | 'pro_revenue' | 'premium_revenue' | 'additional_sessions_count';
  kind: RevenueMetricKind;
  label: { vi: string; en: string };
  description: { vi: string; en: string };
  chartTitle: { vi: string; en: string };
  chartDescription: { vi: string; en: string };
  color: string;
  icon: LucideIcon;
};

const METRIC_CONFIGS: RevenueMetricConfig[] = [
  {
    key: 'total',
    field: 'total_revenue',
    kind: 'currency',
    label: { vi: 'Tổng doanh thu', en: 'Total revenue' },
    description: { vi: 'Tất cả giao dịch thành công', en: 'All successful transactions' },
    chartTitle: { vi: 'Doanh thu tổng', en: 'Total revenue trend' },
    chartDescription: { vi: 'Biểu đồ 30 ngày gần nhất của toàn bộ doanh thu thành công.', en: 'Last 30 days of all successful revenue.' },
    color: '#10b981',
    icon: DollarSign,
  },
  {
    key: 'basic',
    field: 'basic_revenue',
    kind: 'currency',
    label: { vi: 'Basic', en: 'Basic' },
    description: { vi: 'Doanh thu gói Basic', en: 'Basic plan revenue' },
    chartTitle: { vi: 'Doanh thu Basic', en: 'Basic revenue trend' },
    chartDescription: { vi: 'Giao dịch Basic trong 30 ngày gần nhất.', en: 'Basic transactions over the last 30 days.' },
    color: '#2563eb',
    icon: BarChart3,
  },
  {
    key: 'pro',
    field: 'pro_revenue',
    kind: 'currency',
    label: { vi: 'Pro', en: 'Pro' },
    description: { vi: 'Doanh thu gói Pro', en: 'Pro plan revenue' },
    chartTitle: { vi: 'Doanh thu Pro', en: 'Pro revenue trend' },
    chartDescription: { vi: 'Giao dịch Pro trong 30 ngày gần nhất.', en: 'Pro transactions over the last 30 days.' },
    color: '#7c3aed',
    icon: BarChart3,
  },
  {
    key: 'premium',
    field: 'premium_revenue',
    kind: 'currency',
    label: { vi: 'Premium', en: 'Premium' },
    description: { vi: 'Doanh thu gói Premium', en: 'Premium plan revenue' },
    chartTitle: { vi: 'Doanh thu Premium', en: 'Premium revenue trend' },
    chartDescription: { vi: 'Giao dịch Premium trong 30 ngày gần nhất.', en: 'Premium transactions over the last 30 days.' },
    color: '#db2777',
    icon: BarChart3,
  },
  {
    key: 'additional_sessions',
    field: 'additional_sessions_count',
    kind: 'count',
    label: { vi: 'Tổng số phiên mua thêm', en: 'Extra sessions total' },
    description: { vi: 'Tổng số phiên đã mua thêm', en: 'Total additional sessions purchased' },
    chartTitle: { vi: 'Phiên mua thêm', en: 'Extra sessions trend' },
    chartDescription: { vi: 'Số phiên mua thêm trong 30 ngày gần nhất.', en: 'Additional sessions purchased over the last 30 days.' },
    color: '#0ea5e9',
    icon: ShoppingBag,
  },
];

export default function AdminRevenue() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<AdminRevenueResponse | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<RevenueMetricKey>('total');

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(language === 'vi' ? 'vi-VN' : 'en-US', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);

  const formatCount = (value: number) =>
    new Intl.NumberFormat(language === 'vi' ? 'vi-VN' : 'en-US', {
      maximumFractionDigits: 0,
    }).format(value);

  const formatMetricValue = (value: number, kind: RevenueMetricKind) =>
    kind === 'currency' ? formatCurrency(value) : formatCount(value);

  const formatShortValue = (val: number, kind: RevenueMetricKind) => {
    if (kind === 'count') {
      return formatCount(val);
    }
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1).replace('.0', '')}M`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(0)}k`;
    return formatCount(val);
  };

  const copy = {
    title: language === 'vi' ? 'Quản lý doanh thu' : 'Revenue Management',
    subtitle: language === 'vi'
      ? 'Theo dõi doanh thu theo từng gói và số phiên mua thêm trong 30 ngày gần nhất.'
      : 'Track revenue by plan and extra session purchases over the last 30 days.',
    loadErrorTitle: language === 'vi' ? 'Không thể tải dữ liệu doanh thu' : 'Unable to load revenue data',
    retry: language === 'vi' ? 'Vui lòng thử lại.' : 'Please try again.',
    revenueTitle: language === 'vi' ? 'Bảng điều khiển doanh thu' : 'Revenue dashboard',
    revenueSubtitle: language === 'vi' ? 'Bấm vào từng thẻ để xem biểu đồ line chart của từng gói.' : 'Click a card to switch the line chart to that metric.',
    chartTitle: language === 'vi' ? 'Biểu đồ 30 ngày gần nhất' : 'Last 30 days chart',
    chartEmpty: language === 'vi' ? 'Chưa có dữ liệu cho thẻ này.' : 'No data available for this metric.',
    totalRevenueLabel: language === 'vi' ? 'Tổng cộng' : 'Total',
  };

  const loadRevenueData = async () => {
    setLoading(true);
    try {
      const revenueData = await adminApi.getRevenue();
      setRevenueData(revenueData);
      setSelectedMetric('total');
    } catch (err) {
      toast({
        title: copy.loadErrorTitle,
        description: err instanceof Error ? err.message : copy.retry,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRevenueData();
  }, []);

  const selectedMetricConfig = useMemo(
    () => METRIC_CONFIGS.find((item) => item.key === selectedMetric) ?? METRIC_CONFIGS[0],
    [selectedMetric],
  );
  const SelectedMetricIcon = selectedMetricConfig.icon;

  const summary = revenueData?.breakdown.summary;
  const chartData = useMemo(() => {
    const rows = revenueData?.breakdown.daily ?? [];
    return rows.map((row) => ({
      day: row.day,
      value: row[selectedMetricConfig.field],
    }));
  }, [revenueData, selectedMetricConfig.field]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{copy.title}</h2>
        <p className="text-muted-foreground mt-2">{copy.subtitle}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {METRIC_CONFIGS.map((metric) => {
          const value = summary?.[metric.field] ?? 0;
          const isSelected = metric.key === selectedMetric;
          const Icon = metric.icon;
          return (
            <button
              key={metric.key}
              type="button"
              onClick={() => setSelectedMetric(metric.key)}
              className={`group rounded-2xl border p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                isSelected
                  ? 'border-transparent bg-card shadow-lg ring-2 ring-accent/30'
                  : 'border-border/50 bg-card/70 hover:border-accent/40'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className={`rounded-xl p-2.5 ${isSelected ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <ArrowRight className={`h-4 w-4 transition-transform ${isSelected ? 'text-accent' : 'text-muted-foreground group-hover:translate-x-0.5'}`} />
              </div>
              <div className="mt-5 space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-bold">{metric.label[language]}</p>
                <div className="text-2xl font-black tracking-tight text-foreground">
                  {formatMetricValue(value, metric.kind)}
                </div>
                <p className="text-xs text-muted-foreground leading-5">{metric.description[language]}</p>
              </div>
            </button>
          );
        })}
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
        <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
              <SelectedMetricIcon className="w-5 h-5 text-accent" />
              {selectedMetricConfig.chartTitle[language]}
            </CardTitle>
            <CardDescription className="text-sm mt-1">{selectedMetricConfig.chartDescription[language]}</CardDescription>
          </div>
          <div className="rounded-xl border border-border/50 bg-muted/60 px-4 py-3">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{copy.totalRevenueLabel}</p>
            <p className="text-2xl font-black mt-0.5 tracking-tight" style={{ color: selectedMetricConfig.color }}>
              {formatMetricValue(summary?.[selectedMetricConfig.field] ?? 0, selectedMetricConfig.kind)}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="flex h-80 items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
              {copy.chartEmpty}
            </div>
          ) : (
            <div className="h-96 w-full rounded-xl border border-border/30 bg-background/30 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(255, 255, 255, 0.05)" />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tickMargin={10}
                    className="text-[11px] fill-muted-foreground font-medium"
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickMargin={10}
                    tickFormatter={(value) => formatShortValue(Number(value), selectedMetricConfig.kind)}
                    className="text-[11px] fill-muted-foreground font-medium"
                  />
                  <Tooltip
                    cursor={{ stroke: `${selectedMetricConfig.color}33`, strokeWidth: 1.5 }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-popover/90 backdrop-blur-md border border-border/50 p-3 rounded-lg shadow-xl text-xs space-y-1">
                            <p className="font-semibold text-muted-foreground">{label}</p>
                            <p className="font-black text-sm" style={{ color: selectedMetricConfig.color }}>
                              {formatMetricValue(Number(payload[0].value ?? 0), selectedMetricConfig.kind)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={selectedMetricConfig.color}
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: selectedMetricConfig.color, stroke: 'white', strokeWidth: 1.5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
