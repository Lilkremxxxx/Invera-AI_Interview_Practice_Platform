import { useEffect, useState } from 'react';
import { Loader2, DollarSign, TrendingUp } from 'lucide-react';
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

import { adminApi, DailyRevenue, MonthlyRevenue } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AdminRevenue() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [revenueTab, setRevenueTab] = useState<'daily' | 'monthly'>('daily');

  const formatRevenue = (value: number) => {
    return new Intl.NumberFormat(language === 'vi' ? 'vi-VN' : 'en-US', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatShortRevenue = (val: number) => {
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1).replace('.0', '')}M`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(0)}k`;
    return val.toString();
  };

  const copy = {
    title: language === 'vi' ? 'Quản lý doanh thu' : 'Revenue Management',
    subtitle: language === 'vi' ? 'Theo dõi doanh thu chi tiết từ PayOS/VNPAY theo ngày và theo tháng.' : 'Track detailed revenue from PayOS/VNPAY by day and by month.',
    loadErrorTitle: language === 'vi' ? 'Không thể tải dữ liệu doanh thu' : 'Unable to load revenue data',
    retry: language === 'vi' ? 'Vui lòng thử lại.' : 'Please try again.',
    revenueTitle: language === 'vi' ? 'Quản lý dòng tiền' : 'Cash Flow Management',
    revenueSubtitle: language === 'vi' ? 'Theo dõi doanh thu thực tế từ cổng thanh toán PayOS/VNPAY theo ngày và theo tháng.' : 'Track real-world revenue from PayOS/VNPAY payment gateways by day and by month.',
    totalRevenueLabel: language === 'vi' ? 'Tổng doanh thu (thực nhận)' : 'Total Revenue (Received)',
    dailyRevenueTab: language === 'vi' ? 'Theo ngày (30 ngày qua)' : 'By Day (Last 30 Days)',
    monthlyRevenueTab: language === 'vi' ? 'Theo tháng' : 'By Month',
    revenueListTitle: language === 'vi' ? 'Chi tiết doanh thu' : 'Revenue Breakdown',
    revenueDayHeader: language === 'vi' ? 'Ngày' : 'Day',
    revenueMonthHeader: language === 'vi' ? 'Tháng' : 'Month',
    revenueAmountHeader: language === 'vi' ? 'Doanh thu' : 'Revenue',
    emptyRevenue: language === 'vi' ? 'Chưa phát sinh doanh thu.' : 'No revenue recorded yet.',
  };

  const loadRevenueData = async () => {
    setLoading(true);
    try {
      const revenueData = await adminApi.getRevenue();
      setDailyRevenue(revenueData.daily);
      setMonthlyRevenue(revenueData.monthly);
      setTotalRevenue(revenueData.total_revenue);
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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{copy.title}</h2>
        <p className="text-muted-foreground mt-2">{copy.subtitle}</p>
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-accent/45 hover:shadow-accent/5">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
              <DollarSign className="w-5 h-5 text-accent" />
              {copy.revenueTitle}
            </CardTitle>
            <CardDescription className="text-sm mt-1">{copy.revenueSubtitle}</CardDescription>
          </div>
          <div className="flex items-center gap-4 bg-muted/60 px-5 py-3 rounded-xl border border-border/50 hover:border-accent/40 transition-all duration-300">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{copy.totalRevenueLabel}</p>
              <p className="text-2xl font-black text-accent mt-0.5 tracking-tight">{formatRevenue(totalRevenue)}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex border-b border-border/60">
            <button
              onClick={() => setRevenueTab('daily')}
              className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all duration-200 ${
                revenueTab === 'daily'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {copy.dailyRevenueTab}
            </button>
            <button
              onClick={() => setRevenueTab('monthly')}
              className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all duration-200 ${
                revenueTab === 'monthly'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {copy.monthlyRevenueTab}
            </button>
          </div>

          {loading ? (
            <div className="flex h-80 items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : (
            <div className="space-y-8">
              <div className="h-80 w-full bg-background/30 rounded-xl border border-border/30 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  {revenueTab === 'daily' ? (
                    <AreaChart data={dailyRevenue} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revenueDailyGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
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
                        tickFormatter={formatShortRevenue}
                        className="text-[11px] fill-muted-foreground font-medium"
                      />
                      <Tooltip
                        cursor={{ stroke: 'rgba(16, 185, 129, 0.2)', strokeWidth: 1.5 }}
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-popover/90 backdrop-blur-md border border-border/50 p-3 rounded-lg shadow-xl text-xs space-y-1">
                                <p className="font-semibold text-muted-foreground">{copy.revenueDayHeader}: {label}</p>
                                <p className="font-black text-accent text-sm">
                                  {formatRevenue(Number(payload[0].value))}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#revenueDailyGrad)"
                        activeDot={{ r: 6, fill: '#10b981', stroke: 'white', strokeWidth: 1.5 }}
                      />
                    </AreaChart>
                  ) : (
                    <AreaChart data={monthlyRevenue} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revenueMonthlyGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(255, 255, 255, 0.05)" />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false}
                        tickLine={false}
                        tickMargin={10}
                        className="text-[11px] fill-muted-foreground font-medium" 
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tickMargin={10}
                        tickFormatter={formatShortRevenue}
                        className="text-[11px] fill-muted-foreground font-medium"
                      />
                      <Tooltip
                        cursor={{ stroke: 'rgba(99, 102, 241, 0.2)', strokeWidth: 1.5 }}
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-popover/90 backdrop-blur-md border border-border/50 p-3 rounded-lg shadow-xl text-xs space-y-1">
                                <p className="font-semibold text-muted-foreground">{copy.revenueMonthHeader}: {label}</p>
                                <p className="font-black text-[#6366f1] text-sm">
                                  {formatRevenue(Number(payload[0].value))}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#revenueMonthlyGrad)"
                        activeDot={{ r: 6, fill: '#6366f1', stroke: 'white', strokeWidth: 1.5 }}
                      />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>

              {/* Revenue Detail Table */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-accent animate-pulse" />
                  {copy.revenueListTitle}
                </h3>
                <div className="rounded-xl border border-border/50 overflow-hidden bg-background/30 backdrop-blur-sm">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/70 text-muted-foreground text-xs uppercase font-bold border-b border-border/50">
                      <tr>
                        <th className="px-6 py-3.5">{revenueTab === 'daily' ? copy.revenueDayHeader : copy.revenueMonthHeader}</th>
                        <th className="px-6 py-3.5 text-right">{copy.revenueAmountHeader}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {revenueTab === 'daily' ? (
                        dailyRevenue.filter(d => d.revenue > 0).length === 0 ? (
                          <tr>
                            <td colSpan={2} className="px-6 py-8 text-center text-muted-foreground font-medium">{copy.emptyRevenue}</td>
                          </tr>
                        ) : (
                          dailyRevenue.filter(d => d.revenue > 0).map((item, idx) => (
                            <tr key={idx} className="hover:bg-muted/30 bg-card/10 transition-colors duration-150">
                              <td className="px-6 py-4 font-medium text-foreground">{item.day}</td>
                              <td className="px-6 py-4 text-right font-bold text-accent">{formatRevenue(item.revenue)}</td>
                            </tr>
                          ))
                        )
                      ) : (
                        monthlyRevenue.filter(m => m.revenue > 0).length === 0 ? (
                          <tr>
                            <td colSpan={2} className="px-6 py-8 text-center text-muted-foreground font-medium">{copy.emptyRevenue}</td>
                          </tr>
                        ) : (
                          monthlyRevenue.filter(m => m.revenue > 0).map((item, idx) => (
                            <tr key={idx} className="hover:bg-muted/30 bg-card/10 transition-colors duration-150">
                              <td className="px-6 py-4 font-medium text-foreground">{item.month}</td>
                              <td className="px-6 py-4 text-right font-bold text-accent">{formatRevenue(item.revenue)}</td>
                            </tr>
                          ))
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
