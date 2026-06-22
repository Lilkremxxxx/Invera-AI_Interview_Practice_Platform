import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList, LineChart, Line, Label } from 'recharts';
import { 
  PlusCircle, 
  Loader2, 
  ChevronRight, 
  Target, 
  CheckCircle2, 
  Clock3, 
  BarChart3, 
  Sparkles,
  Info,
  Camera,
  Eye,
  Activity,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { sessionsApi, SessionOut, TelemetrySessionOverviewOut } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatPlanLabel, formatPlanStatus } from '@/lib/plans';
import { roleLabelMap } from '@/lib/mock-data';
import { buildTelemetryAnswerReplay, buildTelemetrySessionSeries } from '@/lib/interview-progress';

type TelemetryMetricAxis = 'percent' | 'detail';
type TelemetryDeltaDirection = 'higher' | 'lower' | 'neutral';

type TelemetryMetricDefinition = {
  key: 'gaze' | 'posture' | 'confidence' | 'blink' | 'tension' | 'wpm' | 'fillers';
  label: string;
  color: string;
  axis: TelemetryMetricAxis;
  betterDirection: TelemetryDeltaDirection;
};

type TelemetryTooltipProps = {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number | string }>;
  label?: string;
  metricMap: Map<string, TelemetryMetricDefinition>;
};

const formatTelemetryDelta = (value: number): string => {
  if (value === 0) return '0';
  return `${value > 0 ? '+' : ''}${value}`;
};

const getTelemetryDeltaTone = (delta: number, direction: TelemetryDeltaDirection): string => {
  if (delta === 0 || direction === 'neutral') return 'text-slate-500';
  const improved = direction === 'higher' ? delta > 0 : delta < 0;
  return improved ? 'text-emerald-600' : 'text-rose-600';
};

