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
  Play,
  Sparkles,
  ChevronRight,
  Video
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
  intern: { vi: 'Intern', en: 'Intern' },
  fresher: { vi: 'Fresher', en: 'Fresher' },
  junior: { vi: 'Junior', en: 'Junior' },
  mid: { vi: 'Mid-level', en: 'Mid-level' },
  senior: { vi: 'Senior', en: 'Senior' },
};

const renderMarkdown = (text: string | null | undefined) => {
  if (!text) return null;
  const lines = text.split('\n');
  let inList = false;
  const elements: React.ReactNode[] = [];
  lines.forEach((line, idx) => {
    let cleanLine = line.trim();
    if (!cleanLine) {
      if (inList) inList = false;
      return;
    }
    const parseBold = (str: string) => {
      const parts = str.split('**');
      return parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="font-bold text-foreground">{part}</strong> : part);
    };
    if (cleanLine.startsWith('### ')) {
      if (inList) inList = false;
      elements.push(<h4 key={idx} className="text-sm font-bold mt-4 mb-2 text-foreground flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-cyan-500 shrink-0" />{parseBold(cleanLine.substring(4))}</h4>);
    } else if (cleanLine.startsWith('## ')) {
      if (inList) inList = false;
      elements.push(<h3 key={idx} className="text-base font-bold mt-5 mb-2.5 text-foreground border-b pb-1 flex items-center gap-1.5">{parseBold(cleanLine.substring(3))}</h3>);
    } else if (cleanLine.startsWith('# ')) {
      if (inList) inList = false;
      elements.push(<h2 key={idx} className="text-lg font-bold mt-6 mb-3 text-foreground flex items-center gap-1.5">{parseBold(cleanLine.substring(2))}</h2>);
    } else if (cleanLine.startsWith('- ') || cleanLine.startsWith('* ')) {
      if (!inList) inList = true;
      elements.push(
        <li key={idx} className="ml-5 list-disc text-xs text-foreground/90 mb-1 leading-relaxed">
          {parseBold(cleanLine.substring(2))}
        </li>
      );
    } else {
      if (inList) inList = false;
      elements.push(<p key={idx} className="text-xs text-foreground/80 leading-relaxed mb-2.5">{parseBold(cleanLine)}</p>);
    }
  });
  return <div className="space-y-1">{elements}</div>;
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
    refetchInterval: (query) => {
      const sess = query.state.data;
      if (sess) {
        if (sess.status === 'COMPLETED' && !sess.evaluation_report) {
          return 3000;
        }
        if (sess.answers.some(a => a.feedback === 'PENDING')) {
          return 3000;
        }
      }
      return false;
    },
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

  // Averages for Camera Telemetry
  const cameraAnswers = session.answers.filter(a => a.telemetry_data);
  const hasTelemetry = cameraAnswers.length > 0;
  
  let avgGaze = 0;
  let avgSmile = 0;
  let avgPosture = 0;
  let avgFraming = 0;
  let avgFidget = 0;
  let totalHandGestures = 0;
  let avgConfidence = 0;

  if (hasTelemetry) {
    let gazeSum = 0;
    let smileSum = 0;
    let postureSum = 0;
    let framingSum = 0;
    let fidgetSum = 0;
    let confidenceSum = 0;
    
    cameraAnswers.forEach(a => {
      const tel = a.telemetry_data;
      if (tel) {
        gazeSum += tel.gazeRatio ?? 0;
        smileSum += tel.smileRatio ?? 0;
        postureSum += tel.bodyPostureScore ?? (tel.slouchRatio != null ? (1 - tel.slouchRatio) : 1);
        framingSum += tel.cameraFramingScore ?? 1;
        fidgetSum += tel.fidgetRatio ?? 0;
        totalHandGestures += tel.handGestures ?? 0;
        confidenceSum += tel.presentationConfidence ?? 100;
      }
    });

    const count = cameraAnswers.length;
    avgGaze = Math.round((gazeSum / count) * 100);
    avgSmile = Math.round((smileSum / count) * 100);
    avgPosture = Math.round((postureSum / count) * 100);
    avgFraming = Math.round((framingSum / count) * 100);
    avgFidget = Math.round((fidgetSum / count) * 100);
    avgConfidence = Math.round(confidenceSum / count);
  }

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
              {roleLabelMap[session.role]?.en || session.role}
            </h1>
            <p className="text-muted-foreground">
              {levelLabels[session.level]?.en || session.level} • {new Date(session.created_at).toLocaleDateString(copy.locale)} •{' '}
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

      {/* Non-Verbal Behavior & Gesture Analysis Card */}
      {session.mode === 'camera' && hasTelemetry && (
        <Card className="rounded-[28px] border border-border bg-card shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/10 border-b pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <Video className="w-5 h-5 text-accent" />
              <span>
                {language === 'vi' ? 'Phân tích Hành vi & Cử chỉ phi ngôn ngữ' : 'Non-Verbal Behavior & Gesture Analysis'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Confidence Circle/Stat */}
              <div className="md:col-span-4 flex flex-col items-center justify-center border-r md:pr-6 border-border/60">
                <div className="relative flex items-center justify-center">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="54"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-muted/30"
                      fill="transparent"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="54"
                      stroke="currentColor"
                      strokeWidth="8"
                      strokeDasharray={2 * Math.PI * 54}
                      strokeDashoffset={2 * Math.PI * 54 * (1 - avgConfidence / 100)}
                      className="text-accent transition-all duration-1000 ease-out"
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-3xl font-extrabold text-foreground">{avgConfidence}%</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      {language === 'vi' ? 'Độ tự tin' : 'Confidence'}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-4 max-w-[200px]">
                  {language === 'vi'
                    ? 'Chỉ số tự tin tổng hợp từ giao tiếp mắt, tư thế và phong thái trình bày.'
                    : 'Composite confidence score based on eye contact, posture, and delivery.'}
                </p>
              </div>

              {/* Individual Metrics */}
              <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Eye Contact */}
                <div className="space-y-1.5 p-3 rounded-xl border bg-muted/20">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-foreground/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                      {language === 'vi' ? 'Giao tiếp mắt' : 'Eye Contact'}
                    </span>
                    <span className="text-cyan-500">{avgGaze}%</span>
                  </div>
                  <Progress value={avgGaze} className="h-1.5 bg-muted/40" />
                  <p className="text-[10px] text-muted-foreground">
                    {language === 'vi' ? 'Tỉ lệ thời gian nhìn thẳng màn hình' : 'Time spent looking at screen'}
                  </p>
                </div>

                {/* Friendly Expression (Smile) */}
                <div className="space-y-1.5 p-3 rounded-xl border bg-muted/20">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-foreground/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {language === 'vi' ? 'Biểu cảm thân thiện' : 'Friendly Smile'}
                    </span>
                    <span className="text-emerald-500">{avgSmile}%</span>
                  </div>
                  <Progress value={avgSmile} className="h-1.5 bg-muted/40" />
                  <p className="text-[10px] text-muted-foreground">
                    {language === 'vi' ? 'Tỉ lệ thời gian mỉm cười tích cực' : 'Time spent smiling during session'}
                  </p>
                </div>

                {/* Body Posture */}
                <div className="space-y-1.5 p-3 rounded-xl border bg-muted/20">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-foreground/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                      {language === 'vi' ? 'Tư thế ngồi' : 'Body Posture'}
                    </span>
                    <span className="text-indigo-500">{avgPosture}%</span>
                  </div>
                  <Progress value={avgPosture} className="h-1.5 bg-muted/40" />
                  <p className="text-[10px] text-muted-foreground">
                    {language === 'vi' ? 'Tỉ lệ thời gian ngồi thẳng, chuyên nghiệp' : 'Time spent sitting up straight'}
                  </p>
                </div>

                {/* Camera Framing */}
                <div className="space-y-1.5 p-3 rounded-xl border bg-muted/20">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-foreground/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                      {language === 'vi' ? 'Góc máy (Framing)' : 'Camera Framing'}
                    </span>
                    <span className="text-purple-500">{avgFraming}%</span>
                  </div>
                  <Progress value={avgFraming} className="h-1.5 bg-muted/40" />
                  <p className="text-[10px] text-muted-foreground">
                    {language === 'vi' ? 'Mặt nằm ở vị trí trung tâm camera' : 'Face positioned correctly in camera frame'}
                  </p>
                </div>

                {/* Fidgeting */}
                <div className="space-y-1.5 p-3 rounded-xl border bg-muted/20">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-foreground/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      {language === 'vi' ? 'Độ ổn định cơ thể' : 'Body Stability'}
                    </span>
                    <span className="text-rose-500">{100 - avgFidget}%</span>
                  </div>
                  <Progress value={100 - avgFidget} className="h-1.5 bg-muted/40" />
                  <p className="text-[10px] text-muted-foreground">
                    {language === 'vi' ? 'Hạn chế rung lắc, chuyển động thừa' : 'Absence of excessive fidgeting/movement'}
                  </p>
                </div>

                {/* Hand Gestures */}
                <div className="space-y-1.5 p-3 rounded-xl border bg-muted/20 flex flex-col justify-between">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-foreground/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      {language === 'vi' ? 'Cử chỉ tay' : 'Hand Gestures'}
                    </span>
                    <span className="text-amber-500 font-bold">{totalHandGestures}</span>
                  </div>
                  <div className="text-xs text-foreground/90 font-medium py-1">
                    {totalHandGestures > 15
                      ? (language === 'vi' ? 'Sử dụng ngôn ngữ cơ thể phong phú' : 'Rich body language usage')
                      : totalHandGestures > 5
                      ? (language === 'vi' ? 'Mức độ cử chỉ tay vừa phải' : 'Moderate hand gesture usage')
                      : (language === 'vi' ? 'Ít sử dụng cử chỉ tay' : 'Limited hand gesture usage')}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {language === 'vi' ? 'Tổng số lần sử dụng cử chỉ tay minh họa' : 'Total gesture movements detected'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Evaluation Report (If Completed and Available) */}
      {session.status === 'COMPLETED' && session.evaluation_report && (
        <Card className="rounded-[28px] border border-border bg-card shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="flex items-center justify-between text-base font-bold">
              <span className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent animate-pulse" />
                {language === 'vi' ? 'Báo cáo Đánh giá Tổng quan từ AI' : 'Overall AI Evaluation Report'}
              </span>
              {session.practice_plan && (
                <Button variant="ghost" size="sm" asChild className="rounded-full text-accent hover:text-accent/80 hover:bg-accent/10 h-8 px-4 text-xs">
                  <Link to={`/app/plan?session_id=${session.id}`}>
                    {language === 'vi' ? 'Xem kế hoạch học tập' : 'View Practice Plan'}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {renderMarkdown(session.evaluation_report)}
          </CardContent>
        </Card>
      )}

      {/* AI Evaluation Report (If Completed and Not Available yet) */}
      {session.status === 'COMPLETED' && !session.evaluation_report && (
        <Card className="rounded-[28px] border border-border bg-card shadow-sm overflow-hidden">
          <CardContent className="p-8 text-center flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center animate-pulse">
                <Sparkles className="w-8 h-8 text-accent animate-pulse" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                <Loader2 className="w-3 h-3 animate-spin text-accent-foreground" />
              </div>
            </div>
            <div className="space-y-2 max-w-md">
              <h3 className="font-bold text-foreground text-lg">
                {language === 'vi' ? 'AI đang phân tích video & chuẩn bị báo cáo...' : 'AI is analyzing video & preparing report...'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {language === 'vi' 
                  ? 'Quá trình đánh giá toàn diện hành vi, câu trả lời và cử chỉ đang được thực hiện. Trang sẽ tự động cập nhật sau vài giây.' 
                  : 'A comprehensive evaluation of your behavior, answers, and gestures is underway. The page will auto-refresh shortly.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

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
                        {answer.feedback === 'PENDING' ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-accent/5 border border-accent/10 rounded-lg p-3">
                            <Loader2 className="w-4 h-4 animate-spin text-accent" />
                            <span>
                              {language === 'vi' 
                                ? 'AI đang phân tích câu trả lời và chấm điểm...' 
                                : 'AI is analyzing your answer and scoring...'}
                            </span>
                          </div>
                        ) : (
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
                        )}
                      </div>
                      <div className={cn(
                        "text-xl font-bold flex-shrink-0",
                        answer.feedback === 'PENDING' ? "text-muted-foreground" : getScoreTextClass(answer.score)
                      )}>
                        {answer.feedback === 'PENDING' ? '—' : formatScore(answer.score)}
                      </div>
                    </div>
                    {answer.feedback !== 'PENDING' && (
                      <div className="ml-12">
                        <Progress value={toScoreProgress(answer.score)} className="h-1.5" />
                      </div>
                    )}
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
