import { useState } from 'react';
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
import { roles, levels, answerModes, questionCounts, timeLimits, difficulties } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { ApiError, sessionsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuthContext } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const NewSession = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuthContext();
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  const [config, setConfig] = useState({
    role: '',
    level: 'junior',
    questionCount: 5,
    timeLimit: 'none',
    answerMode: 'text',
    difficulty: 'medium',
  });

  const filteredRoles = roles.filter(role =>
    role.name[language].toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedRole = roles.find(r => r.id === config.role);
  const selectedLevel = levels.find(level => level.id === config.level);
  const canStartNewSession = user?.can_start_new_session ?? true;
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
  };

  const handleStartInterview = async () => {
    if (!config.role) return;
    setIsCreating(true);
    try {
      const session = await sessionsApi.create({
        role: config.role,
        level: config.level,
        mode: config.answerMode,
        question_count: config.questionCount,
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
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div 
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all",
                    step === s 
                      ? "gradient-accent text-accent-foreground shadow-glow" 
                      : step > s
                        ? "bg-accent/20 text-accent"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
                </div>
                <span className={cn(
                  "text-sm font-medium hidden sm:block",
                  step === s ? "text-foreground" : "text-muted-foreground"
                )}>
                  {s === 1 ? t('newSession', 'stepRole') : s === 2 ? t('newSession', 'stepLevel') : t('newSession', 'stepOptions')}
                </span>
                {s < 3 && <div className="w-12 h-0.5 bg-muted hidden sm:block" />}
              </div>
            ))}
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
                            <p className="text-xs text-muted-foreground">{role.questions} {copy.questionWord}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Level Selection */}
              {step === 2 && (
                <RadioGroup
                  value={config.level}
                  onValueChange={(value) => setConfig({ ...config, level: value })}
                  className="grid gap-3"
                >
                  {levels.map((level) => (
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
                        <p className="text-sm text-muted-foreground">{level.description[language]}</p>
                      </div>
                    </Label>
                  ))}
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
                          className={cn(
                            "flex-1 py-3 rounded-lg border font-medium transition-all",
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
                    <div className="grid grid-cols-2 gap-3">
                      {timeLimits.map((limit) => (
                        <button
                          key={limit.id}
                          onClick={() => setConfig({ ...config, timeLimit: limit.id })}
                          className={cn(
                            "py-3 rounded-lg border font-medium transition-all",
                            config.timeLimit === limit.id
                              ? "border-accent bg-accent text-accent-foreground"
                              : "border-border hover:border-accent/50"
                          )}
                        >
                          {limit.name[language]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Answer Mode */}
                  <div>
                    <Label className="mb-3 block">{t('newSession', 'answerMode')}</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {answerModes.map((mode) => (
                        <button
                          key={mode.id}
                          onClick={() => setConfig({ ...config, answerMode: mode.id })}
                          className={cn(
                            "p-4 rounded-lg border text-center transition-all",
                            config.answerMode === mode.id
                              ? "border-accent bg-accent/5"
                              : "border-border hover:border-accent/50"
                          )}
                        >
                          <span className="text-2xl block mb-1">{mode.icon}</span>
                          <p className="font-medium text-foreground">{mode.name[language]}</p>
                          <p className="text-xs text-muted-foreground">{mode.description[language]}</p>
                        </button>
                      ))}
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
                    disabled={step === 1 && !config.role}
                  >
                    {t('newSession', 'next')}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    variant="accent"
                    onClick={handleStartInterview}
                    disabled={isCreating}
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
                  <span className="text-muted-foreground">{t('newSession', 'role')}</span>
                  <span className="font-medium text-foreground">
                    {selectedRole ? selectedRole.name[language] : t('newSession', 'notSelected')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('newSession', 'level')}</span>
                  <span className="font-medium text-foreground capitalize">
                    {selectedLevel?.name[language]}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('newSession', 'questions')}</span>
                  <span className="font-medium text-foreground">{config.questionCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('newSession', 'timeLimit')}</span>
                  <span className="font-medium text-foreground">
                    {timeLimits.find(lim => lim.id === config.timeLimit)?.name[language]}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('newSession', 'answerModeLabel')}</span>
                  <span className="font-medium text-foreground">{answerModes.find(m => m.id === config.answerMode)?.name[language]}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('newSession', 'difficultyLabel')}</span>
                  <span className="font-medium text-foreground">{difficulties.find(d => d.id === config.difficulty)?.name[language]}</span>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button 
                  variant="accent" 
                  size="lg" 
                  className="w-full"
                  onClick={handleStartInterview}
                  disabled={!config.role || isCreating}
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
