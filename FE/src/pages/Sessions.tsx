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
  Video
} from 'lucide-react';
import { recentSessions } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

const Sessions = () => {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<string | null>(null);

  const filteredSessions = recentSessions.filter(session => {
    const matchesSearch = session.role[language].toLowerCase().includes(searchQuery.toLowerCase());
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('sessions', 'title')}</h1>
          <p className="text-muted-foreground">{t('sessions', 'subtitle')}</p>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4" />
          {t('sessions', 'exportAll')}
        </Button>
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
              <Button
                variant={filterMode === null ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setFilterMode(null)}
              >
                {t('sessions', 'all')}
              </Button>
              <Button
                variant={filterMode === 'text' ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setFilterMode('text')}
              >
                <Type className="w-4 h-4" />
                {t('sessions', 'text')}
              </Button>
              <Button
                variant={filterMode === 'voice' ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setFilterMode('voice')}
              >
                <Mic className="w-4 h-4" />
                {t('sessions', 'voice')}
              </Button>
              <Button
                variant={filterMode === 'video' ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setFilterMode('video')}
              >
                <Video className="w-4 h-4" />
                {t('sessions', 'video')}
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
          {filteredSessions.length === 0 ? (
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
                        {session.role[language]}
                      </h4>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{session.level[language]}</span>
                        <span>•</span>
                        <span>{session.questionsCount} {t('sessions', 'questions')}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          {getModeIcon(session.mode)}
                          {session.mode}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className={cn(
                        "text-lg font-semibold",
                        session.score >= 80 ? "text-success" :
                        session.score >= 60 ? "text-warning" : "text-destructive"
                      )}>
                        {session.score}%
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {session.date}
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
