import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList } from 'recharts';
import { 
  PlusCircle, 
  Loader2, 
  ChevronRight, 
  Target, 
  CheckCircle2, 
  Clock3, 
  BarChart3, 
  Sparkles,
  Info
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { sessionsApi, SessionOut } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatPlanLabel, formatPlanStatus } from '@/lib/plans';
import { roleLabelMap } from '@/lib/mock-data';

const levelLabels: Record<string, { vi: string; en: string }> = {
  intern: { vi: 'Intern', en: 'Intern' },
  fresher: { vi: 'Fresher', en: 'Fresher' },
  junior: { vi: 'Junior', en: 'Junior' },
  mid: { vi: 'Mid-level', en: 'Mid-level' },
  senior: { vi: 'Senior', en: 'Senior' },
};

type DemoRole = 'frontend' | 'backend' | 'product';
type DemoRange = '7d' | '30d';

const trendDataFallback: Record<DemoRole, Record<DemoRange, Array<{ label: string; score: number; readiness: number }>>> = {
  frontend: {
    '7d': [
      { label: 'Mon', score: 66, readiness: 51 },
      { label: 'Tue', score: 70, readiness: 55 },
      { label: 'Wed', score: 72, readiness: 58 },
      { label: 'Thu', score: 75, readiness: 61 },
      { label: 'Fri', score: 78, readiness: 66 },
      { label: 'Sat', score: 80, readiness: 69 },
      { label: 'Sun', score: 83, readiness: 73 },
    ],
    '30d': [
      { label: 'W1', score: 62, readiness: 48 },
      { label: 'W2', score: 69, readiness: 54 },
      { label: 'W3', score: 76, readiness: 63 },
      { label: 'W4', score: 84, readiness: 72 },
    ],
  },
  backend: {
    '7d': [
      { label: 'Mon', score: 61, readiness: 49 },
      { label: 'Tue', score: 64, readiness: 52 },
      { label: 'Wed', score: 68, readiness: 56 },
      { label: 'Thu', score: 71, readiness: 60 },
      { label: 'Fri', score: 74, readiness: 64 },
      { label: 'Sat', score: 77, readiness: 66 },
      { label: 'Sun', score: 79, readiness: 69 },
    ],
    '30d': [
      { label: 'W1', score: 58, readiness: 45 },
      { label: 'W2', score: 65, readiness: 51 },
      { label: 'W3', score: 72, readiness: 59 },
      { label: 'W4', score: 79, readiness: 68 },
    ],
  },
  product: {
    '7d': [
      { label: 'Mon', score: 69, readiness: 57 },
      { label: 'Tue', score: 72, readiness: 61 },
      { label: 'Wed', score: 75, readiness: 64 },
      { label: 'Thu', score: 78, readiness: 68 },
      { label: 'Fri', score: 80, readiness: 71 },
      { label: 'Sat', score: 82, readiness: 74 },
      { label: 'Sun', score: 85, readiness: 78 },
    ],
    '30d': [
      { label: 'W1', score: 65, readiness: 54 },
      { label: 'W2', score: 71, readiness: 60 },
      { label: 'W3', score: 78, readiness: 68 },
      { label: 'W4', score: 86, readiness: 77 },
    ],
  },
};

const strengthDataFallback: Record<DemoRole, Array<{ skill: string; score: number }>> = {
  frontend: [
    { skill: 'React patterns', score: 88 },
    { skill: 'Accessibility', score: 82 },
    { skill: 'System design', score: 71 },
    { skill: 'Behavioral stories', score: 76 },
  ],
  backend: [
    { skill: 'API design', score: 86 },
    { skill: 'SQL reasoning', score: 79 },
    { skill: 'Distributed systems', score: 73 },
    { skill: 'Behavioral stories', score: 70 },
  ],
  product: [
    { skill: 'Product sense', score: 90 },
    { skill: 'Metrics thinking', score: 84 },
    { skill: 'Execution stories', score: 77 },
    { skill: 'Stakeholder alignment', score: 81 },
  ],
};

