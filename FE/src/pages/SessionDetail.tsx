import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  Download, 
  Target,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Loader2,
  Play
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { getLocalizedQuestionCategory, getLocalizedQuestionText, sessionsApi, SessionDetail as SessionDetailType } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { StructuredFeedback } from '@/components/feedback/StructuredFeedback';
import { roleLabelMap } from '@/lib/mock-data';
import { canExportSessions } from '@/lib/plans';
import { formatScore, formatScoreValue, getScoreBgClass, getScoreTextClass, toScoreProgress } from '@/lib/score';
import { useToast } from '@/hooks/use-toast';
const levelLabels: Record<string, { vi: string; en: string }> = {
  intern: { vi: 'Thực tập sinh', en: 'Intern' },
  fresher: { vi: 'Fresher', en: 'Fresher' },
  junior: { vi: 'Junior', en: 'Junior' },
  mid: { vi: 'Trung cấp', en: 'Mid-level' },
  senior: { vi: 'Senior', en: 'Senior' },
};

const SessionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const canExport = canExportSessions(user);
  const copy = {
    loadError: language === 'vi' ? 'Không thể tải session.' : 'Unable to load this session.',
    back: language === 'vi' ? 'Quay lại' : 'Back',
    completed: language === 'vi' ? 'Hoàn thành' : 'Completed',
    inProgress: language === 'vi' ? 'Đang làm' : 'In progress',
    continue: language === 'vi' ? 'Tiếp tục' : 'Continue',
    averageScore: language === 'vi' ? 'Điểm trung bình' : 'Average score',
    answered: language === 'vi' ? 'Câu đã trả lời' : 'Answered questions',
    mode: language === 'vi' ? 'Chế độ' : 'Mode',
    qaTitle: language === 'vi' ? 'Câu hỏi & Câu trả lời' : 'Questions & Answers',
    noQuestions: language === 'vi' ? 'Chưa có câu hỏi nào.' : 'No questions available yet.',
    yourAnswer: language === 'vi' ? 'Câu trả lời của bạn:' : 'Your answer:',
    emptyAnswer: language === 'vi' ? '(Không có)' : '(Empty)',
    newSession: language === 'vi' ? 'Tạo session mới' : 'Create new session',
    exportPdf: language === 'vi' ? 'Xuất PDF' : 'Export PDF',
    exporting: language === 'vi' ? 'Đang xuất...' : 'Exporting...',
    exportFailed: language === 'vi' ? 'Không thể xuất PDF lúc này.' : 'Unable to export the PDF right now.',
    locale: language === 'vi' ? 'vi-VN' : 'en-US',
  };

  const { data: session, isLoading, error } = useQuery<SessionDetailType>({
    queryKey: ['session', id],
    queryFn: () => sessionsApi.get(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="text-center py-24 text-destructive">
        {copy.loadError} <Link to="/app/sessions" className="underline">{copy.back}</Link>
      </div>
    );
  }

  const answerMap = Object.fromEntries(session.answers.map(a => [a.question_id, a]));
  const avgScore = session.avg_score;

  const handleExport = async () => {
    if (!id) return;
    setIsExporting(true);
    try {
      const { blob, filename } = await sessionsApi.downloadPdf(id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `invera-session-${id.slice(0, 8)}.pdf`;
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
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/app/sessions">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {roleLabelMap[session.role]?.[language] || session.role}
            </h1>
            <p className="text-muted-foreground">
              {levelLabels[session.level]?.[language] || session.level} • {new Date(session.created_at).toLocaleDateString(copy.locale)} •{' '}
              <span className={cn(
                'font-medium text-xs px-1.5 py-0.5 rounded',
                session.status === 'COMPLETED' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
              )}>
                {session.status === 'COMPLETED' ? copy.completed : copy.inProgress}
              </span>
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          {session.status === 'IN_PROGRESS' && (
            <Button variant="accent" onClick={() => navigate(`/app/interview/${id}`)}>
              <Play className="w-4 h-4" />
              {copy.continue}
            </Button>
          )}
          {canExport && (
            <Button variant="outline" disabled={isExporting} onClick={handleExport}>
              <Download className="w-4 h-4" />
              {isExporting ? copy.exporting : copy.exportPdf}
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3",
              getScoreBgClass(avgScore)
            )}>
              <span className={cn(
                "text-xl font-bold",
                getScoreTextClass(avgScore)
              )}>
                {avgScore != null ? formatScoreValue(avgScore) : '—'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{copy.averageScore} /10</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
              <Target className="w-6 h-6 text-accent" />
            </div>
            <p className="text-2xl font-bold text-foreground">{session.answers.length}</p>
            <p className="text-sm text-muted-foreground">{copy.answered}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6 text-info" />
            </div>
            <p className="text-2xl font-bold text-foreground capitalize">{session.mode}</p>
            <p className="text-sm text-muted-foreground">{copy.mode}</p>
          </CardContent>
        </Card>
      </div>

      {/* Questions & Answers Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>{copy.qaTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {session.questions.length === 0 && session.answers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">{copy.noQuestions}</p>
          ) : (
            <div className="space-y-6">
              {session.answers.map((answer, index) => {
                const question = session.questions.find(q => q.id === answer.question_id);
                return (
                  <div key={answer.id} className="rounded-xl border p-5 space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-sm font-semibold text-accent">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        {question && (
                          <>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-xs font-medium",
                                question.difficulty === 'easy' ? "bg-success/20 text-success" :
                                question.difficulty === 'medium' ? "bg-warning/20 text-warning" :
                                "bg-destructive/20 text-destructive"
                              )}>
                                {question.difficulty}
                              </span>
                              <span className="text-xs text-muted-foreground">{getLocalizedQuestionCategory(question, language)}</span>
                            </div>
                            <p className="text-foreground font-medium mb-3">"{getLocalizedQuestionText(question, language)}"</p>
                          </>
                        )}
                        <div className="bg-muted/50 rounded-lg p-3 mb-3">
                          <p className="text-xs text-muted-foreground mb-1">{copy.yourAnswer}</p>
                          <p className="text-sm text-foreground">{answer.answer_text || copy.emptyAnswer}</p>
                        </div>
                        <div className="flex items-start gap-2">
                          {answer.score >= 7 ? (
                            <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                          ) : answer.score >= 4 ? (
                            <AlertCircle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <StructuredFeedback feedback={answer.feedback} />
                          </div>
                        </div>
                      </div>
                      <div className={cn(
                        "text-xl font-bold flex-shrink-0",
                        getScoreTextClass(answer.score)
                      )}>
                        {formatScore(answer.score)}
                      </div>
                    </div>
                    <div className="ml-12">
                      <Progress value={toScoreProgress(answer.score)} className="h-1.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button variant="accent" asChild>
          <Link to="/app/new">{copy.newSession}</Link>
        </Button>
      </div>
    </div>
  );
};

export default SessionDetail;
