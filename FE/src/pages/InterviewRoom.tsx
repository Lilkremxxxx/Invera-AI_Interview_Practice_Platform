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
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
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
  Volume2,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLocalizedQuestionCategory, getLocalizedQuestionText, sessionsApi, SessionDetail, QuestionOut, AnswerOut } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { StructuredFeedback } from '@/components/feedback/StructuredFeedback';
import { useLanguage } from '@/contexts/LanguageContext';
import { roleLabelMap } from '@/lib/mock-data';
import { formatScoreValue, getScoreBarClass, getScoreBgClass, getScoreTextClass, toScoreProgress } from '@/lib/score';

const RECORDING_LIMIT_SECONDS = 120;
const DEFAULT_STT_LANGUAGE = 'vi';

type SttLanguage = 'vi' | 'en';

const browserSttLanguageMap: Record<SttLanguage, string> = {
  vi: 'vi-VN',
  en: 'en-US',
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

function resolveFeedbackAudioUrl(audioUrl: string): string {
  if (/^(https?:|blob:|data:)/i.test(audioUrl)) {
    return audioUrl;
  }

  const apiBase = import.meta.env.VITE_API_BASE_URL || '';
  if (audioUrl.startsWith('/media') && /^https?:\/\//i.test(apiBase)) {
    return `${new URL(apiBase).origin}${audioUrl}`;
  }

  return audioUrl;
}

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
    voice: language === 'vi' ? 'Ghi âm' : 'Voice',
    recording: language === 'vi' ? 'Đang ghi âm...' : 'Recording...',
    recordingLimit: language === 'vi' ? 'Tự dừng sau' : 'Auto-stop in',
    recordingLimitReached: language === 'vi' ? 'Đã chạm giới hạn ghi âm, đang chuyển sang văn bản.' : 'Recording limit reached, transcribing now.',
    transcribing: language === 'vi' ? 'Đang chuyển giọng nói thành văn bản...' : 'Transcribing your recording...',
    liveTranscript: language === 'vi' ? 'Transcript realtime' : 'Live transcript',
    sttUnavailable: language === 'vi' ? 'Trình duyệt này không hỗ trợ ghi âm.' : 'This browser does not support audio recording.',
    sttPermissionDenied: language === 'vi' ? 'Không thể truy cập microphone.' : 'Unable to access the microphone.',
    sttFailed: language === 'vi' ? 'Không thể chuyển giọng nói thành văn bản.' : 'Unable to transcribe the recording.',
    sttLanguage: language === 'vi' ? 'Ngôn ngữ voice' : 'Voice language',
    vietnameseVoice: language === 'vi' ? 'Tiếng Việt' : 'Vietnamese voice input',
    englishVoice: language === 'vi' ? 'Tiếng Anh' : 'English voice input',
    submit: language === 'vi' ? 'Nộp câu trả lời' : 'Submit answer',
    grading: language === 'vi' ? 'Đang chấm bài...' : 'Scoring your answer...',
    takeSeconds: language === 'vi' ? 'Thường mất khoảng 15-30 giây' : 'Usually takes about 15-30 seconds',
    timeLeft: language === 'vi' ? 'Còn lại' : 'Time left',
    timeExpiredTitle: language === 'vi' ? 'Đã hết thời gian' : 'Time is up',
    timeExpiredBody: language === 'vi'
      ? 'Session đã tự kết thúc vì vượt quá giới hạn thời gian.'
      : 'The session ended automatically because the time limit was reached.',
    score: language === 'vi' ? 'Điểm số' : 'Score',
    submittedAnswer: language === 'vi' ? 'Câu trả lời của bạn' : 'Your answer',
    feedback: language === 'vi' ? 'Nhận xét' : 'Feedback',
    listenFeedback: language === 'vi' ? 'Nghe phản hồi' : 'Listen to feedback',
    feedbackAudioPlayer: language === 'vi' ? 'Trình phát audio nhận xét' : 'Feedback audio player',
    preparingFeedbackAudio: language === 'vi' ? 'Đang tạo giọng đọc...' : 'Preparing voice...',
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
  const [sttLanguage, setSttLanguage] = useState<SttLanguage>(DEFAULT_STT_LANGUAGE);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSynthesizingFeedback, setIsSynthesizingFeedback] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState<AnswerOut | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completedSession, setCompletedSession] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const autoCompletedRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const liveFinalTranscriptRef = useRef('');
  const audioChunksRef = useRef<Blob[]>([]);

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

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stream?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      speechRecognitionRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (!isRecording) {
      setRecordingSeconds(0);
      return;
    }

    const intervalId = window.setInterval(() => {
      setRecordingSeconds((current) => Math.min(RECORDING_LIMIT_SECONDS, current + 1));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isRecording]);

  useEffect(() => {
    if (!isRecording || recordingSeconds < RECORDING_LIMIT_SECONDS) return;

    handleStopRecording();
    toast({
      title: copy.recordingLimitReached,
      description: copy.transcribing,
    });
  }, [copy.recordingLimitReached, copy.transcribing, isRecording, recordingSeconds, toast]);

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
  const recordingSecondsLeft = Math.max(0, RECORDING_LIMIT_SECONDS - recordingSeconds);

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
        output_language: sttLanguage,
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

  const handleListenFeedback = async () => {
    if (!currentAnswer || !id || isSynthesizingFeedback) return;
    if (currentAnswer.tts_audio_url) return;

    setIsSynthesizingFeedback(true);
    try {
      const result = await sessionsApi.synthesizeFeedbackAudio(id, currentAnswer.id);
      setCurrentAnswer((existing) => existing
        ? {
            ...existing,
            tts_script: result.tts_script,
            tts_audio_url: result.tts_audio_url,
          }
        : existing);
    } catch (err) {
      toast({
        title: copy.submitError,
        description: err instanceof Error ? err.message : copy.retry,
        variant: 'destructive',
      });
    } finally {
      setIsSynthesizingFeedback(false);
    }
  };

  const stopRecordingTracks = () => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  };

  const appendTranscript = (transcript: string) => {
    setAnswer((current) => {
      const trimmedCurrent = current.trim();
      if (!trimmedCurrent) return transcript;
      return `${current}${/\s$/.test(current) ? '' : ' '}${transcript}`;
    });
  };

  const startLiveSpeechRecognition = () => {
    const speechWindow = window as SpeechRecognitionWindow;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) return;

    try {
      const recognition = new Recognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = browserSttLanguageMap[sttLanguage];
      recognition.onresult = (event) => {
        let interim = '';
        let finalText = '';
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          if (result.isFinal) {
            finalText += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }
        if (finalText.trim()) {
          liveFinalTranscriptRef.current = `${liveFinalTranscriptRef.current} ${finalText}`.trim();
        }
        setLiveTranscript(interim.trim());
      };
      recognition.onerror = () => {
        speechRecognitionRef.current = null;
        setLiveTranscript('');
      };
      recognition.onend = () => {
        speechRecognitionRef.current = null;
        setLiveTranscript('');
      };
      recognition.start();
      speechRecognitionRef.current = recognition;
    } catch {
      speechRecognitionRef.current = null;
    }
  };

  const stopLiveSpeechRecognition = () => {
    const recognition = speechRecognitionRef.current;
    speechRecognitionRef.current = null;
    recognition?.stop();
    setLiveTranscript('');
  };

  const handleStartRecording = async () => {
    if (isTimeUp || isTranscribing) return;
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      toast({
        title: copy.sttUnavailable,
        variant: 'destructive',
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      liveFinalTranscriptRef.current = '';

      const preferredMimeType = typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : undefined;
      const recorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = async () => {
        setIsRecording(false);
        stopLiveSpeechRecognition();
        stopRecordingTracks();

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        if (!audioBlob.size || !id) return;
        setIsTranscribing(true);
        try {
          const audioFile = new File([audioBlob], `session-${id}.webm`, { type: 'audio/webm' });
          const result = await sessionsApi.transcribeAnswer(
            id,
            audioFile,
            sttLanguage,
            session.questions[currentQuestion]?.id,
          );
          appendTranscript(result.text);
        } catch (err) {
          toast({
            title: copy.sttFailed,
            description: err instanceof Error ? err.message : copy.retry,
            variant: 'destructive',
          });
        } finally {
          setIsTranscribing(false);
        }
      };
      mediaRecorderRef.current = recorder;
      setRecordingSeconds(0);
      recorder.start();
      startLiveSpeechRecognition();
      setIsRecording(true);
    } catch (err) {
      stopRecordingTracks();
      toast({
        title: copy.sttPermissionDenied,
        description: err instanceof Error ? err.message : copy.retry,
        variant: 'destructive',
      });
    }
  };

  const handleStopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    mediaRecorderRef.current = null;
    recorder.stop();
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
                  disabled={isTimeUp || isTranscribing}
                  className="min-h-[200px] resize-none text-base"
                />

                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="flex flex-wrap items-center gap-2">
                    <div
                      aria-label={copy.sttLanguage}
                      className="inline-flex rounded-md border border-input bg-background p-0.5"
                      role="group"
                    >
                      <Button
                        aria-label={copy.vietnameseVoice}
                        aria-pressed={sttLanguage === 'vi'}
                        className="h-8 px-3 text-xs"
                        disabled={isRecording || isTranscribing}
                        onClick={() => setSttLanguage('vi')}
                        size="sm"
                        type="button"
                        variant={sttLanguage === 'vi' ? 'secondary' : 'ghost'}
                      >
                        VI
                      </Button>
                      <Button
                        aria-label={copy.englishVoice}
                        aria-pressed={sttLanguage === 'en'}
                        className="h-8 px-3 text-xs"
                        disabled={isRecording || isTranscribing}
                        onClick={() => setSttLanguage('en')}
                        size="sm"
                        type="button"
                        variant={sttLanguage === 'en' ? 'secondary' : 'ghost'}
                      >
                        EN
                      </Button>
                    </div>
                    <Button
                      variant={isRecording ? "destructive" : "outline"}
                      size="sm"
                      onClick={isRecording ? handleStopRecording : handleStartRecording}
                      disabled={isTimeUp || isTranscribing}
                    >
                      {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      {isRecording ? copy.stop : copy.voice}
                    </Button>
                  </div>
                  <Button 
                    variant="accent" 
                    onClick={handleSubmitAnswer}
                    disabled={!answer.trim() || isTimeUp || isRecording || isTranscribing}
                  >
                    {copy.submit}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
                {(isRecording || isTranscribing) && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-accent/20 bg-accent/5 px-3 py-2 text-sm">
                    <Badge variant="secondary" className="rounded-full border border-accent/20 bg-background/80 px-3 py-1 text-foreground">
                      {isRecording ? <Mic className="w-3.5 h-3.5" /> : <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {isRecording ? copy.recording : copy.transcribing}
                    </Badge>
                    <span className="text-muted-foreground">
                      {isRecording
                        ? `${copy.recordingLimit} ${formatCountdown(recordingSecondsLeft)}`
                        : copy.takeSeconds}
                    </span>
                    {liveTranscript && (
                      <span className="basis-full text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{copy.liveTranscript}:</span> {liveTranscript}
                      </span>
                    )}
                  </div>
                )}
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

                <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                  <p className="mb-2 text-sm font-semibold text-foreground">{copy.submittedAnswer}</p>
                  <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/90">
                    {currentAnswer.answer_text}
                  </p>
                </div>

                {/* Feedback */}
                <div>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <h5 className="font-semibold text-foreground flex items-center gap-2">
                      {currentAnswer.score >= 7 ? (
                        <CheckCircle2 className="w-5 h-5 text-success" />
                      ) : currentAnswer.score >= 4 ? (
                        <AlertCircle className="w-5 h-5 text-warning" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-destructive" />
                      )}
                      {copy.feedback}
                    </h5>
                    {currentAnswer.tts_audio_url ? (
                      <audio
                        aria-label={copy.feedbackAudioPlayer}
                        className="h-10 w-full max-w-sm"
                        controls
                        preload="metadata"
                        src={resolveFeedbackAudioUrl(currentAnswer.tts_audio_url)}
                      />
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isSynthesizingFeedback}
                        onClick={() => void handleListenFeedback()}
                      >
                        {isSynthesizingFeedback ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                        {isSynthesizingFeedback ? copy.preparingFeedbackAudio : copy.listenFeedback}
                      </Button>
                    )}
                  </div>
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
