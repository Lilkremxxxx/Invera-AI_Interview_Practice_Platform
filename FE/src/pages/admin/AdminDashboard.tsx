import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { adminApi, AdminManagedUser, AdminQuestionOut, AdminStats } from '@/lib/api';
import { Users, FileText, CheckCircle, Target, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export function AdminDashboard() {
  const { language } = useLanguage();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminManagedUser[]>([]);
  const [questions, setQuestions] = useState<AdminQuestionOut[]>([]);
  const [loading, setLoading] = useState(true);
  const copy = {
    loadErrorTitle: language === 'vi' ? 'Lỗi tải dữ liệu' : 'Unable to load admin data',
    loadErrorDescription: language === 'vi' ? 'Hãy chắc chắn bạn có quyền admin.' : 'Make sure your account still has admin access.',
    totalUsers: language === 'vi' ? 'Total users' : 'Total users',
    questionsAvailable: language === 'vi' ? 'Có sẵn trên hệ thống' : 'Available in the system',
    answers: language === 'vi' ? 'Answers' : 'Answers',
    admins: language === 'vi' ? 'admins' : 'admins',
    completed: language === 'vi' ? 'completed' : 'completed',
    avgScore: language === 'vi' ? 'Average score' : 'Average score',
    subtitle: language === 'vi' ? 'Tổng quan hoạt động hệ thống Invera AI.' : 'Overview of current activity across the Invera system.',
    recentGrowth: language === 'vi' ? 'Đà tăng user gần đây' : 'Recent user growth',
    recentGrowthDescription: language === 'vi' ? 'Số tài khoản mới trong nhóm người dùng vừa đăng ký gần nhất.' : 'New accounts in the most recent group of registered users.',
    adminBadge: language === 'vi' ? 'Admin' : 'Admin',
    sessionStatus: language === 'vi' ? 'Trạng thái session' : 'Session status',
    sessionStatusDescription: language === 'vi' ? 'Tỷ lệ session đã hoàn thành so với session đang mở.' : 'Share of completed sessions compared with open sessions.',
    questionsDistribution: language === 'vi' ? 'Questions distribution' : 'Questions distribution',
    questionsDistributionDescription: language === 'vi' ? 'Phân bổ câu hỏi theo role và level để nhìn nhanh độ phủ hệ thống.' : 'Question coverage by role and level at a glance.',
    locale: language === 'vi' ? 'vi-VN' : 'en-US',
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsData, usersData, questionsData] = await Promise.all([
        adminApi.getStats(),
        adminApi.getUsers({ limit: 24, offset: 0 }),
        adminApi.getQuestions(),
      ]);
      setStats(statsData);
      setUsers(usersData);
      setQuestions(questionsData);
    } catch (err) {
      toast({
        title: copy.loadErrorTitle,
        description: err instanceof Error ? err.message : copy.loadErrorDescription,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const safeStats: AdminStats = stats ?? {
    total_users: 0,
    total_admins: 0,
    total_sessions: 0,
    completed_sessions: 0,
    total_answers: 0,
    avg_score: 0,
    total_questions: 0,
  };

  const statCards = [
    { title: copy.totalUsers, value: safeStats.total_users, icon: Users, desc: `${safeStats.total_admins} ${copy.admins}` },
    { title: 'Sessions', value: safeStats.total_sessions, icon: FileText, desc: `${safeStats.completed_sessions} ${copy.completed}` },
    { title: 'Questions', value: safeStats.total_questions, icon: Target, desc: copy.questionsAvailable },
    { title: copy.answers, value: safeStats.total_answers, icon: CheckCircle, desc: `${copy.avgScore}: ${safeStats.avg_score || 0}/100` },
  ];

  const questionRoleData = useMemo(
    () =>
      ['frontend', 'backend', 'fullstack', 'data_scientist', 'machine_learning_engineer', 'devops_engineer']
        .map((role) => ({
          role: role.replaceAll('_', ' '),
          count: questions.filter((question) => question.role === role).length,
        }))
        .filter((item) => item.count > 0),
    [questions],
  );

  const questionLevelData = useMemo(
    () =>
      ['intern', 'junior', 'mid', 'senior'].map((level) => ({
        level,
        count: questions.filter((question) => question.level === level).length,
      })),
    [questions],
  );

  const recentUsersChart = useMemo(() => {
    const buckets = new Map<string, number>();
    users.forEach((entry) => {
      const key = new Date(entry.created_at).toLocaleDateString(copy.locale, { day: '2-digit', month: '2-digit' });
      buckets.set(key, (buckets.get(key) || 0) + 1);
    });
    return Array.from(buckets.entries()).map(([day, signups]) => ({ day, signups }));
  }, [copy.locale, users]);

  const sessionStatusData = [
    { name: 'Completed', value: safeStats.completed_sessions, color: '#14b8a6' },
    { name: 'Open', value: Math.max(safeStats.total_sessions - safeStats.completed_sessions, 0), color: '#0f172a' },
  ];

  if (loading || !stats) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
        <p className="text-muted-foreground mt-2">{copy.subtitle}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, i) => (
          <Card key={i} className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{card.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>{copy.recentGrowth}</CardTitle>
            <CardDescription>{copy.recentGrowthDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={recentUsersChart}>
                  <defs>
                    <linearGradient id="adminSignups" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="signups"
                    stroke="#14b8a6"
                    strokeWidth={3}
                    fill="url(#adminSignups)"
                    activeDot={{ r: 6, fill: '#14b8a6' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 space-y-4">
              {users.slice(0, 6).map((u) => (
                <div key={u.id} className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-sm flex items-center gap-2">
                      {u.email}
                      {u.is_admin && <span className="bg-accent/10 text-accent text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">{copy.adminBadge}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 text-primary">
                      {new Date(u.created_at).toLocaleDateString(copy.locale)} · {u.provider} · {u.session_count} sessions {u.avg_score ? `· ${u.avg_score} pt` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>{copy.sessionStatus}</CardTitle>
            <CardDescription>{copy.sessionStatusDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sessionStatusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={4}
                  >
                    {sessionStatusData.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {sessionStatusData.map((item) => (
                <div key={item.name} className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.name}
                  </div>
                  <div className="mt-1 text-xl font-bold">{item.value}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
          <CardTitle>{copy.questionsDistribution}</CardTitle>
          <CardDescription>{copy.questionsDistributionDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={questionRoleData} barCategoryGap={18}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="role"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) =>
                      value
                        .split(' ')
                        .map((part: string) => part.slice(0, 3).toUpperCase())
                        .join(' ')
                    }
                  />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#14b8a6" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {questionLevelData.filter((item) => item.count > 0).map((item) => (
                <div key={item.level} className="rounded-2xl border border-border/70 bg-card px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm capitalize text-muted-foreground">{item.level}</span>
                    <span className="text-lg font-bold text-accent">{item.count}</span>
                  </div>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-accent transition-all duration-700"
                      style={{ width: `${Math.max((item.count / Math.max(safeStats.total_questions, 1)) * 100, 8)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