function TelemetryTooltipContent({ active, payload, label, metricMap }: TelemetryTooltipProps) {
  if (!active || !payload?.length) return null;

  const rows = payload
    .filter((entry) => typeof entry.dataKey === 'string' && metricMap.has(entry.dataKey))
    .map((entry) => ({
      metric: metricMap.get(entry.dataKey as string)!,
      value: typeof entry.value === 'number' ? entry.value : Number(entry.value ?? 0),
    }));

  if (!rows.length) return null;

  return (
    <div className="min-w-[180px] rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-2 space-y-2">
        {rows.map((row) => (
          <div key={row.metric.key} className="flex items-center justify-between gap-4 text-sm">
            <div className="inline-flex items-center gap-2 text-slate-700">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.metric.color }} />
              <span>{row.metric.label}</span>
            </div>
            <span className="font-semibold text-slate-900">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

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
  const { data: telemetryOverview } = useQuery({
    queryKey: ['telemetry-overview'],
    queryFn: sessionsApi.telemetryOverview,
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
  const [selectedTelemetrySessionId, setSelectedTelemetrySessionId] = useState<string | null>(null);

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
    strengthsBody: language === 'vi' ? 'Eye contact và confidence hiện được đồng bộ trực tiếp từ telemetry camera của các phiên đã hoàn thành.' : 'Eye contact and confidence now reflect your actual camera telemetry across completed sessions.',
    sessionsTitle: language === 'vi' ? 'Các phiên phỏng vấn gần đây' : 'Recent mock sessions',
    sessionsBody: language === 'vi' ? 'Danh sách các buổi phỏng vấn giả lập gần đây của bạn.' : 'Your most recent mock interview sessions.',
    strong: language === 'vi' ? 'Tốt' : 'Strong',
    mixed: language === 'vi' ? 'Cần cải thiện' : 'Needs work',
    range7d: language === 'vi' ? '7 ngày' : '7 days',
    range30d: language === 'vi' ? '30 ngày' : '30 days',
    inProgress: language === 'vi' ? 'Đang thực hiện' : 'In progress',
    demoNotice: language === 'vi' ? 'Đang hiển thị dữ liệu mẫu. Hãy thực hiện phỏng vấn để cập nhật tiến độ thực tế.' : 'Showing demo data. Complete actual interviews to view your live stats.',
    telemetryTitle: language === 'vi' ? 'Tiến bộ camera theo thời gian' : 'Camera progress over time',
    telemetryBody: language === 'vi' ? 'Theo dõi eye contact, posture, confidence và các dấu hiệu căng thẳng qua nhiều buổi luyện tập.' : 'Track eye contact, posture, confidence, and stress signals across practice sessions.',
    telemetryEmpty: language === 'vi' ? 'Chưa có đủ dữ liệu camera để dựng dashboard này.' : 'Not enough camera telemetry yet to build this dashboard.',
    telemetryDrilldown: language === 'vi' ? 'Drill-down theo câu trả lời' : 'Answer-level drill-down',
    telemetryTrendLabel: language === 'vi' ? 'Eye contact' : 'Eye contact',
    telemetryConfidenceLabel: language === 'vi' ? 'Confidence' : 'Confidence',
    postureLabel: language === 'vi' ? 'Posture' : 'Posture',
    wpmLabel: 'WPM',
    fillersLabel: language === 'vi' ? 'Fillers' : 'Fillers',
    blinkLabel: language === 'vi' ? 'Blink' : 'Blink',
    tensionLabel: language === 'vi' ? 'Tension' : 'Tension',
    answerCountLabel: language === 'vi' ? 'mốc telemetry' : 'telemetry points',
    progressYAxis: language === 'vi' ? 'Điểm' : 'Score',
    progressXAxis: language === 'vi' ? 'Ngày' : 'Date',
  };

  const telemetryMetricConfig = useMemo<TelemetryMetricDefinition[]>(() => ([
    { key: 'gaze', label: copy.telemetryTrendLabel, color: '#0f766e', axis: 'percent', betterDirection: 'higher' },
    { key: 'posture', label: copy.postureLabel, color: '#2563eb', axis: 'percent', betterDirection: 'higher' },
    { key: 'confidence', label: copy.telemetryConfidenceLabel, color: '#7c3aed', axis: 'percent', betterDirection: 'higher' },
    { key: 'blink', label: copy.blinkLabel, color: '#f59e0b', axis: 'percent', betterDirection: 'lower' },
    { key: 'tension', label: copy.tensionLabel, color: '#ef4444', axis: 'percent', betterDirection: 'lower' },
    { key: 'wpm', label: copy.wpmLabel, color: '#1d4ed8', axis: 'detail', betterDirection: 'neutral' },
    { key: 'fillers', label: copy.fillersLabel, color: '#475569', axis: 'detail', betterDirection: 'lower' },
  ]), [copy.blinkLabel, copy.fillersLabel, copy.postureLabel, copy.telemetryConfidenceLabel, copy.telemetryTrendLabel, copy.tensionLabel, copy.wpmLabel]);

  const [visibleTelemetryMetrics, setVisibleTelemetryMetrics] = useState<Array<TelemetryMetricDefinition['key']>>([
    'gaze',
    'posture',
    'confidence',
    'blink',
    'tension',
    'wpm',
    'fillers',
  ]);

  const telemetryMetricMap = useMemo(
    () => new Map(telemetryMetricConfig.map((metric) => [metric.key, metric])),
    [telemetryMetricConfig],
  );

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
      return {
        totalSessions: 0,
        avgScore: '0/10',
        completedSessions: 0,
        questionsAnswered: 0,
      };
    }
  }, [hasRealData, totalSessionsCount, avgScore, completedCount, questionsAnsweredCount]);

  const telemetrySessions = useMemo(() => {
    const days = rangeFilter === '7d' ? 7 : 30;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return (telemetryOverview?.sessions ?? [])
      .filter((session) => {
        if (session.role !== roleFilter) return false;
        const createdAt = new Date(session.created_at);
        return createdAt >= cutoff;
      })
      .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
  }, [telemetryOverview?.sessions, roleFilter, rangeFilter]);

  // Skill breakdown vertical bars
  const strengths = useMemo(() => {
    if (telemetrySessions.length > 0) {
      const latestSummary = telemetrySessions[0]?.summary;
      return [
        { skill: copy.telemetryTrendLabel, score: latestSummary?.gaze ?? 0 },
        { skill: copy.telemetryConfidenceLabel, score: latestSummary?.confidence ?? 0 },
        { skill: copy.postureLabel, score: latestSummary?.posture ?? 0 },
        { skill: copy.fillersLabel, score: Math.max(0, 100 - Math.min((latestSummary?.fillers ?? 0) * 10, 100)) },
      ];
    }

    const cat = getCategoryForRole(roleFilter);
    const baseSkills = strengthDataFallback[cat];
    if (!hasRealData || avgScore === null) {
      return baseSkills.map(skill => ({
        skill: skill.skill,
        score: 0,
      }));
    }

    const scale = avgScore / 10;
    return baseSkills.map(skill => ({
      skill: skill.skill,
      score: Math.max(10, Math.min(100, Math.round(skill.score * (scale / 0.8)))),
    }));
  }, [avgScore, copy.fillersLabel, copy.postureLabel, copy.telemetryConfidenceLabel, copy.telemetryTrendLabel, hasRealData, roleFilter, telemetrySessions]);

  const strongestSkill = useMemo(() => {
    return [...strengths].sort((a, b) => b.score - a.score)[0];
  }, [strengths]);

  // Progress chart data on scale [0, 10]
  const trend = useMemo(() => {
    if (!hasRealData) {
      return [];
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
  }, [completedSessions, hasRealData]);

  const telemetrySeries = useMemo(
    () => buildTelemetrySessionSeries(telemetrySessions),
    [telemetrySessions],
  );

  useEffect(() => {
    if (!telemetrySessions.length) {
      setSelectedTelemetrySessionId(null);
      return;
    }
    if (!selectedTelemetrySessionId || !telemetrySessions.some((session) => session.session_id === selectedTelemetrySessionId)) {
      setSelectedTelemetrySessionId(telemetrySessions[0].session_id);
    }
  }, [telemetrySessions, selectedTelemetrySessionId]);

  const selectedTelemetrySession = useMemo<TelemetrySessionOverviewOut | null>(
    () => telemetrySessions.find((session) => session.session_id === selectedTelemetrySessionId) ?? null,
    [telemetrySessions, selectedTelemetrySessionId],
  );

  const telemetryReplay = useMemo(
    () => buildTelemetryAnswerReplay(selectedTelemetrySession),
    [selectedTelemetrySession],
  );

  const previousTelemetrySession = useMemo(() => {
    if (!selectedTelemetrySessionId) return null;
    const selectedIndex = telemetrySessions.findIndex((session) => session.session_id === selectedTelemetrySessionId);
    if (selectedIndex === -1 || selectedIndex === telemetrySessions.length - 1) return null;
    return telemetrySessions[selectedIndex + 1];
  }, [selectedTelemetrySessionId, telemetrySessions]);

  const telemetryLegendData = useMemo(
    () => telemetryMetricConfig.map((metric) => {
      const currentValue = selectedTelemetrySession?.summary?.[metric.key] ?? 0;
      const previousValue = previousTelemetrySession?.summary?.[metric.key] ?? null;
      const delta = typeof previousValue === 'number' ? currentValue - previousValue : 0;
      return {
        ...metric,
        currentValue,
        delta,
        isVisible: visibleTelemetryMetrics.includes(metric.key),
      };
    }),
    [previousTelemetrySession, selectedTelemetrySession, telemetryMetricConfig, visibleTelemetryMetrics],
  );

  const toggleTelemetryMetric = (metricKey: TelemetryMetricDefinition['key']) => {
    setVisibleTelemetryMetrics((current) => (
      current.includes(metricKey)
        ? current.filter((key) => key !== metricKey)
        : [...current, metricKey]
    ));
  };

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

          <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-xl font-bold text-slate-900">{copy.telemetryTitle}</div>
                <div className="mt-1 text-sm text-slate-500 leading-relaxed">{copy.telemetryBody}</div>
              </div>
              {selectedTelemetrySession && (
                <div className="text-sm text-slate-500">
                  {roleLabelMap[selectedTelemetrySession.role]?.[language === 'vi' ? 'vi' : 'en'] || selectedTelemetrySession.role}
                  {' • '}
                  {selectedTelemetrySession.summary.answer_count} {copy.answerCountLabel}
                </div>
              )}
            </div>

            {telemetrySeries.length === 0 ? (
              <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                {copy.telemetryEmpty}
              </div>
            ) : (
              <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_300px]">
                <div className="space-y-4">
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={telemetrySeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid stroke="#e2e8f0" vertical={false} strokeDasharray="4 4" />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                        <YAxis yAxisId="percent" tickLine={false} axisLine={false} width={36} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 12 }} />
                        <YAxis yAxisId="detail" orientation="right" tickLine={false} axisLine={false} width={44} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                        <Tooltip content={<TelemetryTooltipContent metricMap={telemetryMetricMap} />} />
                        {telemetryMetricConfig.filter((metric) => visibleTelemetryMetrics.includes(metric.key)).map((metric) => (
                          <Line
                            key={metric.key}
                            type="monotone"
                            yAxisId={metric.axis}
                            dataKey={metric.key}
                            name={metric.label}
                            stroke={metric.color}
                            strokeWidth={metric.key === 'gaze' ? 3 : 2}
                            dot={false}
                            activeDot={{ r: metric.key === 'gaze' ? 5 : 4 }}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {telemetryLegendData.map((metric) => (
                      <button
                        key={metric.key}
                        type="button"
                        aria-pressed={metric.isVisible}
                        onClick={() => toggleTelemetryMetric(metric.key)}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          metric.isVisible
                            ? 'border-slate-300 bg-slate-100 text-slate-900'
                            : 'border-slate-200 bg-white text-slate-400'
                        }`}
                      >
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: metric.color }} />
                        <span>{metric.label}</span>
                        <span className={`font-semibold ${getTelemetryDeltaTone(metric.delta, metric.betterDirection)}`}>
                          {formatTelemetryDelta(metric.delta)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  {selectedTelemetrySession && [
                    { label: copy.telemetryTrendLabel, value: `${selectedTelemetrySession.summary.gaze}%`, icon: Eye },
                    { label: copy.postureLabel, value: `${selectedTelemetrySession.summary.posture}%`, icon: Activity },
                    { label: copy.blinkLabel, value: `${selectedTelemetrySession.summary.blink}%`, icon: Camera },
                    { label: copy.tensionLabel, value: `${selectedTelemetrySession.summary.tension}%`, icon: Sparkles },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                      <div className="flex items-center justify-between text-slate-500 text-sm">
                        <span>{item.label}</span>
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div className="mt-2 text-xl font-bold text-slate-900">{item.value}</div>
                    </div>
                  ))}
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <div className="text-base font-bold text-slate-900">{copy.telemetryDrilldown}</div>
                    <div className="mt-3 max-h-[260px] space-y-2 overflow-y-auto pr-1">
                      {telemetryReplay.map((point) => (
                        <div key={`${point.label}-${point.submittedAt ?? ''}`} className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-slate-900">{point.label}</div>
                              <div className="text-xs text-slate-500">
                                {point.isFollowUp ? 'Follow-up' : 'Main answer'} · {point.score.toFixed(1)}/10
                              </div>
                            </div>
                            <div className="text-right text-xs text-slate-500">
                              <div>{copy.telemetryTrendLabel}: {point.gaze}%</div>
                              <div>{copy.telemetryConfidenceLabel}: {point.confidence}%</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main Visual Panels Grid */}
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_320px]">
            {/* Chart Area */}
            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="mb-6">
                <div className="text-xl font-bold text-slate-900">{copy.chartTitle}</div>
                <div className="mt-1 text-sm text-slate-500 leading-relaxed">{copy.chartBody}</div>
              </div>
              <div className="h-[250px] w-full">
                {trend.length === 0 ? (
                  <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                    {language === 'vi' ? 'Chưa có dữ liệu tiến độ. Hãy thực hiện phỏng vấn để cập nhật.' : 'No progress data yet. Complete actual interviews to view.'}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend} margin={{ top: 10, right: 10, left: 0, bottom: 16 }}>
                      <defs>
                        <linearGradient id="demoScoreGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#e2e8f0" vertical={false} strokeDasharray="4 4" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }}>
                        <Label value={copy.progressXAxis} position="insideBottom" offset={-8} />
                      </XAxis>
                      <YAxis tickLine={false} axisLine={false} width={48} domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fill: '#64748b', fontSize: 12 }}>
                        <Label value={copy.progressYAxis} angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} />
                      </YAxis>
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
                )}
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
                                : (session.status === 'COMPLETED' ? (language === 'vi' ? 'Đợi chấm điểm' : 'Waiting for grading') : copy.inProgress)}
                            </div>
                          </div>
                          <div
                            className={`rounded-full px-2.5 py-0.5 text-2xs md:text-xs font-semibold ${
                              session.status === 'COMPLETED'
                                ? session.evaluation_report
                                  ? (session.avg_score ?? 0) >= 7
                                    ? 'bg-teal-400/20 text-teal-200'
                                    : 'bg-amber-300/15 text-amber-100'
                                  : 'bg-blue-400/20 text-blue-200'
                                : 'bg-blue-400/20 text-blue-200'
                            }`}
                          >
                            {session.status === 'COMPLETED'
                              ? session.evaluation_report
                                ? ((session.avg_score ?? 0) >= 7 ? copy.strong : copy.mixed)
                                : (language === 'vi' ? 'Đợi AI chấm điểm' : 'Waiting for AI grading')
                              : copy.inProgress}
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-slate-400">
                      {t('dashboard', 'noSessions')}
                    </div>
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
