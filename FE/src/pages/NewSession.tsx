import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Search,
  Sparkles,
  Loader2
} from 'lucide-react';
import { sessionMajors, roles, levels, answerModes, questionCounts, difficulties } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { ApiError, sessionsApi, type SessionCatalogRole } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuthContext } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type SessionConfig = {
  major: string;
  role: string;
  level: string;
  language: 'vi' | 'en';
  questionCount: number | null;
  answerMode: 'camera' | 'live';
  difficulty: string;
};

function normalizeAnswerMode(mode: unknown): 'camera' | 'live' {
  return mode === 'live' ? 'live' : 'camera';
}

const NewSession = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuthContext();
  const [step, setStep] = useState<number>(() => {
    const saved = sessionStorage.getItem('invera_new_session_step');
    return saved ? parseInt(saved, 10) : 1;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [catalog, setCatalog] = useState<SessionCatalogRole[]>([]);
  const isLiveSetup = location.pathname.startsWith('/app/live');
  const canUseLiveSession = Boolean(
    user?.is_admin ||
    (user?.plan_status === 'active' && (user?.plan_tier === 'pro' || user?.plan_tier === 'premium')),
  );
  const liveModeOption = {
    id: 'live',
    icon: '🟢',
    name: { vi: 'Live session', en: 'Live session' },
    description: {
      vi: 'HR agent hỏi trực tiếp, bạn trả lời bằng camera.',
      en: 'A live HR agent asks the question while you answer on camera.',
    },
  } as const;
  
  const [config, setConfig] = useState<SessionConfig>(() => {
    const saved = sessionStorage.getItem('invera_new_session_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          language: parsed.language === 'en' ? 'en' : language,
          answerMode: isLiveSetup ? 'live' : normalizeAnswerMode(parsed.answerMode),
        };
      } catch (e) {
        console.error("Failed to parse saved config:", e);
      }
    }
    return {
      major: 'technology',
      role: '',
      level: '',
      language,
      questionCount: null,
      answerMode: isLiveSetup ? 'live' : 'camera',
      difficulty: '',
    };
  });

  useEffect(() => {
    setConfig((current) => ({
      ...current,
      answerMode: isLiveSetup ? 'live' : normalizeAnswerMode(current.answerMode),
    }));
  }, [isLiveSetup]);

  useEffect(() => {
    sessionStorage.setItem('invera_new_session_step', String(step));
  }, [step]);

  useEffect(() => {
    sessionStorage.setItem('invera_new_session_config', JSON.stringify(config));
  }, [config]);

  const filteredRoles = roles.filter(role =>
    role.major === config.major &&
    role.name[language].toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    sessionsApi.catalog().then(setCatalog).catch(() => {});
  }, []);

  const catalogByRole = useMemo(() => {
    return new Map(catalog.map((item) => [`${item.major}:${item.role}`, item] as const));
  }, [catalog]);

  const getMajorTotalQuestions = (majorId: string) => {
    const fromCatalog = catalog
      .filter((item) => item.major === majorId)
      .reduce((sum, item) => sum + item.total_questions, 0);
    if (fromCatalog > 0) return fromCatalog;
    return roles
      .filter((r) => r.major === majorId)
      .reduce((sum, r) => sum + r.questions, 0);
  };

  const selectedMajor = sessionMajors.find((major) => major.id === config.major);
  const selectedRole = roles.find(r => r.id === config.role);
  const selectedLevel = levels.find(level => level.id === config.level);
  const selectedRoleCatalog = config.role ? catalogByRole.get(`${config.major}:${config.role}`) : undefined;
  const availableQuestionCount = selectedRoleCatalog?.counts_by_level?.[config.level] ?? 0;
  const requestedQuestionCount = config.questionCount == null
    ? null
    : availableQuestionCount > 0
      ? Math.min(config.questionCount, availableQuestionCount)
      : config.questionCount;
  const canStartNewSession = user?.can_start_new_session ?? true;
  const minutesPerQuestion = 5;
  const selectedDifficulty = difficulties.find((difficulty) => difficulty.id === config.difficulty);
  const isStep1Complete = Boolean(config.role) && Boolean(config.language);
  const isStep2Complete = Boolean(config.level);
  const isStep3Complete = config.questionCount != null && Boolean(config.difficulty);
  const canStartInterview = isStep1Complete && isStep2Complete && isStep3Complete && step === 3 && !isCreating;
  const copy = {
    createErrorTitle: language === 'vi' ? 'Lỗi tạo session' : 'Unable to create session',
    createErrorDescription: language === 'vi' ? 'Không thể tạo session. Vui lòng thử lại.' : 'Unable to create the session. Please try again.',
    blockedTitle: language === 'vi' ? 'Không thể tạo session mới' : 'Unable to create a new session',
    blockedBody: language === 'vi'
      ? 'Bạn đã dùng hết số phiên phỏng vấn cho phép. Hãy mua thêm session hoặc nâng cấp gói để tiếp tục.'
      : 'You have run out of available sessions. Please purchase more sessions or upgrade your plan to continue.',
    upgradePlan: language === 'vi' ? 'Nâng cấp gói' : 'Upgrade plan',
    viewSessions: language === 'vi' ? 'Xem session hiện có' : 'View existing sessions',
    creating: language === 'vi' ? 'Đang tạo...' : 'Creating...',
    questionWord: language === 'vi' ? 'câu hỏi' : 'questions',
    chooseMajor: language === 'vi' ? 'Chọn major' : 'Choose a major',
    chooseLanguage: language === 'vi' ? 'Chọn ngôn ngữ phỏng vấn' : 'Choose interview language',
    languageHint: language === 'vi'
      ? 'Ngôn ngữ này sẽ được dùng cho câu hỏi, transcript và STT.'
      : 'This language will be used for questions, transcripts, and speech-to-text.',
    vietnamese: language === 'vi' ? 'Tiếng Việt' : 'Vietnamese',
    english: language === 'vi' ? 'Tiếng Anh' : 'English',
    availableQuestions: language === 'vi' ? 'Câu hỏi khả dụng' : 'Available questions',
    unavailableLevel: language === 'vi'
      ? 'Level này chưa có sẵn câu hỏi. Hệ thống sẽ tự đồng bộ và tạo bộ câu hỏi khi bạn bắt đầu.'
      : 'This level does not have ready-made questions yet. The system will sync and generate them when you start.',
    generatingOnDemand: language === 'vi'
      ? 'Question bank sẽ được tạo tự động cho tổ hợp này.'
      : 'The question bank will be generated automatically for this combination.',
    noRoles: language === 'vi'
      ? 'Không có role phù hợp trong major này. Hãy đổi major hoặc từ khóa tìm kiếm.'
      : 'No matching roles in this major. Try a different major or search keyword.',
    completeAllSteps: language === 'vi'
      ? 'Hãy hoàn thành đủ 3 bước trước khi bắt đầu phỏng vấn.'
      : 'Complete all 3 steps before starting the interview.',
    selectLevelFirst: language === 'vi'
      ? 'Bạn cần chọn level ở bước 2.'
      : 'You need to choose a level in step 2.',
    selectOptionsFirst: language === 'vi'
      ? 'Bạn cần chọn đủ cấu hình ở bước 3.'
      : 'You need to finish the options in step 3.',
    fixedTimeLimitBody: language === 'vi'
      ? 'Mỗi câu hỏi và follow-up có tối đa 5 phút. Không còn tính tổng giờ cho toàn bộ session.'
      : 'Each question and follow-up has a 5-minute cap. There is no session-wide total time budget.',
    minutesPerQuestion: language === 'vi' ? `${minutesPerQuestion} phút / câu` : `${minutesPerQuestion} min / question`,
  };

  useEffect(() => {
    if (config.questionCount != null && availableQuestionCount > 0 && config.questionCount > availableQuestionCount) {
      setConfig((current) => ({
        ...current,
        questionCount: availableQuestionCount >= 15 ? 15 : availableQuestionCount >= 10 ? 10 : availableQuestionCount,
      }));
    }
  }, [availableQuestionCount, config.questionCount]);

  const handleStartInterview = async () => {
    if (!canStartInterview || requestedQuestionCount == null) return;
    setIsCreating(true);
    try {
      const session = await sessionsApi.create({
        major: config.major,
        role: config.role,
        level: config.level,
        mode: config.answerMode,
        language: config.language,
        question_count: requestedQuestionCount,
      });
      // Store session questions in sessionStorage so InterviewRoom can use them
      sessionStorage.setItem(`session_${session.id}`, JSON.stringify(session));
      
      // Clear wizard temporary state
      sessionStorage.removeItem('invera_new_session_step');
      sessionStorage.removeItem('invera_new_session_config');
      
      navigate(config.answerMode === 'live' ? `/app/live/${session.id}` : `/app/interview/${session.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        navigate('/app/upgrade');
      }
      toast({
        title: copy.createErrorTitle,
        description: err instanceof Error ? err.message : copy.createErrorDescription,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">{t('newSession', 'title')}</h1>
        <p className="text-muted-foreground">{t('newSession', 'subtitle')}</p>
      </div>

      {!canStartNewSession && (
        <Alert className="mb-8 border-amber-200 bg-amber-50 text-amber-900">
          <AlertTitle>{copy.blockedTitle}</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{copy.blockedBody}</p>
            <div className="flex gap-3">
              <Button variant="accent" asChild>
                <Link to="/app/upgrade">{copy.upgradePlan}</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/app/sessions">{copy.viewSessions}</Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {canStartNewSession && (

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Stepper */}
          <div className="flex items-center gap-4 mb-8">
            {[1, 2, 3].map((s) => {
              const isCompleted = s === 1 ? isStep1Complete : s === 2 ? isStep2Complete : isStep3Complete;
              return (
              <div key={s} className="flex items-center gap-2">
                <div 
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all",
                    step === s 
                      ? "gradient-accent text-accent-foreground shadow-glow" 
                      : isCompleted
                        ? "bg-accent/20 text-accent"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted && step !== s ? <CheckCircle2 className="w-5 h-5" /> : s}
                </div>
                <span className={cn(
                  "text-sm font-medium hidden sm:block",
                  step === s ? "text-foreground" : "text-muted-foreground"
                )}>
                  {s === 1 ? t('newSession', 'stepRole') : s === 2 ? t('newSession', 'stepLevel') : t('newSession', 'stepOptions')}
                </span>
                {s < 3 && <div className="w-12 h-0.5 bg-muted hidden sm:block" />}
              </div>
            )})}
          </div>

          {/* Step Content */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
              <CardTitle className="text-xl font-bold">
                {step === 1 && t('newSession', 'chooseRole')}
                {step === 2 && t('newSession', 'selectLevel')}
                {step === 3 && t('newSession', 'configOptions')}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(step - 1)}
                  disabled={step === 1}
                  className="h-9 px-3"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  {t('newSession', 'back')}
                </Button>
                {step < 3 ? (
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={() => setStep(step + 1)}
                    disabled={(step === 1 && !isStep1Complete) || (step === 2 && !isStep2Complete)}
                    className="h-9 px-3"
                  >
                    {t('newSession', 'next')}
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                ) : (
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={handleStartInterview}
                    disabled={!canStartInterview}
                    className="h-9 px-3"
                  >
                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
                    {isCreating ? copy.creating : t('newSession', 'startInterview')}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Step 1: Role Selection */}
              {step === 1 && (
        <div className="space-y-4">
                  <div className="rounded-2xl border border-border bg-muted/30 p-4">
                    <div className="mb-3">
                      <Label className="block text-base">{copy.chooseLanguage}</Label>
                      <p className="mt-1 text-sm text-muted-foreground">{copy.languageHint}</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {(['vi', 'en'] as const).map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setConfig((current) => ({ ...current, language: item }))}
                          className={cn(
                            "rounded-xl border p-4 text-left transition-all hover:shadow-md",
                            config.language === item
                              ? "border-accent bg-accent/5 shadow-sm"
                              : "border-border hover:border-accent/50"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-foreground">
                              {item === 'vi' ? copy.vietnamese : copy.english}
                            </span>
                            <span className="text-xs font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                              {item.toUpperCase()}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="block">{copy.chooseMajor}</Label>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {sessionMajors.map((major) => (
                        <button
                          key={major.id}
                          onClick={() =>
                            setConfig((current) => ({
                              ...current,
                              major: major.id,
                              role: current.major === major.id ? current.role : '',
                            }))
                          }
                          className={cn(
                            "rounded-xl border p-4 text-left transition-all hover:shadow-md",
                            config.major === major.id
                              ? "border-accent bg-accent/5 shadow-sm"
                              : "border-border hover:border-accent/50"
                          )}
                        >
                          <p className="font-medium text-foreground flex justify-between items-center gap-2">
                            <span>{major.name['en']}</span>
                            <span className="text-xs font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full shrink-0">
                              {getMajorTotalQuestions(major.id)}
                            </span>
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">{major.description['en']}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input 
                      placeholder={t('newSession', 'searchRoles')}
                      className="pl-10 h-12"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {filteredRoles.map((role) => (
                      <button
                        key={role.id}
                        onClick={() => setConfig({ ...config, role: role.id })}
                        className={cn(
                            "p-4 rounded-xl border text-left transition-all hover:shadow-md",
                            config.role === role.id
                              ? "border-accent bg-accent/5 shadow-sm"
                              : "border-border hover:border-accent/50"
                          )}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{role.icon}</span>
                          <div>
                            <p className="font-medium text-foreground">{role.name['en']}</p>
                            <p className="text-xs text-muted-foreground">
                              {catalogByRole.get(`${role.major}:${role.id}`)?.total_questions ?? role.questions} {copy.questionWord}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  {filteredRoles.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                      {copy.noRoles}
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Level Selection */}
              {step === 2 && (
                <RadioGroup
                  value={config.level}
                  onValueChange={(value) => setConfig({ ...config, level: value })}
                  className="grid gap-3"
                >
                  {levels.map((level) => {
                    const levelCount = selectedRoleCatalog?.counts_by_level?.[level.id] ?? 0;
                    return (
                    <Label
                      key={level.id}
                      htmlFor={level.id}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md",
                        config.level === level.id
                          ? "border-accent bg-accent/5"
                          : "border-border hover:border-accent/50"
                      )}
                    >
                      <RadioGroupItem value={level.id} id={level.id} />
                      <div>
                        <p className="font-medium text-foreground">{level.name['en']}</p>
                        <p className="text-sm text-muted-foreground">
                          {level.description['en']}
                          {config.role
                            ? levelCount > 0
                              ? ` · ${levelCount} ${copy.questionWord}`
                              : ` · ${copy.generatingOnDemand}`
                            : ''}
                        </p>
                      </div>
                    </Label>
                    );
                  })}
                </RadioGroup>
              )}

              {/* Step 3: Options */}
              {step === 3 && (
                <div className="space-y-6">
                  {/* Question Count */}
                  <div>
                    <Label className="mb-3 block">{t('newSession', 'numQuestions')}</Label>
                    <div className="flex gap-3">
                      {questionCounts.map((count) => (
                        <button
                          key={count}
                          onClick={() => setConfig({ ...config, questionCount: count })}
                          disabled={availableQuestionCount > 0 && count > availableQuestionCount}
                          className={cn(
                            "flex-1 py-3 rounded-lg border font-medium transition-all",
                            availableQuestionCount > 0 && count > availableQuestionCount && "cursor-not-allowed opacity-40",
                            config.questionCount === count
                              ? "border-accent bg-accent text-accent-foreground"
                              : "border-border hover:border-accent/50"
                          )}
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time Limit */}
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <Label className="mb-2 block">{t('newSession', 'timeLimit')}</Label>
                    <p className="text-sm text-muted-foreground">{copy.fixedTimeLimitBody}</p>
                    <div className="mt-3 flex items-center justify-between rounded-lg border bg-background px-4 py-3">
                      <span className="text-sm font-medium text-foreground">{copy.minutesPerQuestion}</span>
                      <span className="text-sm font-semibold text-accent">5 min</span>
                    </div>
                  </div>

                  {/* Answer Mode */}
                  <div>
                    <Label className="mb-3 block">{t('newSession', 'answerMode')}</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {(isLiveSetup ? [liveModeOption] : answerModes).map((mode) => {
                        const isLockedLive = mode.id === 'live' && !canUseLiveSession;
                        return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => {
                            if (mode.id === 'live' && !canUseLiveSession) {
                              navigate('/app/upgrade');
                              return;
                            }
                            setConfig({ ...config, answerMode: mode.id as 'camera' | 'live' });
                          }}
                          className={cn(
                            "relative p-4 rounded-lg border text-center transition-all",
                            config.answerMode === mode.id
                              ? "border-accent bg-accent/5"
                              : "border-border hover:border-accent/50",
                            isLockedLive && "opacity-70",
                          )}
                        >
                          <span className="text-2xl block mb-1">{mode.icon}</span>
                          <p className="font-medium text-foreground">{mode.name[language]}</p>
                          <p className="text-xs text-muted-foreground">
                            {mode.description[language]}
                          </p>
                          {isLockedLive && (
                            <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.18em] text-amber-600">
                              {language === 'vi' ? 'Cần Pro / Premium' : 'Pro / Premium required'}
                            </p>
                          )}
                        </button>
                      )})}
                    </div>
                  </div>

                  {/* Difficulty */}
                  <div>
                    <Label className="mb-3 block">{t('newSession', 'difficulty')}</Label>
                    <div className="flex gap-3">
                      {difficulties.map((diff) => (
                        <button
                          key={diff.id}
                          onClick={() => setConfig({ ...config, difficulty: diff.id })}
                          className={cn(
                            "flex-1 py-3 rounded-lg border font-medium transition-all",
                            config.difficulty === diff.id
                              ? "border-accent bg-accent text-accent-foreground"
                              : "border-border hover:border-accent/50"
                          )}
                        >
                          {diff.name[language]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}


            </CardContent>
          </Card>
        </div>

        {/* Summary Panel */}
        <div className="lg:col-span-1">
          <Card className="sticky top-8">
            <CardHeader>
              <CardTitle className="text-lg">{t('newSession', 'sessionSummary')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{copy.chooseMajor}</span>
                  <span className="font-medium text-foreground">
                    {selectedMajor ? selectedMajor.name['en'] : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{copy.chooseLanguage}</span>
                  <span className="font-medium text-foreground">
                    {config.language === 'vi' ? copy.vietnamese : copy.english}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('newSession', 'role')}</span>
                  <span className="font-medium text-foreground">
                    {selectedRole ? selectedRole.name['en'] : t('newSession', 'notSelected')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('newSession', 'level')}</span>
                  <span className="font-medium text-foreground capitalize">
                    {selectedLevel?.name['en'] ?? t('newSession', 'notSelected')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('newSession', 'questions')}</span>
                  <span className="font-medium text-foreground">{requestedQuestionCount ?? t('newSession', 'notSelected')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{copy.availableQuestions}</span>
                  <span className="font-medium text-foreground">{availableQuestionCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('newSession', 'timeLimit')}</span>
                  <span className="font-medium text-foreground">{copy.minutesPerQuestion}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('newSession', 'answerModeLabel')}</span>
                  <span className="font-medium text-foreground">
                    {(isLiveSetup ? [liveModeOption] : answerModes).find((mode) => mode.id === config.answerMode)?.name[language] ?? 'Camera'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('newSession', 'difficultyLabel')}</span>
                  <span className="font-medium text-foreground">{selectedDifficulty?.name[language] ?? t('newSession', 'notSelected')}</span>
                </div>
              </div>

              <div className="pt-4 border-t">
                {!canStartInterview && (
                  <p className="mb-3 text-sm text-muted-foreground">
                    {!isStep1Complete
                      ? copy.completeAllSteps
                      : !isStep2Complete
                        ? copy.selectLevelFirst
                        : copy.selectOptionsFirst}
                  </p>
                )}
                <Button 
                  variant="accent" 
                  size="lg" 
                  className="w-full"
                  onClick={handleStartInterview}
                  disabled={!canStartInterview}
                >
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {isCreating ? copy.creating : t('newSession', 'startInterview')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      )}
    </div>
  );
};

export default NewSession;