const sessionsDataFallback: Record<DemoRole, Array<{ title: string; score: number; status: 'strong' | 'mixed' }>> = {
  frontend: [
    { title: 'React hooks drill', score: 86, status: 'strong' },
    { title: 'Accessibility round', score: 79, status: 'mixed' },
    { title: 'System design warm-up', score: 74, status: 'mixed' },
  ],
  backend: [
    { title: 'REST API deep dive', score: 83, status: 'strong' },
    { title: 'Postgres troubleshooting', score: 78, status: 'mixed' },
    { title: 'Caching architecture', score: 75, status: 'mixed' },
  ],
  product: [
    { title: 'North-star metrics', score: 88, status: 'strong' },
    { title: 'Prioritization review', score: 81, status: 'strong' },
    { title: 'Execution breakdown', score: 76, status: 'mixed' },
  ],
};

const getCategoryForRole = (roleId: string): DemoRole => {
  const id = roleId.toLowerCase();
  if (id === 'frontend' || id === 'fullstack' || id === 'ux_designer' || id.includes('front') || id.includes('fullstack') || id.includes('ux') || id.includes('design')) {
    return 'frontend';
  }
  if (id === 'backend' || id === 'data_scientist' || id === 'machine_learning_engineer' || id === 'devops_engineer' || id.includes('back') || id.includes('devops') || id.includes('data') || id.includes('machine') || id.includes('ml') || id.includes('science') || id.includes('system') || id.includes('engineer')) {
    return 'backend';
  }
  return 'product';
};

