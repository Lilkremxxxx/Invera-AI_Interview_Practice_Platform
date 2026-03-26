import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
  Volume2, 
  ArrowRight, 
  ArrowLeft,
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
import { getLocalizedQuestionCategory, getLocalizedQuestionText, sessionsApi, SessionDetail, QuestionOut, AnswerOut } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { StructuredFeedback } from '@/components/feedback/StructuredFeedback';
import { useLanguage } from '@/contexts/LanguageContext';
import { roleLabelMap } from '@/lib/mock-data';
import { formatScoreValue, getScoreBarClass, getScoreBgClass, getScoreTextClass, toScoreProgress } from '@/lib/score';

const InterviewRoom = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { language } = useLanguage();
  const copy = {
    sessionNotFound: language === 'vi' ? 'Session không tìm thấy' : 'Session not found',
    sessionNotFoundBody: language === 'vi'
      ? 'Session này không còn tồn tại hoặc bạn không có quyền truy cập.'
      : 'This session no longer exists or you do not have permission to access it.',
    sessionList: language === 'vi' ? 'Danh sách sessions' : 'Sessions list',
    newSession: language === 'vi' ? 'Tạo session mới' : 'Create a new session',
    submitError: language === 'vi' ? 'Lỗi nộp bài' : 'Unable to submit answer',
    retry: language === 'vi' ? 'Vui lòng thử lại.' : 'Please try again.',
    completeError: language === 'vi' ? 'Không thể hoàn thành session.' : 'Unable to complete the session.',
    questionLabel: language === 'vi' ? 'Câu' : 'Question',
    end: language === 'vi' ? 'Kết thúc' : 'End',
    confirmEndTitle: language === 'vi' ? 'Kết thúc session?' : 'End this session?',
    confirmEnd: language === 'vi'
      ? 'Bạn có chắc muốn kết thúc session này? Những câu chưa làm sẽ không thể tiếp tục.'
      : 'Are you sure you want to end this session? Any unanswered questions will stay incomplete.',
    cancel: language === 'vi' ? 'Hủy' : 'Cancel',
    confirm: language === 'vi' ? 'Xác nhận kết thúc' : 'End session',
    hintTitle: language === 'vi' ? 'Mẹo: Dùng phương pháp STAR' : 'Tip: use the STAR method',
    hintBody: language === 'vi' ? 'Cấu trúc câu trả lời: Situation, Task, Action, Result' : 'Structure your answer with Situation, Task, Action, Result.',
    yourAnswer: language === 'vi' ? 'Câu trả lời của bạn' : 'Your answer',
    characters: language === 'vi' ? 'ký tự' : 'characters',
    answerPlaceholder: language === 'vi'
      ? 'Nhập câu trả lời của bạn... Hãy cụ thể và dùng ví dụ từ kinh nghiệm thực tế.'
      : 'Type your answer... Be specific and use examples from your real experience.',
    stop: language === 'vi' ? 'Dừng' : 'Stop',
    submit: language === 'vi' ? 'Nộp câu trả lời' : 'Submit answer',
    grading: language === 'vi' ? 'Đang chấm bài...' : 'Scoring your answer...',
    takeSeconds: language === 'vi' ? 'Thường mất khoảng 15-30 giây' : 'Usually takes about 15-30 seconds',
    timeLeft: language === 'vi' ? 'Còn lại' : 'Time left',
    timeExpiredTitle: language === 'vi' ? 'Đã hết thời gian' : 'Time is up',
    timeExpiredBody: language === 'vi'
      ? 'Session đã tự kết thúc vì vượt quá giới hạn thời gian.'
      : 'The session ended automatically because the time limit was reached.',
    score: language === 'vi' ? 'Điểm số' : 'Score',
    feedback: language === 'vi' ? 'Nhận xét' : 'Feedback',
    nextQuestion: language === 'vi' ? 'Câu tiếp theo' : 'Next question',
    finish: language === 'vi' ? 'Hoàn thành' : 'Finish',
    outOfTen: language === 'vi' ? '/10' : '/10',
  };
  const levelLabels: Record<string, { vi: string; en: string }> = {
    intern: { vi: 'Thực tập sinh', en: 'Intern' },
    fresher: { vi: 'Fresher', en: 'Fresher' },
    junior: { vi: 'Junior', en: 'Junior' },
    mid: { vi: 'Trung cấp', en: 'Mid-level' },
    senior: { vi: 'Senior', en: 'Senior' },
  };

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answer, setAnswer] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState<AnswerOut | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completedSession, setCompletedSession] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const autoCompletedRef = useRef(false);

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
      setLoadError(true);
    });
  }, [id]);

  useEffect(() => {
    autoCompletedRef.current = false;
    if (!session?.time_limit_minutes) {
      setRemainingSeconds(null);
      return;
    }

    const deadlineMs = new Date(session.created_at).getTime() + session.time_limit_minutes * 60 * 1000;
    const updateRemaining = () => {
      const seconds = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
      setRemainingSeconds(seconds);
    };

    updateRemaining();
    const intervalId = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(intervalId);
  }, [session?.created_at, session?.id, session?.time_limit_minutes]);

  useEffect(() => {
    if (!id || !session || session.status !== 'IN_PROGRESS' || session.time_limit_minutes == null) return;
    if (remainingSeconds === null || remainingSeconds > 0 || isSubmitting || isCompleting || autoCompletedRef.current) return;

    autoCompletedRef.current = true;

    const autoComplete = async () => {
      setIsCompleting(true);
      try {
        await sessionsApi.complete(id);
        sessionStorage.removeItem(`session_${id}`);
        toast({
          title: copy.timeExpiredTitle,
          description: copy.timeExpiredBody,
        });
        navigate(`/app/sessions/${id}`);
      } catch {
        toast({
          title: copy.submitError,
          description: copy.completeError,
          variant: 'destructive',
        });
        navigate('/app/sessions');
      } finally {
        setIsCompleting(false);
      }
    };

    void autoComplete();
  }, [
    copy.completeError,
    copy.submitError,
    copy.timeExpiredBody,
    copy.timeExpiredTitle,
    id,
    isCompleting,
    isSubmitting,
    navigate,
    remainingSeconds,
    session,
    toast,
  ]);

  if (loadError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">{copy.sessionNotFound}</h2>
          <p className="text-muted-foreground mb-6">
            {copy.sessionNotFoundBody}
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate('/app/sessions')}>
              <ArrowLeft className="w-4 h-4" />
              {copy.sessionList}
            </Button>
            <Button variant="accent" onClick={() => navigate('/app/new')}>
              {copy.newSession}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Session chưa load xong → spinner
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
  const isTimeUp = session.time_limit_minutes != null && remainingSeconds === 0;

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };


  const handleSubmitAnswer = async () => {
    if (!answer.trim() || !question || !id || isTimeUp) return;
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
        title: copy.submitError,
        description: err instanceof Error ? err.message : copy.retry,
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
          title: copy.submitError,
          description: copy.completeError,
          variant: 'destructive',
        });
        navigate('/app/sessions');
      } finally {
        setIsCompleting(false);
      }
    }
  };

  const handleEndSession = async () => {
    setEndDialogOpen(false);
    try {
      await sessionsApi.complete(id!);
      sessionStorage.removeItem(`session_${id}`);
    } catch {}
    navigate('/app/sessions');
  };

  return (
    <div className="min-h-screen bg-background">
      <AlertDialog open={endDialogOpen} onOpenChange={setEndDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.confirmEndTitle}</AlertDialogTitle>
            <AlertDialogDescription>{copy.confirmEnd}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCompleting}>{copy.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isCompleting}
              onClick={(event) => {
                event.preventDefault();
                void handleEndSession();
              }}
            >
              {isCompleting ? <Loader2 className="w-4 h-4 animate-spin" /> : copy.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-card border-b px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-accent">
              {copy.questionLabel} {currentQuestion + 1} / {totalQuestions}
            </span>
            <div className="w-32 hidden sm:block">
              <Progress value={progress} className="h-2" />
            </div>
            <span className="text-xs text-muted-foreground hidden sm:inline capitalize">
              {(roleLabelMap[session.role]?.[language] || session.role)} • {(levelLabels[session.level]?.[language] || session.level)}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            {remainingSeconds !== null && (
              <div className={cn(
                "hidden sm:flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium",
                remainingSeconds <= 60
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : "border-info/20 bg-info/10 text-info"
              )}>
                <Clock className="w-4 h-4" />
                <span>{copy.timeLeft} {formatCountdown(remainingSeconds)}</span>
              </div>
            )}
            <Button variant="destructive" size="sm" onClick={() => setEndDialogOpen(true)}>
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">{copy.end}</span>
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
                  <p className="text-sm text-muted-foreground capitalize">
                    {roleLabelMap[session.role]?.[language] || session.role} • {levelLabels[session.level]?.[language] || session.level}
                  </p>
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
                    <span className="text-xs text-muted-foreground">{getLocalizedQuestionCategory(question, language)}</span>
                  </div>
                  <p className="text-foreground text-lg leading-relaxed">
                    "{getLocalizedQuestionText(question, language)}"
                  </p>
                </div>
              )}
            </div>

            {/* STAR Hint */}
            <div className="bg-info/10 border border-info/20 rounded-xl p-4 flex gap-3">
              <Lightbulb className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground mb-1">{copy.hintTitle}</p>
                <p className="text-xs text-muted-foreground">{copy.hintBody}</p>
              </div>
            </div>
          </div>

          {/* Answer Side */}
          <div className="space-y-6">
            {!showFeedback && !isSubmitting && (
              <div className="bg-card rounded-2xl border p-6 md:p-8">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-foreground">{copy.yourAnswer}</h4>
                  <span className="text-sm text-muted-foreground">{answer.length} {copy.characters}</span>
                </div>

                <Textarea
                  placeholder={copy.answerPlaceholder}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  disabled={isTimeUp}
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
                      {isRecording ? copy.stop : 'Voice'}
                    </Button>
                  </div>
                  <Button 
                    variant="accent" 
                    onClick={handleSubmitAnswer}
                    disabled={!answer.trim() || isTimeUp}
                  >
                    {copy.submit}
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
                <h4 className="font-semibold text-foreground mb-2">{copy.grading}</h4>
                <p className="text-sm text-muted-foreground">{copy.takeSeconds}</p>
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
                    getScoreBgClass(currentAnswer.score)
                  )}>
                    <span className={cn("text-3xl font-bold", getScoreTextClass(currentAnswer.score))}>
                      {formatScoreValue(currentAnswer.score)}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{copy.score} {copy.outOfTen}</p>
                  <div className="w-full bg-muted rounded-full h-2 mt-3">
                    <div
                      className={cn("h-2 rounded-full transition-all", getScoreBarClass(currentAnswer.score))}
                      style={{ width: `${toScoreProgress(currentAnswer.score)}%` }}
                    />
                  </div>
                </div>

                {/* Feedback */}
                <div>
                  <h5 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    {currentAnswer.score >= 7 ? (
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    ) : currentAnswer.score >= 4 ? (
                      <AlertCircle className="w-5 h-5 text-warning" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-destructive" />
                    )}
                    {copy.feedback}
                  </h5>
                  <StructuredFeedback feedback={currentAnswer.feedback} />
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
                        {currentQuestion < totalQuestions - 1 ? copy.nextQuestion : copy.finish}
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
