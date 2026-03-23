import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  PlusCircle, 
  TrendingUp, 
  Clock, 
  Flame, 
  Target,
  ChevronRight,
  Calendar,
  Loader2,
  Sparkles,
  BookOpen,
  Zap
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { sessionsApi, SessionOut } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatPlanLabel, formatPlanStatus } from '@/lib/plans';

const roleLabels: Record<string, { vi: string; en: string }> = {
  frontend: { vi: 'Lập trình viên Frontend', en: 'Frontend Developer' },
  backend: { vi: 'Lập trình viên Backend', en: 'Backend Developer' },
  fullstack: { vi: 'Lập trình viên Full Stack', en: 'Full Stack Developer' },
};

const levelLabels: Record<string, { vi: string; en: string }> = {
  intern: { vi: 'Thực tập sinh', en: 'Intern' },
  junior: { vi: 'Junior', en: 'Junior' },
  mid: { vi: 'Trung cấp', en: 'Mid-level' },
};

const Dashboard = () => {
  const { t, language } = useLanguage();
  const { user } = useAuthContext();

  // Lấy first name từ email (trước dấu @)
  const firstName = user?.email?.split('@')[0] || '';
  const canStartNewSession = user?.can_start_new_session ?? true;
  const needsUpgrade = !user?.is_admin && !canStartNewSession;
  const copy = {
    currentPlanCta: language === 'vi' ? 'Nâng cấp gói' : 'Upgrade plan',
    greeting: (name: string) => (language === 'vi' ? `Xin chào, ${name} 👋` : `Hi, ${name} 👋`),
    currentPlanLead: language === 'vi' ? 'Gói hiện tại:' : 'Current plan:',
    trialTitle: language === 'vi' ? 'Bạn đã dùng hết Free trial' : 'Your free trial is exhausted',
    trialBody: language === 'vi'
      ? 'Hãy nâng cấp lên Basic hoặc Pro để tiếp tục tạo session mới.'
      : 'Upgrade to Basic or Pro to continue creating new sessions.',
    completed: language === 'vi' ? 'Completed' : 'Completed',
    inProgress: language === 'vi' ? 'In progress' : 'In progress',
    noSessionsTitle: language === 'vi' ? 'Chưa có session nào — hãy bắt đầu! 🚀' : 'No sessions yet. Let’s get started! 🚀',
    noSessionsBody: language === 'vi' ? 'Mỗi buổi luyện tập đưa bạn đến gần mục tiêu hơn một bước.' : 'Every practice round moves you one step closer to your target role.',
    createFirstSession: language === 'vi' ? 'Tạo session đầu tiên' : 'Create your first session',
    roleTipTitle: language === 'vi' ? 'Chọn role phù hợp' : 'Pick the right role',
    roleTipBody: language === 'vi' ? 'Frontend, Backend hoặc Fullstack' : 'Frontend, Backend, or Fullstack',
    answerTipTitle: language === 'vi' ? 'Trả lời cụ thể' : 'Answer with specifics',
    answerTipBody: language === 'vi' ? 'Dùng ví dụ thực tế + STAR' : 'Use real examples + STAR',
    practiceTipTitle: language === 'vi' ? 'Luyện đều mỗi ngày' : 'Practice consistently',
    practiceTipBody: language === 'vi' ? '5 câu mỗi ngày là đủ' : 'Five questions a day is enough',
  };

  const { data: sessions = [], isLoading } = useQuery<SessionOut[]>({
    queryKey: ['sessions'],
    queryFn: sessionsApi.list,
  });

  const completedSessions = sessions.filter(s => s.status === 'COMPLETED');
  const totalSessions = sessions.length;
  const scoresWithData = completedSessions.filter(s => s.avg_score != null);
  const avgScore = scoresWithData.length > 0
    ? Math.round(scoresWithData.reduce((sum, s) => sum + (s.avg_score ?? 0), 0) / scoresWithData.length)
    : null;
  const totalQuestions = sessions.reduce((sum, s) => sum + (s.question_count ?? 0), 0);

  // Progress chart: last 7 completed sessions sorted by date
  const progressData = completedSessions
    .filter(s => s.avg_score != null)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(-7)
    .map(s => ({
      date: new Date(s.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      score: Math.round(s.avg_score ?? 0),
    }));

  const recentSessions = sessions.slice(0, 4);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {firstName ? copy.greeting(firstName) : t('dashboard', 'title')}
          </h1>
          <p className="text-muted-foreground">{t('dashboard', 'welcome')}</p>
        </div>
        <Button variant="accent" size="lg" asChild>
          <Link to={canStartNewSession ? "/app/new" : "/app/upgrade"}>
            <PlusCircle className="w-5 h-5" />
            {canStartNewSession ? t('dashboard', 'newSession') : copy.currentPlanCta}
          </Link>
        </Button>
      </div>

      {needsUpgrade && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900">
          <AlertTitle>{copy.trialTitle}</AlertTitle>
          <AlertDescription>
            {copy.currentPlanLead} <strong>{formatPlanLabel(user, language)}</strong> · {formatPlanStatus(user, language)}.
            {' '}{copy.trialBody}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('dashboard', 'totalSessions')}</p>
                  <p className="text-3xl font-bold text-foreground">{totalSessions}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Target className="w-6 h-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('dashboard', 'avgScore')}</p>
                  <p className="text-3xl font-bold text-foreground">{avgScore != null ? `${avgScore}%` : '—'}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{copy.completed}</p>
                  <p className="text-3xl font-bold text-foreground">{completedSessions.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                  <Flame className="w-6 h-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('dashboard', 'questionsAnswered')}</p>
                  <p className="text-3xl font-bold text-foreground">{totalQuestions}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-info" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Progress Chart */}
      {progressData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard', 'progressTime')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--accent))"
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--accent))', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t('dashboard', 'recentSessions')}</span>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/app/sessions">
                {t('dashboard', 'viewAll')}
                <ChevronRight className="w-4 h-4" />
              </Link>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>
          ) : recentSessions.length === 0 ? (
            <div className="py-8 space-y-6">
              {/* Motivational empty state */}
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl gradient-accent flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-accent-foreground" />
                </div>
                <h3 className="font-semibold text-foreground text-lg mb-2">{copy.noSessionsTitle}</h3>
                <p className="text-muted-foreground text-sm mb-4">{copy.noSessionsBody}</p>
                <Button variant="accent" size="lg" asChild>
                  <Link to={canStartNewSession ? "/app/new" : "/app/upgrade"}>
                    <PlusCircle className="w-5 h-5" />
                    {canStartNewSession ? copy.createFirstSession : copy.currentPlanCta}
                  </Link>
                </Button>
              </div>
              {/* Tips */}
              <div className="grid sm:grid-cols-3 gap-4 pt-4 border-t">
                <div className="flex gap-3 p-3 rounded-xl bg-muted/50">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Target className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{copy.roleTipTitle}</p>
                    <p className="text-xs text-muted-foreground">{copy.roleTipBody}</p>
                  </div>
                </div>
                <div className="flex gap-3 p-3 rounded-xl bg-muted/50">
                  <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-4 h-4 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{copy.answerTipTitle}</p>
                    <p className="text-xs text-muted-foreground">{copy.answerTipBody}</p>
                  </div>
                </div>
                <div className="flex gap-3 p-3 rounded-xl bg-muted/50">
                  <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-4 h-4 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{copy.practiceTipTitle}</p>
                    <p className="text-xs text-muted-foreground">{copy.practiceTipBody}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {recentSessions.map((session) => (
                <Link
                  key={session.id}
                  to={`/app/sessions/${session.id}`}
                  className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                      <Target className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">
                        {roleLabels[session.role]?.[language] || session.role}
                      </h4>
                      <p className="text-sm text-muted-foreground capitalize">
                        {levelLabels[session.level]?.[language] || session.level} • {session.question_count ?? 0} {t('dashboard', 'questions')} • {session.mode}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={cn(
                        "font-semibold",
                        session.avg_score != null && session.avg_score >= 70 ? "text-success" :
                        session.avg_score != null && session.avg_score >= 40 ? "text-warning" : "text-muted-foreground"
                      )}>
                        {session.avg_score != null ? `${session.avg_score}%` : '—'}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {new Date(session.created_at).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
