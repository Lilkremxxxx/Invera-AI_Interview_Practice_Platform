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
  VideoOff,
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
import { WebcamTelemetry, TelemetryData } from '@/components/interview/WebcamTelemetry';

const RECORDING_LIMIT_SECONDS = 120;
const DEFAULT_STT_LANGUAGE = 'vi';
const FEEDBACK_MASCOT_ANIMATIONS = [
  'animate-mascot-bounce',
  'animate-mascot-wiggle',
  'animate-mascot-float',
  'animate-mascot-spark',
] as const;

type FeedbackMascotAnimation = (typeof FEEDBACK_MASCOT_ANIMATIONS)[number];
type FeedbackMascotCue = {
  index: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  animation: FeedbackMascotAnimation;
};

function createFeedbackMascotCue(): FeedbackMascotCue {
  return {
    index: (Math.floor(Math.random() * 8) + 1) as FeedbackMascotCue['index'],
    animation: FEEDBACK_MASCOT_ANIMATIONS[Math.floor(Math.random() * FEEDBACK_MASCOT_ANIMATIONS.length)],
  };
}

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

type RealtimeSttMessage =
  | { type: 'partial'; seq: number; text: string; is_final: false }
  | { type: 'final'; seq: number; text: string; is_final: true }
  | { type: 'error'; seq: number; detail: string; recoverable?: boolean }
  | { type: 'stopped'; seq: number };

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
    intern: { vi: 'Intern', en: 'Intern' },
    fresher: { vi: 'Fresher', en: 'Fresher' },
    junior: { vi: 'Junior', en: 'Junior' },
    mid: { vi: 'Mid-level', en: 'Mid-level' },
    senior: { vi: 'Senior', en: 'Senior' },
  };

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answer, setAnswer] = useState('');
  const answerRef = useRef('');
  useEffect(() => {
    answerRef.current = answer;
  }, [answer]);
  const [sttLanguage, setSttLanguage] = useState<SttLanguage>(language === 'vi' ? 'vi' : 'en');
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);
  const isSubmittingAfterStopRef = useRef(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSynthesizingFeedback, setIsSynthesizingFeedback] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState<AnswerOut | null>(null);
  const [feedbackMascotCue, setFeedbackMascotCue] = useState<FeedbackMascotCue | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completedSession, setCompletedSession] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [webcamTelemetry, setWebcamTelemetry] = useState<TelemetryData | null>(null);
  const autoCompletedRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const realtimeSocketRef = useRef<WebSocket | null>(null);
  const realtimeSocketReadyRef = useRef(false);
  const realtimeTranscriptReceivedRef = useRef(false);
  const recordingAnswerPrefixRef = useRef('');
  const realtimeFinalTranscriptRef = useRef('');
  const realtimePartialTranscriptRef = useRef('');
  const liveFinalTranscriptRef = useRef('');
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);


  // Load session from sessionStorage (set by NewSession after create)
  useEffect(() => {
    if (!id) return;
    const cached = sessionStorage.getItem(`session_${id}`);
    if (cached) {
      try {
        setSession(JSON.parse(cached));
        return;
      } catch {
        // Ignore stale cached session JSON and fall back to the API.
      }
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
        await sessionsApi.complete(id, { generateReport: false });
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
      realtimeSocketRef.current?.close();
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


  const handleSubmitAnswer = () => {
    if (!question || !id || isTimeUp) return;
    
    if (isRecording) {
      handleStopRecording();
      return;
    }

    if (!answer.trim()) return;
    
    const currentQuestionId = question.id;
    const answerText = answer;

    // Fire-and-forget background upload
    sessionsApi.submitAnswer(id, {
      question_id: currentQuestionId,
      answer_text: answerText,
      output_language: sttLanguage,
    }).catch(err => {
      console.error("Error submitting text answer in background:", err);
    });

    void handleNextQuestion();
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

  const buildCombinedTranscript = (prefix: string, finalText: string, partialText: string) => {
    return [prefix.trim(), finalText.trim(), partialText.trim()].filter(Boolean).join(' ').trim();
  };

  const syncAnswerWithRealtimeTranscript = () => {
    const combined = buildCombinedTranscript(
      recordingAnswerPrefixRef.current,
      realtimeFinalTranscriptRef.current,
      realtimePartialTranscriptRef.current,
    );
    setAnswer(combined);
  };

  const closeRealtimeSttSocket = () => {
    const socket = realtimeSocketRef.current;
    realtimeSocketRef.current = null;
    realtimeSocketReadyRef.current = false;

    if (audioContextRef.current) {
      try {
        void audioContextRef.current.close();
      } catch (err) {
        console.error('Error closing audio context:', err);
      }
      audioContextRef.current = null;
    }
    if (audioProcessorRef.current) {
      try {
        audioProcessorRef.current.disconnect();
      } catch (err) {
        console.error('Error disconnecting audio processor:', err);
      }
      audioProcessorRef.current = null;
    }
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.disconnect();
      } catch (err) {
        console.error('Error disconnecting audio source:', err);
      }
      audioSourceRef.current = null;
    }

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'stop' }));
    }
    socket?.close();
    setLiveTranscript('');
  };

  const startRealtimeSttSocket = async () => {
    if (!id || !session) return false;

    closeRealtimeSttSocket();
    realtimeTranscriptReceivedRef.current = false;
    realtimeFinalTranscriptRef.current = '';
    realtimePartialTranscriptRef.current = '';

    // Create AudioContext early to detect sample rate
    let sampleRate = 16000;
    const stream = mediaStreamRef.current;
    if (stream) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextClass();
        audioContextRef.current = audioContext;
        sampleRate = audioContext.sampleRate;
      } catch (err) {
        console.error('Failed to pre-create AudioContext:', err);
      }
    }

    const socket = sessionsApi.createRealtimeSttSocket?.(id, {
      language: sttLanguage,
      questionId: session.questions[currentQuestion]?.id,
      sampleRate: sampleRate,
    });
    if (!socket) {
      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
      return false;
    }

    realtimeSocketRef.current = socket;
    return await new Promise<boolean>((resolve) => {
      let resolved = false;
      const settle = (value: boolean) => {
        if (resolved) return;
        resolved = true;
        resolve(value);
      };

      socket.onopen = async () => {
        realtimeSocketReadyRef.current = true;

        const audioContext = audioContextRef.current;
        if (stream && audioContext) {
          try {
            const source = audioContext.createMediaStreamSource(stream);
            let useWorklet = false;

            if (audioContext.audioWorklet) {
              try {
                const workletCode = `
                  class PCMProcessor extends AudioWorkletProcessor {
                    process(inputs, outputs, parameters) {
                      const input = inputs[0];
                      if (input && input[0]) {
                        this.port.postMessage(input[0]);
                      }
                      return true;
                    }
                  }
                  registerProcessor('pcm-processor', PCMProcessor);
                `;
                const blob = new Blob([workletCode], { type: 'application/javascript' });
                const workletUrl = URL.createObjectURL(blob);
                await audioContext.audioWorklet.addModule(workletUrl);

                const workletNode = new AudioWorkletNode(audioContext, 'pcm-processor');
                let bufferQueue: Float32Array[] = [];
                let bufferLength = 0;
                const TARGET_ACCUMULATED_SAMPLES = Math.floor(sampleRate * 0.25);

                workletNode.port.onmessage = (event) => {
                  const inputData = event.data as Float32Array;
                  bufferQueue.push(new Float32Array(inputData));
                  bufferLength += inputData.length;

                  if (bufferLength >= TARGET_ACCUMULATED_SAMPLES) {
                    const flattened = new Float32Array(bufferLength);
                    let offset = 0;
                    for (const chunk of bufferQueue) {
                      flattened.set(chunk, offset);
                      offset += chunk.length;
                    }
                    bufferQueue = [];
                    bufferLength = 0;

                    if (socket.readyState !== WebSocket.OPEN) return;
                    const pcmData = new Int16Array(flattened.length);
                    for (let i = 0; i < flattened.length; i++) {
                      const s = Math.max(-1, Math.min(1, flattened[i]));
                      pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                    }
                    socket.send(pcmData.buffer);
                  }
                };

                source.connect(workletNode);
                workletNode.connect(audioContext.destination);

                audioProcessorRef.current = workletNode;
                audioSourceRef.current = source;
                useWorklet = true;
                console.log('Successfully set up real-time PCM audio streaming using AudioWorklet');
              } catch (workletErr) {
                console.warn('Failed to initialize AudioWorklet, falling back to ScriptProcessor:', workletErr);
              }
            }

            if (!useWorklet) {
              const processor = audioContext.createScriptProcessor(4096, 1, 1);
              processor.onaudioprocess = (e) => {
                if (socket.readyState !== WebSocket.OPEN) return;
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmData = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                  const s = Math.max(-1, Math.min(1, inputData[i]));
                  pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }
                socket.send(pcmData.buffer);
              };

              source.connect(processor);
              processor.connect(audioContext.destination);

              audioProcessorRef.current = processor;
              audioSourceRef.current = source;
              console.log('Successfully set up real-time PCM audio streaming using ScriptProcessorNode');
            }
          } catch (err) {
            console.error('Failed to set up real-time PCM audio streaming:', err);
          }
        }

        settle(true);
      };
      socket.onerror = () => {
        realtimeSocketReadyRef.current = false;
        settle(false);
      };
      socket.onclose = () => {
        realtimeSocketReadyRef.current = false;
        if (isRecordingRef.current && !speechRecognitionRef.current) {
          startLiveSpeechRecognition();
        }
      };
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as RealtimeSttMessage;
          if (payload.type === 'partial') {
            realtimePartialTranscriptRef.current = payload.text.trim();
            setLiveTranscript(realtimePartialTranscriptRef.current);
            syncAnswerWithRealtimeTranscript();
            return;
          }
          if (payload.type === 'final' && payload.text.trim()) {
            realtimeTranscriptReceivedRef.current = true;
            realtimeFinalTranscriptRef.current = `${realtimeFinalTranscriptRef.current} ${payload.text}`.trim();
            realtimePartialTranscriptRef.current = '';
            liveFinalTranscriptRef.current = realtimeFinalTranscriptRef.current;
            setLiveTranscript('');
            syncAnswerWithRealtimeTranscript();
            return;
          }
          if (payload.type === 'error') {
            setLiveTranscript('');
          }
        } catch {
          // Ignore malformed WS messages and keep the recording alive.
        }
      };

      window.setTimeout(() => settle(socket.readyState === WebSocket.OPEN), 1500);
    });
  };

  const sendRealtimeChunk = (blob: Blob) => {
    if (audioContextRef.current) return;
    if (!blob.size) return;
    const socket = realtimeSocketRef.current;
    if (!socket || !realtimeSocketReadyRef.current || socket.readyState !== WebSocket.OPEN) return;

    void blob.arrayBuffer().then((buffer) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(buffer);
      }
    }).catch(() => {
      // Ignore transient chunk serialization errors; upload fallback still exists.
    });
  };


  const startLiveSpeechRecognition = () => {
    if (speechRecognitionRef.current) {
      console.warn('Speech recognition is already running.');
      return;
    }
    const speechWindow = window as SpeechRecognitionWindow;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      console.error('Web Speech API is not supported in this browser.');
      return;
    }

    try {
      const recognition = new Recognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = browserSttLanguageMap[sttLanguage];
      recognition.onresult = (event) => {
        let interim = '';
        let finalAccumulated = '';
        for (let index = 0; index < event.results.length; index += 1) {
          const result = event.results[index];
          if (result.isFinal) {
            finalAccumulated += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }
        liveFinalTranscriptRef.current = finalAccumulated.trim();
        setLiveTranscript(interim.trim());
        
        const combined = buildCombinedTranscript(
          recordingAnswerPrefixRef.current,
          finalAccumulated,
          interim
        );
        setAnswer(combined);
      };
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error, event.message);
        speechRecognitionRef.current = null;
        setLiveTranscript('');
      };
      recognition.onend = () => {
        console.log('Speech recognition ended.');
        speechRecognitionRef.current = null;
        setLiveTranscript('');
      };
      recognition.start();
      speechRecognitionRef.current = recognition;
      console.log('Speech recognition started successfully.');
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      speechRecognitionRef.current = null;
    }
  };

  const stopLiveSpeechRecognition = () => {
    const recognition = speechRecognitionRef.current;
    speechRecognitionRef.current = null;
    recognition?.stop();
    setLiveTranscript('');
  };

  const handleWebcamRecordingStart = (stream: MediaStream) => {
    mediaStreamRef.current = stream;
  };

  const handleWebcamRecordingStop = (videoBlob: Blob, telemetry: TelemetryData) => {
    setIsRecording(false);
    stopRecordingTracks();

    if (videoBlob.size && id) {
      const videoFile = new File([videoBlob], `session-${id}-${question.id}.webm`, { type: 'video/webm' });
      const currentQuestionId = question.id;
      
      // Fire-and-forget background upload
      sessionsApi.submitVideoAnswer(
        id,
        videoFile,
        telemetry,
        sttLanguage,
        currentQuestionId
      ).catch((err) => {
        console.error("Error uploading video answer in background:", err);
      });
    }

    // Immediately go to next question
    void handleNextQuestion();
  };

  const handleStartRecording = async () => {
    if (isTimeUp || isTranscribing) return;
    recordingAnswerPrefixRef.current = answer;
    liveFinalTranscriptRef.current = '';
    setLiveTranscript('');
    if (session?.mode === 'camera') {
      const hasVideo = mediaStreamRef.current?.getVideoTracks().some((track) => track.readyState === 'live');
      if (!hasVideo) {
        toast({
          title: language === 'vi' ? 'Vui lòng bật camera trước khi ghi hình.' : 'Please turn on your camera before recording.',
          variant: 'destructive',
        });
        return;
      }
      setIsRecording(true);
      return;
    }

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

      recorder.onstop = () => {
        setIsRecording(false);
        stopRecordingTracks();

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];

        if (audioBlob.size && id) {
          const audioFile = new File([audioBlob], `session-${id}-${question.id}.webm`, { type: 'audio/webm' });
          const currentQuestionId = question.id;
          
          // Fire-and-forget background upload
          sessionsApi.transcribeAnswer(
            id,
            audioFile,
            sttLanguage,
            currentQuestionId
          ).catch((err) => {
            console.error("Error uploading audio answer in background:", err);
          });
        }

        // Immediately go to next question
        void handleNextQuestion();
      };

      mediaRecorderRef.current = recorder;
      setRecordingSeconds(0);
      recorder.start(1250);
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
    if (session?.mode === 'camera') {
      setIsRecording(false);
      return;
    }
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    mediaRecorderRef.current = null;
    recorder.stop();
  };

  const handleNextQuestion = async () => {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setAnswer('');
      setLiveTranscript('');
      setShowFeedback(false);
      setCurrentAnswer(null);
      setWebcamTelemetry(null);
      liveFinalTranscriptRef.current = '';
    } else {
      // Last question — complete the session
      setIsCompleting(true);
      try {
        const completed = await sessionsApi.complete(id!, { generateReport: true });
        setCompletedSession(completed);
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
      await sessionsApi.complete(id!, { generateReport: false });
      sessionStorage.removeItem(`session_${id}`);
    } catch {
      // Still return to the session list if the best-effort completion call fails.
    }
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
      <div className="fixed top-0 left-0 right-0 z-50 bg-card border-b px-6 lg:px-12 py-3">
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-accent">
              {copy.questionLabel} {currentQuestion + 1} / {totalQuestions}
            </span>
            <div className="w-32 hidden sm:block">
              <Progress value={progress} className="h-2" />
            </div>
            <span className="text-xs text-muted-foreground hidden sm:inline capitalize">
              {(roleLabelMap[session.role]?.en || session.role)} • {(levelLabels[session.level]?.en || session.level)}
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
      <div className="pt-20 pb-8 px-6 lg:px-12">
        <div className="w-full grid lg:grid-cols-12 gap-8">
          {/* AI Interviewer Side (Left, 1/3 width) */}
          <div className="space-y-6 lg:col-span-4">
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
                    {roleLabelMap[session.role]?.en || session.role} • {levelLabels[session.level]?.en || session.level}
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

            {/* Answer Textbox placed immediately below the question */}
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
                    {(session?.mode === 'voice' || session?.mode === 'camera') && (
                      <>
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
                          {isRecording ? (
                            session?.mode === 'camera' ? <VideoOff className="w-4 h-4" /> : <MicOff className="w-4 h-4" />
                          ) : (
                            session?.mode === 'camera' ? <Video className="w-4 h-4" /> : <Mic className="w-4 h-4" />
                          )}
                          {isRecording ? copy.stop : (session?.mode === 'camera' ? (language === 'vi' ? 'Ghi hình' : 'Record') : copy.voice)}
                        </Button>
                      </>
                    )}
                  </div>
                  <Button 
                    variant="accent" 
                    onClick={handleSubmitAnswer}
                    disabled={!answer.trim() || isTimeUp || isTranscribing || isSubmitting}
                  >
                    {copy.submit}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
                {(isRecording || isTranscribing) && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-accent/20 bg-accent/5 px-3 py-2 text-sm">
                    <Badge variant="secondary" className="rounded-full border border-accent/20 bg-background/80 px-3 py-1 text-foreground">
                      {isRecording ? (
                        session?.mode === 'camera' ? <Video className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />
                      ) : (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      )}
                      {isRecording ? (session?.mode === 'camera' ? (language === 'vi' ? 'Đang ghi hình...' : 'Recording...') : copy.recording) : copy.transcribing}
                    </Badge>
                    <span className="text-muted-foreground">
                      {isRecording
                        ? `${copy.recordingLimit} ${formatCountdown(recordingSecondsLeft)}`
                        : copy.takeSeconds}
                    </span>
                    {liveTranscript && (
                      <span className="basis-full text-xs text-muted-foreground mt-1">
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

            {/* STAR Hint */}
            <div className="bg-info/10 border border-info/20 rounded-xl p-4 flex gap-3">
              <Lightbulb className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground mb-1">{copy.hintTitle}</p>
                <p className="text-xs text-muted-foreground">{copy.hintBody}</p>
              </div>
            </div>
          </div>

          {/* Camera / Feedback Side (Right, 2/3 width) */}
          <div className="space-y-6 lg:col-span-8">
            {/* Webcam Telemetry if camera mode */}
            {session?.mode === 'camera' && !showFeedback && !isSubmitting && (
              <WebcamTelemetry
                isRecording={isRecording}
                onRecordingStart={handleWebcamRecordingStart}
                onRecordingStop={handleWebcamRecordingStop}
                onRecordingChunk={sendRealtimeChunk}
                language={sttLanguage}
                liveTranscript={liveTranscript}
                answerText={answer}
                onCameraReady={(stream) => {
                  mediaStreamRef.current = stream;
                }}
                onCameraClose={() => {
                  mediaStreamRef.current = null;
                }}
              />
            )}

            {/* Placeholder when in voice mode (and not showing feedback) */}
            {session?.mode !== 'camera' && !showFeedback && !isSubmitting && (
              <div className="bg-card rounded-2xl border p-8 flex flex-col items-center justify-center space-y-4 shadow-sm min-h-[340px] h-full">
                <div className="w-16 h-16 rounded-full bg-accent/15 flex items-center justify-center animate-pulse">
                  <Mic className="w-8 h-8 text-accent" />
                </div>
                <h4 className="font-semibold text-foreground">{language === 'vi' ? 'Đang phỏng vấn bằng Giọng nói' : 'Voice Interview Active'}</h4>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  {language === 'vi' 
                    ? 'Hãy nhấn nút "Ghi âm" và bắt đầu trả lời câu hỏi bằng giọng nói.' 
                    : 'Click "Voice" and speak your answer directly to the microphone.'}
                </p>
              </div>
            )}

            {/* Feedback Panel */}
            {showFeedback && currentAnswer && (
              <div className="relative overflow-hidden bg-card rounded-2xl border p-6 md:p-8 space-y-6">
                {feedbackMascotCue && (
                  <img
                    src={`/mascot/animation-${feedbackMascotCue.index}.png`}
                    alt="Invera feedback mascot"
                    width={112}
                    height={128}
                    loading="lazy"
                    decoding="async"
                    className={cn(
                      'pointer-events-none absolute right-4 top-4 z-10 w-16 select-none object-contain opacity-90 drop-shadow-[0_14px_18px_rgba(15,23,42,0.12)] sm:w-20 md:w-24',
                      feedbackMascotCue.animation
                    )}
                  />
                )}
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
