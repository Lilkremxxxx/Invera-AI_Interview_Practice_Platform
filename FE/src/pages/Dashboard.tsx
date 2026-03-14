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
  Loader2
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';
import { sessionsApi, SessionOut } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

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
          <h1 className="text-3xl font-bold text-foreground">{t('dashboard', 'title')}</h1>
          <p className="text-muted-foreground">{t('dashboard', 'welcome')}</p>
        </div>
        <Button variant="accent" size="lg" asChild>
          <Link to="/app/new">
            <PlusCircle className="w-5 h-5" />
            {t('dashboard', 'newSession')}
          </Link>
        </Button>
      </div>

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
                  <p className="text-sm text-muted-foreground mb-1">Hoàn thành</p>
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
            <div className="text-center py-8 text-muted-foreground">
              <p>Chưa có session nào.</p>
              <Button variant="accent" className="mt-4" asChild>
                <Link to="/app/new">Tạo session đầu tiên</Link>
              </Button>
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