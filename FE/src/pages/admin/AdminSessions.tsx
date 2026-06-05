import { useEffect, useState, useMemo } from 'react';
import { Loader2, MonitorPlay, Search, ChevronLeft, ChevronRight, CheckCircle2, PlayCircle, BarChart3 } from 'lucide-react';

import { adminApi, AdminStats } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';

interface SessionItem {
  id: string;
  user_id: string;
  user_email: string;
  user_full_name: string | null;
  major: string;
  role: string;
  level: string;
  mode: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  question_count: number;
  avg_score: number | null;
  time_limit_minutes: number | null;
}

export default function AdminSessions() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);

  // Filter states
  const [search, setSearch] = useState('');
  const [major, setMajor] = useState('all');
  const [status, setStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const copy = {
    title: language === 'vi' ? 'Quản lý phiên luyện tập' : 'Practice Session Management',
    subtitle: language === 'vi' ? 'Xem tổng quan về các phiên luyện tập của người dùng, phân tích kết quả và giám sát tiến trình.' : 'Overview users\' practice sessions, analyze results, and monitor progress.',
    loadErrorTitle: language === 'vi' ? 'Không thể tải danh sách session' : 'Unable to load sessions list',
    retry: language === 'vi' ? 'Vui lòng thử lại.' : 'Please try again.',
    sessionsOverview: language === 'vi' ? 'Tổng quan Session' : 'Sessions Overview',
    sessionsOverviewDesc: language === 'vi' ? 'Số liệu thống kê về tất cả các phiên phỏng vấn trên hệ thống.' : 'Statistics about all interview sessions in the system.',
    totalSessions: language === 'vi' ? 'Tổng số Session' : 'Total Sessions',
    completedSessions: language === 'vi' ? 'Session Hoàn Thành' : 'Completed Sessions',
    inProgressSessions: language === 'vi' ? 'Session Đang Chạy' : 'Sessions In Progress',
    avgScore: language === 'vi' ? 'Điểm Trung Bình' : 'Average Score',
    searchPlaceholder: language === 'vi' ? 'Tìm theo email hoặc tên người dùng' : 'Search by user email or name',
    allMajors: language === 'vi' ? 'Mọi ngành' : 'All Majors',
    allStatuses: language === 'vi' ? 'Mọi trạng thái' : 'All Statuses',
    completed: language === 'vi' ? 'Hoàn thành' : 'Completed',
    inProgress: language === 'vi' ? 'Đang phỏng vấn' : 'In Progress',
    userHeader: language === 'vi' ? 'Người dùng' : 'User',
    detailsHeader: language === 'vi' ? 'Chi tiết phiên' : 'Session details',
    statusHeader: language === 'vi' ? 'Trạng thái' : 'Status',
    scoreHeader: language === 'vi' ? 'Điểm trung bình' : 'Avg Score',
    dateHeader: language === 'vi' ? 'Thời gian' : 'Date',
    noSessions: language === 'vi' ? 'Không tìm thấy phiên luyện tập nào.' : 'No practice sessions found.',
    questionsCount: language === 'vi' ? 'câu hỏi' : 'questions',
    minuteSuffix: language === 'vi' ? 'phút' : 'mins',
    noLimit: language === 'vi' ? 'Không giới hạn' : 'No limit',
    locale: language === 'vi' ? 'vi-VN' : 'en-US',
  };

  const loadSessions = async (page = currentPage) => {
    setLoading(true);
    try {
      const res = await adminApi.getSessions({
        limit: pageSize,
        offset: (page - 1) * pageSize,
        search: search || undefined,
        major: major === 'all' ? undefined : major,
        status: status === 'all' ? undefined : status,
      });
      setSessions(res.items);
      setTotalItems(res.total);
      setCurrentPage(page);
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

  const loadStats = async () => {
    try {
      const statsData = await adminApi.getStats();
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load admin stats', err);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    loadSessions(1);
  }, [major, status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadSessions(1);
  };

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Helper formatting functions
  const prettyLabel = (val: string) => {
    if (!val) return '';
    return val.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{copy.title}</h2>
        <p className="text-muted-foreground mt-2">{copy.subtitle}</p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/50 shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">{copy.totalSessions}</CardTitle>
            <MonitorPlay className="w-4 h-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_sessions ?? 0}</div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">{copy.completedSessions}</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats?.completed_sessions ?? 0}</div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">{copy.inProgressSessions}</CardTitle>
            <PlayCircle className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">
              {Math.max((stats?.total_sessions ?? 0) - (stats?.completed_sessions ?? 0), 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">{copy.avgScore}</CardTitle>
            <BarChart3 className="w-4 h-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{stats?.avg_score ?? 0} / 10</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MonitorPlay className="w-5 h-5 text-accent" />
            {copy.sessionsOverview}
          </CardTitle>
          <CardDescription>{copy.sessionsOverviewDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Filters Form */}
          <form onSubmit={handleSearchSubmit} className="grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <Input
                placeholder={copy.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={major}
              onChange={(e) => setMajor(e.target.value)}
            >
              <option value="all">{copy.allMajors}</option>
              <option value="technology">Technology</option>
              <option value="finance">Finance</option>
              <option value="business">Business</option>
            </select>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">{copy.allStatuses}</option>
              <option value="COMPLETED">{copy.completed}</option>
              <option value="IN_PROGRESS">{copy.inProgress}</option>
            </select>
          </form>

          {/* List/Table */}
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">{copy.noSessions}</p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border border-border/50 overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-muted-foreground text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-6 py-3">{copy.userHeader}</th>
                      <th className="px-6 py-3">{copy.detailsHeader}</th>
                      <th className="px-6 py-3">{copy.statusHeader}</th>
                      <th className="px-6 py-3 text-center">{copy.scoreHeader}</th>
                      <th className="px-6 py-3 text-right">{copy.dateHeader}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {sessions.map((session) => (
                      <tr key={session.id} className="hover:bg-muted/10 bg-card">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-foreground">
                            {session.user_full_name || session.user_email.split('@')[0]}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">{session.user_email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-foreground flex items-center gap-1.5">
                            <Badge variant="outline" className="text-xs uppercase bg-accent/5 text-accent border-accent/20">
                              {session.major}
                            </Badge>
                            <span>{prettyLabel(session.role)}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                            <span>Level: <strong>{prettyLabel(session.level)}</strong></span>
                            <span>·</span>
                            <span>Mode: <strong>{prettyLabel(session.mode)}</strong></span>
                            <span>·</span>
                            <span>{session.question_count} {copy.questionsCount}</span>
                            <span>·</span>
                            <span>Limit: <strong>{session.time_limit_minutes ? `${session.time_limit_minutes} ${copy.minuteSuffix}` : copy.noLimit}</strong></span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {session.status === 'COMPLETED' ? (
                            <Badge className="bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/25">
                              {copy.completed}
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/25 animate-pulse">
                              {copy.inProgress}
                            </Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {session.avg_score !== null ? (
                            <span className="font-bold text-accent text-base">{session.avg_score} <span className="text-xs font-normal text-muted-foreground">/ 10</span></span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right text-xs text-muted-foreground">
                          <div>{new Date(session.created_at).toLocaleDateString(copy.locale)}</div>
                          <div className="mt-0.5">{new Date(session.created_at).toLocaleTimeString(copy.locale, { hour: '2-digit', minute: '2-digit' })}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              <div className="flex items-center justify-between pt-4 border-t border-sidebar-border">
                <div className="text-sm text-muted-foreground">
                  {language === 'vi'
                    ? `Hiển thị ${sessions.length} / ${totalItems} phiên (Trang ${currentPage}/${totalPages})`
                    : `Showing ${sessions.length} of ${totalItems} sessions (Page ${currentPage}/${totalPages})`}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadSessions(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {language === 'vi' ? 'Trang trước' : 'Previous'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadSessions(currentPage + 1)}
                    disabled={currentPage === totalPages || loading}
                  >
                    {language === 'vi' ? 'Trang sau' : 'Next'}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
