import { useParams, Link } from 'react-router-dom';
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
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { sessionsApi, SessionDetail as SessionDetailType } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

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

const SessionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { language } = useLanguage();

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
        Không thể tải session. <Link to="/app/sessions" className="underline">Quay lại</Link>
      </div>
    );
  }

  const answerMap = Object.fromEntries(session.answers.map(a => [a.question_id, a]));
  const avgScore = session.avg_score;

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
              {roleLabels[session.role]?.[language] || session.role}
            </h1>
            <p className="text-muted-foreground">
              {levelLabels[session.level]?.[language] || session.level} • {new Date(session.created_at).toLocaleDateString('vi-VN')} •{' '}
              <span className={cn(
                'font-medium text-xs px-1.5 py-0.5 rounded',
                session.status === 'COMPLETED' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
              )}>
                {session.status === 'COMPLETED' ? 'Hoàn thành' : 'Đang làm'}
              </span>
            </p>
          </div>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4" />
          Export PDF
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3",
              avgScore != null && avgScore >= 70 ? 'bg-success/10' : avgScore != null && avgScore >= 40 ? 'bg-warning/10' : 'bg-muted'
            )}>
              <span className={cn(
                "text-xl font-bold",
                avgScore != null && avgScore >= 70 ? 'text-success' : avgScore != null && avgScore >= 40 ? 'text-warning' : 'text-muted-foreground'
              )}>
                {avgScore != null ? `${avgScore}%` : '—'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Điểm trung bình</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
              <Target className="w-6 h-6 text-accent" />
            </div>
            <p className="text-2xl font-bold text-foreground">{session.answers.length}</p>
            <p className="text-sm text-muted-foreground">Câu đã trả lời</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6 text-info" />
            </div>
            <p className="text-2xl font-bold text-foreground capitalize">{session.mode}</p>
            <p className="text-sm text-muted-foreground">Chế độ</p>
          </CardContent>
        </Card>
      </div>

      {/* Questions & Answers Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Câu hỏi & Câu trả lời</CardTitle>
        </CardHeader>
        <CardContent>
          {session.questions.length === 0 && session.answers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Chưa có câu hỏi nào.</p>
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
                              <span className="text-xs text-muted-foreground">{question.category}</span>
                            </div>
                            <p className="text-foreground font-medium mb-3">"{question.text}"</p>
                          </>
                        )}
                        <div className="bg-muted/50 rounded-lg p-3 mb-3">
                          <p className="text-xs text-muted-foreground mb-1">Câu trả lời của bạn:</p>
                          <p className="text-sm text-foreground">{answer.answer_text || '(Không có)'}</p>
                        </div>
                        <div className="flex items-start gap-2">
                          {answer.score >= 70 ? (
                            <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                          )}
                          <p className="text-sm text-muted-foreground">{answer.feedback}</p>
                        </div>
                      </div>
                      <div className={cn(
                        "text-xl font-bold flex-shrink-0",
                        answer.score >= 70 ? "text-success" : answer.score >= 40 ? "text-warning" : "text-destructive"
                      )}>
                        {answer.score}%
                      </div>
                    </div>
                    <div className="ml-12">
                      <Progress value={answer.score} className="h-1.5" />
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
          <Link to="/app/new">Tạo session mới</Link>
        </Button>
      </div>
    </div>
  );
};

export default SessionDetail;