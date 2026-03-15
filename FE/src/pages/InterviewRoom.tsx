import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
  Volume2, 
  ArrowRight, 
  X, 
  Mic, 
  MicOff, 
  Video,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { sessionsApi, SessionDetail, QuestionOut, AnswerOut } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const InterviewRoom = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answer, setAnswer] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState<AnswerOut | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completedSession, setCompletedSession] = useState(null);

  // Load session from sessionStorage (set by NewSession after create)
  useEffect(() => {
    if (!id) return;
    const cached = sessionStorage.getItem(`session_${id}`);
    if (cached) {
      try {
        setSession(JSON.parse(cached));
        return;
      } catch {}
    }
    // Fallback: fetch from API
    sessionsApi.get(id).then(setSession).catch(() => {
      toast({ title: 'Lỗi', description: 'Không thể tải session.', variant: 'destructive' });
      navigate('/app/sessions');
    });
  }, [id]);

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  const questions: QuestionOut[] = session.questions || [];
  const totalQuestions = questions.length;
  const question = questions[currentQuestion];
  const progress = totalQuestions > 0 ? ((currentQuestion + 1) / totalQuestions) * 100 : 0;

  const handleSubmitAnswer = async () => {
    if (!answer.trim() || !question || !id) return;
    setIsSubmitting(true);
    try {
      const result = await sessionsApi.submitAnswer(id, {
        question_id: question.id,
        answer_text: answer,
      });
      setCurrentAnswer(result);
      setShowFeedback(true);
    } catch (err) {
      toast({
        title: 'Lỗi nộp bài',
        description: err instanceof Error ? err.message : 'Vui lòng thử lại.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextQuestion = async () => {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setAnswer('');
      setShowFeedback(false);
      setCurrentAnswer(null);
    } else {
      // Last question — complete the session
      setIsCompleting(true);
      try {
        const completed = await sessionsApi.complete(id!);
        setCompletedSession(completed);
        // Clean up sessionStorage
        sessionStorage.removeItem(`session_${id}`);
        navigate(`/app/sessions/${id}`);
      } catch (err) {
        toast({
          title: 'Lỗi',
          description: 'Không thể hoàn thành session.',
          variant: 'destructive',
        });
        navigate('/app/sessions');
      } finally {
        setIsCompleting(false);
      }
    }
  };

  const handleEndSession = async () => {
    if (!confirm('Bạn có chắc muốn kết thúc session này?')) return;
    try {
      await sessionsApi.complete(id!);
      sessionStorage.removeItem(`session_${id}`);
    } catch {}
    navigate('/app/sessions');
  };

  const getScoreColor = (score: number) =>
    score >= 70 ? 'text-success' : score >= 40 ? 'text-warning' : 'text-destructive';

  const getScoreBg = (score: number) =>
    score >= 70 ? 'bg-success/10' : score >= 40 ? 'bg-warning/10' : 'bg-destructive/10';

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-card border-b px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-accent">
              Câu {currentQuestion + 1} / {totalQuestions}
            </span>
            <div className="w-32 hidden sm:block">
              <Progress value={progress} className="h-2" />
            </div>
            <span className="text-xs text-muted-foreground hidden sm:inline capitalize">
              {session.role} • {session.level}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <Button variant="destructive" size="sm" onClick={handleEndSession}>
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Kết thúc</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-20 pb-8 px-4">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-6">
          {/* AI Interviewer Side */}
          <div className="space-y-6">
            <div className="bg-card rounded-2xl border p-6 md:p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl gradient-accent flex items-center justify-center">
                    <span className="text-3xl">🤖</span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-success flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-success-foreground animate-pulse" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-lg">AI Interviewer</h3>
                  <p className="text-sm text-muted-foreground capitalize">{session.role} • {session.level}</p>
                </div>
              </div>

              {question && (
                <div className="bg-muted/50 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
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
                  <p className="text-foreground text-lg leading-relaxed">
                    "{question.text}"
                  </p>
                </div>
              )}
            </div>

            {/* STAR Hint */}
            <div className="bg-info/10 border border-info/20 rounded-xl p-4 flex gap-3">
              <Lightbulb className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Mẹo: Dùng phương pháp STAR</p>
                <p className="text-xs text-muted-foreground">
                  Cấu trúc câu trả lời: Situation, Task, Action, Result
                </p>
              </div>
            </div>
          </div>

          {/* Answer Side */}
          <div className="space-y-6">
            {!showFeedback && !isSubmitting && (
              <div className="bg-card rounded-2xl border p-6 md:p-8">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-foreground">Câu trả lời của bạn</h4>
                  <span className="text-sm text-muted-foreground">{answer.length} ký tự</span>
                </div>

                <Textarea
                  placeholder="Nhập câu trả lời của bạn... Hãy cụ thể và dùng ví dụ từ kinh nghiệm thực tế."
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="min-h-[200px] resize-none text-base"
                />

                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="flex gap-2">
                    <Button
                      variant={isRecording ? "destructive" : "outline"}
                      size="sm"
                      onClick={() => setIsRecording(!isRecording)}
                    >
                      {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      {isRecording ? 'Dừng' : 'Voice'}
                    </Button>
                  </div>
                  <Button 
                    variant="accent" 
                    onClick={handleSubmitAnswer}
                    disabled={!answer.trim()}
                  >
                    Nộp câu trả lời
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Analyzing State */}
            {isSubmitting && (
              <div className="bg-card rounded-2xl border p-8 text-center">
                <div className="w-16 h-16 rounded-2xl gradient-accent flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Sparkles className="w-8 h-8 text-accent-foreground" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">Đang chấm bài...</h4>
                <p className="text-sm text-muted-foreground">Chỉ mất vài giây</p>
                <div className="mt-6 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
                  <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
                </div>
              </div>
            )}

            {/* Feedback Panel */}
            {showFeedback && currentAnswer && (
              <div className="bg-card rounded-2xl border p-6 md:p-8 space-y-6">
                {/* Score */}
                <div className="text-center pb-6 border-b">
                  <div className={cn(
                    "inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-3",
                    getScoreBg(currentAnswer.score)
                  )}>
                    <span className={cn("text-3xl font-bold", getScoreColor(currentAnswer.score))}>
                      {currentAnswer.score}
                    </span>
                  </div>
                  <p className="text-muted-foreground">Điểm số</p>
                  <div className="w-full bg-muted rounded-full h-2 mt-3">
                    <div
                      className={cn("h-2 rounded-full transition-all", 
                        currentAnswer.score >= 70 ? "bg-success" : 
                        currentAnswer.score >= 40 ? "bg-warning" : "bg-destructive"
                      )}
                      style={{ width: `${currentAnswer.score}%` }}
                    />
                  </div>
                </div>

                {/* Feedback */}
                <div>
                  <h5 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    {currentAnswer.score >= 70 ? (
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-warning" />
                    )}
                    Nhận xét
                  </h5>
                  <p className="text-sm text-muted-foreground leading-relaxed">{currentAnswer.feedback}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button 
                    variant="accent" 
                    className="flex-1" 
                    onClick={handleNextQuestion}
                    disabled={isCompleting}
                  >
                    {isCompleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        {currentQuestion < totalQuestions - 1 ? 'Câu tiếp theo' : 'Hoàn thành'}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewRoom;
