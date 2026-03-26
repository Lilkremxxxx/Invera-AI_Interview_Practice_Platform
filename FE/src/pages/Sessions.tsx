import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Calendar, 
  Target, 
  ChevronRight,
  Download,
  Mic,
  Type,
  Video,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { sessionsApi, SessionOut } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { roleLabelMap } from '@/lib/mock-data';
import { canExportSessions } from '@/lib/plans';
import { formatScore, getScoreTextClass } from '@/lib/score';
import { useToast } from '@/hooks/use-toast';

const levelLabels: Record<string, { vi: string; en: string }> = {
  intern: { vi: 'Thực tập sinh', en: 'Intern' },
  fresher: { vi: 'Fresher', en: 'Fresher' },
  junior: { vi: 'Junior', en: 'Junior' },
  mid: { vi: 'Trung cấp', en: 'Mid-level' },
  senior: { vi: 'Senior', en: 'Senior' },
};

const Sessions = () => {
  const { user } = useAuthContext();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const copy = {
    loadError: language === 'vi' ? 'Không thể tải sessions. Vui lòng thử lại.' : 'Unable to load sessions. Please try again.',
    completed: language === 'vi' ? 'Hoàn thành' : 'Completed',
    inProgress: language === 'vi' ? 'Đang làm' : 'In progress',
    exportFailed: language === 'vi' ? 'Không thể xuất toàn bộ sessions lúc này.' : 'Unable to export all sessions right now.',
    exportingAll: language === 'vi' ? 'Đang xuất...' : 'Exporting...',
    locale: language === 'vi' ? 'vi-VN' : 'en-US',
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<string | null>(null);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const canExport = canExportSessions(user);

  const { data: sessions = [], isLoading, error } = useQuery<SessionOut[]>({
    queryKey: ['sessions'],
    queryFn: sessionsApi.list,
  });

  const filteredSessions = sessions.filter(session => {
    const roleLabel = roleLabelMap[session.role]?.[language]?.toLowerCase() || session.role;
    const matchesSearch = roleLabel.includes(searchQuery.toLowerCase());
    const matchesMode = !filterMode || session.mode === filterMode;
    return matchesSearch && matchesMode;
  });

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'voice': return <Mic className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      default: return <Type className="w-4 h-4" />;
    }
  };

  const handleExportAll = async () => {
    setIsExportingAll(true);
    try {
      const { blob, filename } = await sessionsApi.downloadAllPdf();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || 'invera-sessions-export.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: copy.exportFailed,
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setIsExportingAll(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('sessions', 'title')}</h1>
          <p className="text-muted-foreground">{t('sessions', 'subtitle')}</p>
        </div>
        {canExport && (
          <Button variant="outline" onClick={handleExportAll} disabled={isExportingAll}>
            <Download className="w-4 h-4" />
            {isExportingAll ? copy.exportingAll : t('sessions', 'exportAll')}
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder={t('sessions', 'searchPlaceholder')}
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant={filterMode === null ? "secondary" : "ghost"} size="sm" onClick={() => setFilterMode(null)}>
                {t('sessions', 'all')}
              </Button>
              <Button variant={filterMode === 'text' ? "secondary" : "ghost"} size="sm" onClick={() => setFilterMode('text')}>
                <Type className="w-4 h-4" />{t('sessions', 'text')}
              </Button>
              <Button variant={filterMode === 'voice' ? "secondary" : "ghost"} size="sm" onClick={() => setFilterMode('voice')}>
                <Mic className="w-4 h-4" />{t('sessions', 'voice')}
              </Button>
              <Button variant={filterMode === 'video' ? "secondary" : "ghost"} size="sm" onClick={() => setFilterMode('video')}>
                <Video className="w-4 h-4" />{t('sessions', 'video')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle>{t('sessions', 'historyTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">{copy.loadError}</div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{t('sessions', 'noFound')}</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || filterMode ? t('sessions', 'adjustFilter') : t('sessions', 'getStarted')}
              </p>
              <Button variant="accent" asChild>
                <Link to="/app/new">{t('sessions', 'newSession')}</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSessions.map((session) => (
                <Link
                  key={session.id}
                  to={`/app/sessions/${session.id}`}
                  className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                      <Target className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground group-hover:text-accent transition-colors">
                        {roleLabelMap[session.role]?.[language] || session.role}
                      </h4>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{levelLabels[session.level]?.[language] || session.level}</span>
                        <span>•</span>
                        <span>{session.question_count ?? 0} {t('sessions', 'questions')}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          {getModeIcon(session.mode)}
                          {session.mode}
                        </span>
                        <span>•</span>
                        <span className={cn(
                          'font-medium text-xs px-1.5 py-0.5 rounded',
                          session.status === 'COMPLETED' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                        )}>
                          {session.status === 'COMPLETED' ? copy.completed : copy.inProgress}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className={cn(
                        "text-lg font-semibold",
                        getScoreTextClass(session.avg_score)
                      )}>
                        {formatScore(session.avg_score)}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {new Date(session.created_at).toLocaleDateString(copy.locale)}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-accent transition-colors" />
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

export default Sessions;