const Dashboard = () => {
  const { t, language } = useLanguage();
  const { user } = useAuthContext();
  
  const { data: sessions = [], isLoading } = useQuery<SessionOut[]>({
    queryKey: ['sessions'],
    queryFn: sessionsApi.list,
  });

  // Extract unique roles practiced by the user from real sessions. Fallback to default set if none.
  const userRoles = useMemo(() => {
    if (sessions.length === 0) {
      return ['frontend', 'backend', 'product'];
    }
    const unique = Array.from(new Set(sessions.map(s => s.role)));
    return unique.length > 0 ? unique : ['frontend', 'backend', 'product'];
  }, [sessions]);

  const [roleFilter, setRoleFilter] = useState<string>('frontend');
  const [rangeFilter, setRangeFilter] = useState<DemoRange>('30d');

  // Sync roleFilter to first user role once userRoles are loaded
  useEffect(() => {
    if (userRoles.length > 0 && !userRoles.includes(roleFilter)) {
      setRoleFilter(userRoles[0]);
    }
  }, [userRoles, roleFilter]);

  const firstName = user?.email?.split('@')[0] || '';
  const canStartNewSession = user?.can_start_new_session ?? true;
  const needsUpgrade = !user?.is_admin && !canStartNewSession;

  const copy = {
    currentPlanCta: language === 'vi' ? 'Nâng cấp gói' : 'Upgrade plan',
    greeting: (name: string) => (language === 'vi' ? `Xin chào, ${name} 👋` : `Hi, ${name} 👋`),
    welcomeText: language === 'vi' ? 'Chào mừng bạn quay lại với Invera. Hãy tiếp tục hành trình luyện tập của bạn.' : 'Welcome back to Invera. Let\'s continue your practice journey.',
    currentPlanLead: language === 'vi' ? 'Gói hiện tại:' : 'Current plan:',
    trialTitle: language === 'vi' ? 'Bạn đã dùng hết số phiên phỏng vấn' : 'You have run out of sessions',
    trialBody: language === 'vi'
      ? 'Hãy mua thêm phiên hoặc nâng cấp gói để tiếp tục luyện tập.'
      : 'Please purchase more sessions or upgrade your plan to continue practicing.',
    kpiTotalSessions: language === 'vi' ? 'Tổng số phiên' : 'Total sessions',
    kpiAvgScore: language === 'vi' ? 'Điểm trung bình' : 'Average score',
    kpiCompletedSessions: language === 'vi' ? 'Phiên hoàn thành' : 'Completed sessions',
    kpiQuestionsAnswered: language === 'vi' ? 'Câu hỏi đã trả lời' : 'Questions answered',
    chartTitle: language === 'vi' ? 'Tiến độ theo thời gian' : 'Progress over time',
    chartBody: language === 'vi' ? 'Điểm trả lời và mức độ sẵn sàng tăng dần qua các phiên luyện.' : 'Answer quality and readiness trend upward as practice sessions accumulate.',
    strengthsTitle: language === 'vi' ? 'Phân tích kỹ năng' : 'Skill breakdown',
    strengthsBody: language === 'vi' ? 'Các chỉ số này cho thấy mức độ sẵn sàng và cần bồi tập phần nào.' : 'These metrics show where you are already strong and where more repetition is needed.',
    sessionsTitle: language === 'vi' ? 'Các phiên phỏng vấn gần đây' : 'Recent mock sessions',
    sessionsBody: language === 'vi' ? 'Danh sách các buổi phỏng vấn giả lập gần đây của bạn.' : 'Your most recent mock interview sessions.',
    strong: language === 'vi' ? 'Tốt' : 'Strong',
    mixed: language === 'vi' ? 'Cần cải thiện' : 'Needs work',
    range7d: language === 'vi' ? '7 ngày' : '7 days',
    range30d: language === 'vi' ? '30 ngày' : '30 days',
    inProgress: language === 'vi' ? 'Đang thực hiện' : 'In progress',
    demoNotice: language === 'vi' ? 'Đang hiển thị dữ liệu mẫu. Hãy thực hiện phỏng vấn để cập nhật tiến độ thực tế.' : 'Showing demo data. Complete actual interviews to view your live stats.',
  };

  // Filter sessions based on active role tab and range
  const filteredSessions = useMemo(() => {
    const now = new Date();
    const days = rangeFilter === '7d' ? 7 : 30;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    return sessions.filter(s => {
      const isRoleMatch = s.role === roleFilter;
      const date = new Date(s.created_at);
      return isRoleMatch && date >= cutoff;
    });
  }, [sessions, roleFilter, rangeFilter]);

  const completedSessions = useMemo(() => {
    return filteredSessions.filter(s => s.status === 'COMPLETED');
  }, [filteredSessions]);

  const hasRealData = completedSessions.length > 0;

  // Real KPIs calculations
  const totalSessionsCount = filteredSessions.length;
  const completedCount = completedSessions.length;
  
  const avgScore = useMemo(() => {
    if (completedSessions.length === 0) return null;
    const sum = completedSessions.reduce((acc, s) => acc + (s.avg_score ?? 0), 0);
    return sum / completedSessions.length;
  }, [completedSessions]);

  const questionsAnsweredCount = useMemo(() => {
    return filteredSessions.reduce((sum, s) => sum + (s.question_count ?? 0), 0);
  }, [filteredSessions]);

  // Unified KPI structure supporting fallback
  const kpis = useMemo(() => {
    if (hasRealData) {
      return {
        totalSessions: totalSessionsCount,
        avgScore: avgScore !== null ? `${avgScore.toFixed(1)}/10` : '—/10',
        completedSessions: completedCount,
        questionsAnswered: questionsAnsweredCount,
      };
    } else {
      const cat = getCategoryForRole(roleFilter);
      const is30d = rangeFilter === '30d';
      const fallbackSessions = is30d ? 12 : 4;
      const fallbackCompleted = is30d ? 10 : 3;
      const scoreMap = { frontend: 8.4, backend: 7.9, product: 8.6 };
      const fallbackScore = scoreMap[cat];
      
      return {
        totalSessions: fallbackSessions,
        avgScore: `${fallbackScore.toFixed(1)}/10`,
        completedSessions: fallbackCompleted,
        questionsAnswered: fallbackCompleted * 5,
      };
    }
  }, [hasRealData, roleFilter, rangeFilter, totalSessionsCount, avgScore, completedCount, questionsAnsweredCount]);

  // Skill breakdown vertical bars
  const strengths = useMemo(() => {
    const cat = getCategoryForRole(roleFilter);
    const baseSkills = strengthDataFallback[cat];
    if (!hasRealData || avgScore === null) return baseSkills;

    // Scale competencies based on user's real average score
    const scale = avgScore / 10;
    return baseSkills.map(skill => ({
      skill: skill.skill,
      score: Math.max(10, Math.min(100, Math.round(skill.score * (scale / 0.8)))),
    }));
  }, [roleFilter, avgScore, hasRealData]);

  const strongestSkill = useMemo(() => {
    return [...strengths].sort((a, b) => b.score - a.score)[0];
  }, [strengths]);

  // Progress chart data on scale [0, 10]
  const trend = useMemo(() => {
    if (!hasRealData) {
      const cat = getCategoryForRole(roleFilter);
      const baseTrend = trendDataFallback[cat][rangeFilter];
      return baseTrend.map(pt => ({
        label: pt.label,
        score: Number((pt.score / 10).toFixed(1)),
        readiness: Number((pt.readiness / 10).toFixed(1)),
      }));
    }

    const sorted = [...completedSessions].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    return sorted.map((s) => {
      const dateObj = new Date(s.created_at);
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const label = `${day}/${month}`;
      
      const scoreVal = s.avg_score ?? 0;
      const readinessVal = Math.max(1.0, Math.min(10.0, Number((scoreVal - 1.2).toFixed(1))));
      return {
        label,
        score: Number(scoreVal.toFixed(1)),
        readiness: readinessVal,
      };
    });
  }, [completedSessions, roleFilter, rangeFilter, hasRealData]);

  return (
    <div className="space-y-8 bg-slate-50/50 p-1 rounded-2xl">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {firstName ? copy.greeting(firstName) : t('dashboard', 'title')}
          </h1>
          <p className="text-slate-500 mt-1">{copy.welcomeText}</p>
        </div>
        <Button variant="accent" size="lg" asChild className="shadow-md hover:shadow-lg transition-all duration-200">
          <Link to={canStartNewSession ? "/app/new" : "/app/upgrade"}>
            <PlusCircle className="w-5 h-5 mr-1" />
            {canStartNewSession ? t('dashboard', 'newSession') : copy.currentPlanCta}
          </Link>
        </Button>
      </div>

      {needsUpgrade && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900 rounded-2xl shadow-sm">
          <AlertTitle className="font-semibold">{copy.trialTitle}</AlertTitle>
          <AlertDescription>
            {copy.currentPlanLead} <strong>{formatPlanLabel(user, language)}</strong> · {formatPlanStatus(user, language)}.
            {' '}{copy.trialBody}
          </AlertDescription>
        </Alert>
      )}

      {/* Demo Notice */}
      {!hasRealData && (
        <div className="flex items-center gap-2.5 p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-800 text-sm">
          <Info className="h-5 w-5 text-teal-600 flex-shrink-0" />
          <span className="font-medium">{copy.demoNotice}</span>
        </div>
      )}

      {/* Role Filter Tabs (Dynamic) */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {userRoles.map((item) => {
            const label = roleLabelMap[item]?.[language === 'vi' ? 'vi' : 'en'] || item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setRoleFilter(item)}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 ${
                  roleFilter === item
                    ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/15'
                    : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2 self-start rounded-full bg-white p-1 ring-1 ring-slate-200 shadow-sm">
          {([
            ['7d', copy.range7d],
            ['30d', copy.range30d],
          ] as Array<[DemoRange, string]>).map(([item, label]) => (
            <button
              key={item}
              type="button"
              onClick={() => setRangeFilter(item)}
              className={`rounded-full px-4 py-1.5 text-xs md:text-sm font-semibold transition-all duration-200 ${
                rangeFilter === item ? 'bg-teal-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-teal-500" />
        </div>
      ) : (
        <div className="grid gap-6">
          {/* KPI Cards Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { label: copy.kpiTotalSessions, value: `${kpis.totalSessions}`, icon: Target },
              { label: copy.kpiAvgScore, value: kpis.avgScore, icon: CheckCircle2 },
              { label: copy.kpiCompletedSessions, value: `${kpis.completedSessions}`, icon: Clock3 },
              { label: copy.kpiQuestionsAnswered, value: `${kpis.questionsAnswered}`, icon: BarChart3 },
            ].map((item) => (
              <div key={item.label} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-slate-500">{item.label}</div>
                  <item.icon className="h-5 w-5 text-teal-500" />
                </div>
                <div className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{item.value}</div>
              </div>
            ))}
          </div>

          {/* Main Visual Panels Grid */}
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_350px]">
            {/* Chart Area */}
            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="mb-6">
                <div className="text-xl font-bold text-slate-900">{copy.chartTitle}</div>
                <div className="mt-1 text-sm text-slate-500 leading-relaxed">{copy.chartBody}</div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="demoScoreGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#e2e8f0" vertical={false} strokeDasharray="4 4" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis tickLine={false} axisLine={false} width={36} domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip 
                      animationDuration={150}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '16px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      name={copy.kpiAvgScore}
                      stroke="#0f172a"
                      strokeWidth={3}
                      fill="url(#demoScoreGradient)"
                      activeDot={{ r: 6, fill: '#14b8a6' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="readiness" 
                      name={language === 'vi' ? 'Độ sẵn sàng' : 'Readiness'}
                      stroke="#14b8a6" 
                      strokeWidth={2} 
                      fill="transparent" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sidebar Cards */}
            <div className="grid gap-6">
              {/* Skill Breakdown */}
              <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <div className="text-xl font-bold text-slate-900">{copy.strengthsTitle}</div>
                <div className="mt-1 text-sm text-slate-500 leading-relaxed">{copy.strengthsBody}</div>
                <div className="mt-6 h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={strengths} layout="vertical" barCategoryGap={12} margin={{ left: -10, right: 30 }}>
                      <XAxis type="number" hide domain={[0, 100]} />
                      <YAxis
                        type="category"
                        dataKey="skill"
                        axisLine={false}
                        tickLine={false}
                        width={110}
                        tick={{ fill: '#475569', fontSize: 11 }}
                      />
                      <Tooltip 
                        cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '4px 8px',
                          fontSize: '11px'
                        }}
                        itemStyle={{ color: '#ffffff', padding: 0 }}
                        labelStyle={{ display: 'none' }}
                      />
                      <Bar dataKey="score" fill="#14b8a6" radius={[0, 8, 8, 0]} barSize={12}>
                        <LabelList 
                          dataKey="score" 
                          position="right" 
                          formatter={(val: number) => `${val}%`}
                          style={{ fill: '#475569', fontSize: 10, fontWeight: 'bold' }} 
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recent Sessions list (dark theme) */}
              <div className="rounded-[28px] bg-slate-950 p-6 text-white shadow-lg shadow-slate-950/10">
                <div className="flex items-center justify-between">
                  <div className="text-xl font-bold">{copy.sessionsTitle}</div>
                  {hasRealData && (
                    <Button variant="link" size="sm" asChild className="text-teal-400 hover:text-teal-300 p-0 h-auto">
                      <Link to="/app/sessions" className="flex items-center text-sm font-semibold">
                        {language === 'vi' ? 'Xem tất cả' : 'View all'}
                        <ChevronRight className="w-4 h-4 ml-0.5" />
                      </Link>
                    </Button>
                  )}
                </div>
                <div className="mt-1.5 text-sm text-slate-400 leading-relaxed">{copy.sessionsBody}</div>
                
                <div className="mt-6 space-y-3">
                  {hasRealData ? (
                    filteredSessions.slice(0, 3).map((session) => (
                      <Link
                        key={session.id}
                        to={`/app/sessions/${session.id}`}
                        className="block rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 hover:border-white/20 transition-all duration-200"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="font-semibold text-white group-hover:text-teal-300 transition-colors">
                              {roleLabelMap[session.role]?.[language === 'vi' ? 'vi' : 'en'] || session.role}
                            </div>
                            <div className="mt-1 text-xs text-white/50 capitalize">
                              {levelLabels[session.level]?.[language === 'vi' ? 'vi' : 'en'] || session.level} • {session.question_count ?? 0} {t('dashboard', 'questions')}
                            </div>
                            <div className="mt-1.5 text-sm text-teal-300 font-medium">
                              {session.avg_score != null 
                                ? `${session.avg_score.toFixed(1)}/10 score` 
                                : copy.inProgress}
                            </div>
                          </div>
                          <div
                            className={`rounded-full px-2.5 py-0.5 text-2xs md:text-xs font-semibold ${
                              session.status === 'COMPLETED'
                                ? (session.avg_score ?? 0) >= 7
                                  ? 'bg-teal-400/20 text-teal-200'
                                  : 'bg-amber-300/15 text-amber-100'
                                : 'bg-blue-400/20 text-blue-200'
                            }`}
                          >
                            {session.status === 'COMPLETED'
                              ? ((session.avg_score ?? 0) >= 7 ? copy.strong : copy.mixed)
                              : copy.inProgress}
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    sessionsDataFallback[getCategoryForRole(roleFilter)].map((session) => (
                      <div key={session.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="font-medium text-white">{session.title}</div>
                            <div className="mt-1 text-sm text-white/60">{(session.score / 10).toFixed(1)}/10 score</div>
                          </div>
                          <div
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              session.status === 'strong' ? 'bg-teal-400/20 text-teal-200' : 'bg-amber-300/15 text-amber-100'
                            }`}
                          >
                            {session.status === 'strong' ? copy.strong : copy.mixed}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
