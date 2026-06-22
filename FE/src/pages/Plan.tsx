import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ClipboardList, 
  Sparkles, 
  BookOpen, 
  TrendingUp, 
  CheckCircle2, 
  Calendar, 
  Target, 
  ChevronRight, 
  PlusCircle, 
  Loader2, 
  ArrowRight,
  Award,
  BookMarked
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { sessionsApi, SessionOut } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { roleLabelMap } from '@/lib/mock-data';
import { formatScoreValue, getScoreBgClass, getScoreTextClass } from '@/lib/score';
import EvaluationReport from '@/components/feedback/EvaluationReport';

const levelLabels: Record<string, { vi: string; en: string }> = {
  intern: { vi: 'Intern', en: 'Intern' },
  fresher: { vi: 'Fresher', en: 'Fresher' },
  junior: { vi: 'Junior', en: 'Junior' },
  mid: { vi: 'Mid-level', en: 'Mid-level' },
  senior: { vi: 'Senior', en: 'Senior' },
};

// Simple helper to render Markdown content into beautiful React elements
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
    
    // Bold parsing (**text**)
    const parseBold = (str: string) => {
      const parts = str.split('**');
      return parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="font-bold text-foreground">{part}</strong> : part);
    };

    if (cleanLine.startsWith('### ')) {
      if (inList) inList = false;
      elements.push(
        <h4 key={idx} className="text-base font-bold mt-5 mb-2 text-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-500 shrink-0" />
          {parseBold(cleanLine.substring(4))}
        </h4>
      );
    } else if (cleanLine.startsWith('## ')) {
      if (inList) inList = false;
      elements.push(
        <h3 key={idx} className="text-lg font-bold mt-6 mb-3 text-foreground border-b pb-1 flex items-center gap-2">
          {parseBold(cleanLine.substring(3))}
        </h3>
      );
    } else if (cleanLine.startsWith('# ')) {
      if (inList) inList = false;
      elements.push(
        <h2 key={idx} className="text-xl font-bold mt-7 mb-4 text-foreground flex items-center gap-2">
          {parseBold(cleanLine.substring(2))}
        </h2>
      );
    } else if (cleanLine.startsWith('- ') || cleanLine.startsWith('* ')) {
      if (!inList) inList = true;
      elements.push(
        <li key={idx} className="ml-5 list-disc text-sm text-foreground/90 mb-1.5 leading-relaxed">
          {parseBold(cleanLine.substring(2))}
        </li>
      );
    } else {
      if (inList) inList = false;
      elements.push(
        <p key={idx} className="text-sm text-foreground/80 leading-relaxed mb-3">
          {parseBold(cleanLine)}
        </p>
      );
    }
  });
  
  return <div className="space-y-1 py-1">{elements}</div>;
};

// Checklist tasks based on session metrics
interface TaskItem {
  id: string;
  textVi: string;
  textEn: string;
}

const DEFAULT_TASKS: TaskItem[] = [
  {
    id: 'review_poor',
    textVi: 'Xem lại các câu hỏi có điểm số chưa tốt (dưới 7.0 điểm) và phân tích lỗi sai.',
    textEn: 'Review questions with poor scores (below 7.0) and analyze mistakes.',
  },
  {
    id: 'rewrite_star',
    textVi: 'Viết lại câu trả lời cho các chủ đề yếu, áp dụng cấu trúc STAR (Situation, Task, Action, Result).',
    textEn: 'Rewrite answers for weak topics applying the STAR method.',
  },
  {
    id: 'camera_mode',
    textVi: 'Luyện tập lại phiên phỏng vấn này ở chế độ camera để rèn phản xạ và phần trình bày.',
    textEn: 'Practice this interview session again in camera mode to improve reflexes and presentation.',
  },
  {
    id: 'read_theory',
    textVi: 'Đọc và củng cố thêm tài liệu lý thuyết về các lỗ hổng kiến thức được AI chỉ ra.',
    textEn: 'Read and consolidate theoretical materials on knowledge gaps highlighted by AI.',
  },
  {
    id: 'next_level',
    textVi: 'Tạo một phiên luyện tập mới với độ khó cao hơn hoặc thêm câu hỏi để kiểm tra lại.',
    textEn: 'Create a new practice session with higher difficulty to test your progress.',
  }
];

