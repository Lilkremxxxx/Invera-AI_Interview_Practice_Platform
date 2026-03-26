import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { sessionMajors, roles, levels, answerModes, questionCounts, timeLimits, difficulties } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { ApiError, sessionsApi, type SessionCatalogRole } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuthContext } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { resolveSessionTimeLimitId } from '@/lib/plans';

type SessionConfig = {
  major: string;
  role: string;
  level: string;
  questionCount: number | null;
  timeLimit: string;
  answerMode: 'text';
  difficulty: string;
};

const NewSession = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuthContext();
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [catalog, setCatalog] = useState<SessionCatalogRole[]>([]);
  
  const [config, setConfig] = useState<SessionConfig>({
    major: 'technology',
    role: '',
    level: '',
    questionCount: null,
    timeLimit: '',
    answerMode: 'text',
    difficulty: '',
  });

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

  const selectedMajor = sessionMajors.find((major) => major.id === config.major);
  const selectedRole = roles.find(r => r.id === config.role);
  const selectedLevel = levels.find(level => level.id === config.level);
  const allowedTimeLimitId = resolveSessionTimeLimitId(user);
  const selectedRoleCatalog = config.role ? catalogByRole.get(`${config.major}:${config.role}`) : undefined;
  const availableQuestionCount = selectedRoleCatalog?.counts_by_level?.[config.level] ?? 0;
  const requestedQuestionCount = config.questionCount == null
    ? null
    : availableQuestionCount > 0
      ? Math.min(config.questionCount, availableQuestionCount)
      : config.questionCount;
  const canStartNewSession = user?.can_start_new_session ?? true;
  const textAnswerMode = answerModes.find((mode) => mode.id === 'text');
  const selectedTimeLimit = timeLimits.find((limit) => limit.id === config.timeLimit);
  const selectedTimeLimitMinutes = config.timeLimit === 'none' ? null : Number(config.timeLimit);
  const selectedDifficulty = difficulties.find((difficulty) => difficulty.id === config.difficulty);
  const isStep1Complete = Boolean(config.role);
  const isStep2Complete = Boolean(config.level);
  const isStep3Complete = config.questionCount != null && Boolean(config.timeLimit) && Boolean(config.difficulty);
  const canStartInterview = isStep1Complete && isStep2Complete && isStep3Complete && step === 3 && !isCreating;
  const copy = {
    createErrorTitle: language === 'vi' ? 'Lỗi tạo session' : 'Unable to create session',
    createErrorDescription: language === 'vi' ? 'Không thể tạo session. Vui lòng thử lại.' : 'Unable to create the session. Please try again.',
    blockedTitle: language === 'vi' ? 'Không thể tạo session mới' : 'Unable to create a new session',
    blockedBody: language === 'vi'
      ? 'Bạn đã dùng hết session của Free trial. Hãy nâng cấp gói để tiếp tục luyện tập.'
      : 'You have already used the only session included in Free trial. Upgrade your plan to continue practicing.',
    upgradePlan: language === 'vi' ? 'Nâng cấp gói' : 'Upgrade plan',
    viewSessions: language === 'vi' ? 'Xem session hiện có' : 'View existing sessions',
    creating: language === 'vi' ? 'Đang tạo...' : 'Creating...',
    questionWord: language === 'vi' ? 'câu hỏi' : 'questions',
    chooseMajor: language === 'vi' ? 'Chọn major' : 'Choose a major',
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
    futureFunction: language === 'vi' ? 'Tính năng tương lai' : 'Future function',
    voiceVideoFuture: language === 'vi'
      ? 'Voice và Video sẽ được mở ở bản cập nhật sau.'
      : 'Voice and Video will be available in a future update.',
    planBasedTimeLimit: language === 'vi'
      ? 'Giới hạn thời gian được cố định theo gói hiện tại của bạn.'
      : 'Time limit is fixed by your current plan.',
  };

  useEffect(() => {
    if (config.questionCount != null && availableQuestionCount > 0 && config.questionCount > availableQuestionCount) {
      setConfig((current) => ({
        ...current,
        questionCount: availableQuestionCount >= 15 ? 15 : availableQuestionCount >= 10 ? 10 : availableQuestionCount,
      }));
    }
  }, [availableQuestionCount, config.questionCount]);

  useEffect(() => {
    setConfig((current) => (
      current.timeLimit === allowedTimeLimitId
        ? current
        : { ...current, timeLimit: allowedTimeLimitId }
    ));
  }, [allowedTimeLimitId]);

  const handleStartInterview = async () => {
    if (!canStartInterview || requestedQuestionCount == null) return;
    setIsCreating(true);
    try {
      const session = await sessionsApi.create({
        major: config.major,
        role: config.role,
        level: config.level,
        mode: config.answerMode,
        question_count: requestedQuestionCount,
        time_limit_minutes: selectedTimeLimitMinutes,
      });
      // Store session questions in sessionStorage so InterviewRoom can use them
      sessionStorage.setItem(`session_${session.id}`, JSON.stringify(session));
      navigate(`/app/interview/${session.id}`);
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
            <CardHeader>
              <CardTitle>
                {step === 1 && t('newSession', 'chooseRole')}
                {step === 2 && t('newSession', 'selectLevel')}
                {step === 3 && t('newSession', 'configOptions')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Step 1: Role Selection */}
              {step === 1 && (
                <div className="space-y-4">
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
                          <p className="font-medium text-foreground">{major.name[language]}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{major.description[language]}</p>
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
                            <p className="font-medium text-foreground">{role.name[language]}</p>
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
                        <p className="font-medium text-foreground">{level.name[language]}</p>
                        <p className="text-sm text-muted-foreground">
                          {level.description[language]}
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
                  <div>
                    <Label className="mb-3 block">{t('newSession', 'timeLimit')}</Label>
                    <p className="mb-3 text-sm text-muted-foreground">{copy.planBasedTimeLimit}</p>
                    <div className="grid grid-cols-2 gap-3">
                      {timeLimits.map((limit) => {
                        const isLocked = limit.id !== allowedTimeLimitId;
                        return (
                          <button
                            key={limit.id}
                            type="button"
                            disabled={isLocked}
                            onClick={() => setConfig({ ...config, timeLimit: limit.id })}
                            className={cn(
                              "py-3 rounded-lg border font-medium transition-all",
                              isLocked && "cursor-not-allowed opacity-45",
                              config.timeLimit === limit.id
                                ? "border-accent bg-accent text-accent-foreground"
                                : "border-border hover:border-accent/50"
                            )}
                          >
                            {limit.name[language]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Answer Mode */}
                  <div>
                    <Label className="mb-3 block">{t('newSession', 'answerMode')}</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {answerModes.map((mode) => {
                        const isFuture = mode.id !== 'text';
                        return (
                        <button
                          key={mode.id}
                          type="button"
                          disabled={isFuture}
                          className={cn(
                            "relative p-4 rounded-lg border text-center transition-all",
                            isFuture && "cursor-not-allowed opacity-55",
                            config.answerMode === mode.id
                              ? "border-accent bg-accent/5"
                              : "border-border hover:border-accent/50"
                          )}
                        >
                          {isFuture && (
                            <span className="absolute right-3 top-3 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              {copy.futureFunction}
                            </span>
                          )}
                          <span className="text-2xl block mb-1">{mode.icon}</span>
                          <p className="font-medium text-foreground">{mode.name[language]}</p>
                          <p className="text-xs text-muted-foreground">
                            {isFuture ? copy.voiceVideoFuture : mode.description[language]}
                          </p>
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

              {/* Navigation */}
              <div className="flex justify-between mt-8 pt-6 border-t">
                <Button
                  variant="ghost"
                  onClick={() => setStep(step - 1)}
                  disabled={step === 1}
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t('newSession', 'back')}
                </Button>
                {step < 3 ? (
                  <Button
                    variant="accent"
                    onClick={() => setStep(step + 1)}
                    disabled={(step === 1 && !isStep1Complete) || (step === 2 && !isStep2Complete)}
                  >
                    {t('newSession', 'next')}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    variant="accent"
                    onClick={handleStartInterview}
                    disabled={!canStartInterview}
                  >
                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {isCreating ? copy.creating : t('newSession', 'startInterview')}
                  </Button>
                )}
              </div>
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
                    {selectedMajor ? selectedMajor.name[language] : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('newSession', 'role')}</span>
                  <span className="font-medium text-foreground">
                    {selectedRole ? selectedRole.name[language] : t('newSession', 'notSelected')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('newSession', 'level')}</span>
                  <span className="font-medium text-foreground capitalize">
                    {selectedLevel?.name[language] ?? t('newSession', 'notSelected')}
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
                  <span className="font-medium text-foreground">
                    {selectedTimeLimit?.name[language] ?? t('newSession', 'notSelected')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('newSession', 'answerModeLabel')}</span>
                  <span className="font-medium text-foreground">{textAnswerMode?.name[language] ?? 'Text'}</span>
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