export default function Plan() {
  const { language } = useLanguage();
  const { user } = useAuthContext();
  const [searchParams] = useSearchParams();
  const sessionUrlId = searchParams.get('session_id');

  const [selectedId, setSelectedId] = useState<string>('');
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  const isVi = language === 'vi';

  const copy = {
    title: isVi ? 'Kế hoạch & Lộ trình Luyện tập' : 'Practice Plan & Roadmap',
    subtitle: isVi ? 'Lộ trình học tập cá nhân hóa được AI đúc kết sau mỗi phiên phỏng vấn thử của bạn.' : 'Personalized training pathway designed by AI based on your mock interview sessions.',
    selectSession: isVi ? 'Chọn phiên phỏng vấn để xem lộ trình:' : 'Select mock interview session:',
    placeholderSelect: isVi ? 'Chọn một phiên đã hoàn thành...' : 'Select a completed session...',
    statsTitle: isVi ? 'Tổng quan phiên' : 'Session Summary',
    tabEvaluation: isVi ? 'Báo cáo đánh giá' : 'Evaluation Report',
    tabPlan: isVi ? 'Kế hoạch học tập' : 'Learning Plan',
    tabTasks: isVi ? 'Nhiệm vụ hàng ngày' : 'Daily Checklist',
    checklistTitle: isVi ? 'Checklist hành động cá nhân hóa' : 'Personalized Action Checklist',
    checklistDesc: isVi ? 'Hãy hoàn thành các bước hành động sau đây để nhanh chóng khắc phục điểm yếu:' : 'Complete the following steps to target your weakness areas:',
    progress: isVi ? 'Tiến độ hoàn thành nhiệm vụ' : 'Checklist Completion Progress',
    rePractice: isVi ? 'Luyện tập lại vai trò này' : 'Re-practice this role',
    noSessionsTitle: isVi ? 'Chưa có lộ trình học tập nào' : 'No Roadmaps Available Yet',
    noSessionsDesc: isVi ? 'Lộ trình học tập sẽ tự động được tạo ra sau khi bạn hoàn thành một phiên phỏng vấn thử. Hãy bắt đầu luyện tập ngay!' : 'Your learning plan will be generated automatically once you complete a mock interview. Start practicing today!',
    createSession: isVi ? 'Tạo phiên đầu tiên' : 'Start first mock interview',
    evalReportEmpty: isVi ? 'Báo cáo đánh giá đang được tạo hoặc không tìm thấy dữ liệu.' : 'Evaluation report is being generated or not found.',
    planEmpty: isVi ? 'Kế hoạch luyện tập đang được tạo hoặc không tìm thấy dữ liệu.' : 'Practice plan is being generated or not found.',
    backToSession: isVi ? 'Chi tiết phiên' : 'Session details',
  };

  // 1. Fetch completed sessions
  const { data: sessions = [], isLoading } = useQuery<SessionOut[]>({
    queryKey: ['sessions'],
    queryFn: sessionsApi.list,
  });

  const completedSessions = sessions.filter(s => s.status === 'COMPLETED');

  // 2. Set default selected session ID
  useEffect(() => {
    if (completedSessions.length > 0) {
      if (sessionUrlId && completedSessions.some(s => s.id === sessionUrlId)) {
        setSelectedId(sessionUrlId);
      } else if (!selectedId) {
        // Find most recent completed session that has a report/plan, or default to the first completed
        const withPlan = completedSessions.find(s => s.practice_plan || s.evaluation_report);
        setSelectedId(withPlan ? withPlan.id : completedSessions[0].id);
      }
    }
  }, [completedSessions, sessionUrlId]);

  // 3. Load detailed session info when selection changes
  const { data: sessionDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['session', selectedId],
    queryFn: () => sessionsApi.get(selectedId),
    enabled: !!selectedId,
  });

  // 4. Load/Save checklist progress from localStorage
  useEffect(() => {
    if (selectedId) {
      const stored = localStorage.getItem(`invera_plan_checklist_${selectedId}`);
      if (stored) {
        try {
          setChecklist(JSON.parse(stored));
        } catch {
          setChecklist({});
        }
      } else {
        // Initialize all as false
        const initial: Record<string, boolean> = {};
        DEFAULT_TASKS.forEach(t => {
          initial[t.id] = false;
        });
        setChecklist(initial);
      }
    }
  }, [selectedId]);

  const handleToggleTask = (taskId: string, checked: boolean) => {
    const updated = { ...checklist, [taskId]: checked };
    setChecklist(updated);
    if (selectedId) {
      localStorage.setItem(`invera_plan_checklist_${selectedId}`, JSON.stringify(updated));
    }
  };

  // Checklist statistics
  const totalTasks = DEFAULT_TASKS.length;
  const completedTasks = Object.values(checklist).filter(Boolean).length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (completedSessions.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="max-w-md w-full rounded-[28px] border border-dashed border-border bg-card/60 p-8 text-center shadow-lg backdrop-blur-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25">
            <ClipboardList className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-3">{copy.noSessionsTitle}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground mb-6">{copy.noSessionsDesc}</p>
          <Button asChild variant="accent" className="rounded-full px-6 shadow-md transition-all">
            <Link to="/app/new">
              <PlusCircle className="mr-2 w-4 h-4" />
              {copy.createSession}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{copy.title}</h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">{copy.subtitle}</p>
        </div>
        {sessionDetail && (
          <Button variant="accent" className="rounded-full shadow-md shrink-0" asChild>
            <Link to={`/app/new?role=${sessionDetail.role}&level=${sessionDetail.level}&major=${sessionDetail.major ?? 'technology'}`}>
              <PlusCircle className="mr-1.5 w-4 h-4" />
              {copy.rePractice}
            </Link>
          </Button>
        )}
      </div>

      {/* Select Box */}
      <div className="max-w-md">
        <label className="block text-sm font-semibold text-foreground/80 mb-2">{copy.selectSession}</label>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="rounded-full bg-card border-border shadow-sm focus:ring-accent">
            <SelectValue placeholder={copy.placeholderSelect} />
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-border bg-card">
            {completedSessions.map((s) => (
              <SelectItem key={s.id} value={s.id} className="rounded-lg">
                {roleLabelMap[s.role]?.en || s.role} ({levelLabels[s.level]?.en || s.level}) - {new Date(s.created_at).toLocaleDateString(isVi ? 'vi-VN' : 'en-US', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoadingDetail ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      ) : (
        sessionDetail && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left/Main Column - Details tabs */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="rounded-[28px] border border-border bg-card shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  <Tabs defaultValue="evaluation" className="w-full">
                    <TabsList className="w-full justify-start rounded-none border-b border-border bg-muted/40 p-0 h-12">
                      <TabsTrigger 
                        value="evaluation" 
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:text-foreground font-semibold px-6 h-full transition-all"
                      >
                        {copy.tabEvaluation}
                      </TabsTrigger>
                      <TabsTrigger 
                        value="plan" 
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:text-foreground font-semibold px-6 h-full transition-all"
                      >
                        {copy.tabPlan}
                      </TabsTrigger>
                      <TabsTrigger 
                        value="tasks" 
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:text-foreground font-semibold px-6 h-full transition-all"
                      >
                        {copy.tabTasks}
                      </TabsTrigger>
                    </TabsList>
                    
                    <div className="p-6">
                      <TabsContent value="evaluation" className="mt-0 focus-visible:ring-0">
                        {sessionDetail.evaluation_report ? (
                          <EvaluationReport report={sessionDetail.evaluation_report} />
                        ) : (
                          <div className="text-center py-8 text-muted-foreground text-sm flex flex-col items-center gap-2">
                            <BookMarked className="w-8 h-8 text-muted-foreground/50" />
                            {copy.evalReportEmpty}
                          </div>
                        )}
                      </TabsContent>
                      
                      <TabsContent value="plan" className="mt-0 focus-visible:ring-0">
                        {sessionDetail.practice_plan ? (
                          renderMarkdown(sessionDetail.practice_plan)
                        ) : (
                          <div className="text-center py-8 text-muted-foreground text-sm flex flex-col items-center gap-2">
                            <BookOpen className="w-8 h-8 text-muted-foreground/50" />
                            {copy.planEmpty}
                          </div>
                        )}
                      </TabsContent>
                      
                      <TabsContent value="tasks" className="mt-0 focus-visible:ring-0 space-y-6">
                        <div className="space-y-2">
                          <h3 className="font-bold text-foreground text-base">{copy.checklistTitle}</h3>
                          <p className="text-xs text-muted-foreground leading-relaxed">{copy.checklistDesc}</p>
                        </div>
                        
                        <div className="space-y-3.5">
                          {DEFAULT_TASKS.map((task) => (
                            <div 
                              key={task.id} 
                              className={`flex items-start gap-3.5 p-3.5 rounded-2xl border transition-all duration-200 ${
                                checklist[task.id] 
                                  ? 'bg-success/5 border-success/30 text-foreground/80' 
                                  : 'bg-card border-border hover:bg-muted/40'
                              }`}
                            >
                              <Checkbox 
                                id={task.id}
                                checked={checklist[task.id] || false}
                                onCheckedChange={(checked) => handleToggleTask(task.id, !!checked)}
                                className="mt-0.5 border-muted-foreground data-[state=checked]:bg-success data-[state=checked]:border-success rounded-md"
                              />
                              <label 
                                htmlFor={task.id}
                                className={`text-sm leading-relaxed cursor-pointer select-none font-medium ${
                                  checklist[task.id] ? 'line-through text-muted-foreground' : 'text-foreground'
                                }`}
                              >
                                {isVi ? task.textVi : task.textEn}
                              </label>
                            </div>
                          ))}
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="space-y-2 border-t pt-5 mt-4">
                          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                            <span>{copy.progress}</span>
                            <span className="text-success">{progressPercent}%</span>
                          </div>
                          <Progress value={progressPercent} className="h-2 bg-muted [&>div]:bg-success" />
                        </div>
                      </TabsContent>
                    </div>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Stats & Metadata */}
            <div className="space-y-6">
              
              {/* Score & Profile Summary */}
              <Card className="rounded-[28px] border border-border bg-card shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/30 border-b pb-4">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Award className="w-5 h-5 text-accent" />
                    {copy.statsTitle}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Score badge */}
                  <div className="text-center space-y-2">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${getScoreBgClass(sessionDetail.avg_score)}`}>
                      <span className={`text-2xl font-extrabold ${getScoreTextClass(sessionDetail.avg_score)}`}>
                        {sessionDetail.avg_score != null ? formatScoreValue(sessionDetail.avg_score) : '—'}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-foreground/80">
                      {isVi ? 'Điểm trung bình phiên' : 'Session Average Score'}
                    </p>
                  </div>

                  <div className="space-y-3.5 border-t pt-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">{isVi ? 'Vai trò' : 'Role'}</span>
                      <span className="font-bold text-foreground">
                        {roleLabelMap[sessionDetail.role]?.en || sessionDetail.role}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">{isVi ? 'Cấp độ' : 'Level'}</span>
                      <span className="font-bold text-foreground">
                        {levelLabels[sessionDetail.level]?.en || sessionDetail.level}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">{isVi ? 'Câu đã trả lời' : 'Questions Answered'}</span>
                      <span className="font-bold text-foreground">
                        {sessionDetail.question_count ?? 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">{isVi ? 'Ngày luyện tập' : 'Date Practiced'}</span>
                      <span className="font-semibold text-foreground flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        {new Date(sessionDetail.created_at).toLocaleDateString(isVi ? 'vi-VN' : 'en-US')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <Button variant="outline" className="w-full rounded-full text-xs font-bold" asChild>
                      <Link to={`/app/sessions/${sessionDetail.id}`}>
                        {copy.backToSession}
                        <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              {/* Interactive Tip Card */}
              <Card className="rounded-[28px] border border-cyan-500/10 bg-cyan-500/5 dark:bg-cyan-500/5 shadow-sm p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                    <Sparkles className="w-4.5 h-4.5" />
                  </div>
                  <h4 className="font-bold text-sm text-foreground">
                    {isVi ? 'Gợi ý luyện tập thành công' : 'Interview Prep Tip'}
                  </h4>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {isVi 
                    ? 'Việc ôn tập và ghi chép lại các lỗi sai sau mỗi session giúp tăng khả năng phản xạ và ghi nhớ kiến thức lên tới 80%. Hãy bám sát kế hoạch hành động trong Checklist hàng ngày.'
                    : 'Reviewing and addressing gaps after each session boosts mock interview retention and performance by up to 80%. Follow the customized daily checklist steps regularly.'}
                </p>
              </Card>

            </div>
          </div>
        )
      )}
    </div>
  );
}
