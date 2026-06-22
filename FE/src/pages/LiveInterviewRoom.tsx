import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, Bot, Loader2, Mic, Play, RefreshCw, Square, Video } from 'lucide-react';

import { WebcamTelemetry, type TelemetryData } from '@/components/interview/WebcamTelemetry';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  getLocalizedQuestionText,
  sessionsApi,
  type LiveAgentSocketMessage,
  type LiveAgentSocketStatus,
  type SessionDetail,
} from '@/lib/api';
import { roleLabelMap } from '@/lib/mock-data';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
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

function decodeBase64Pcm(base64: string): Int16Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Int16Array(bytes.buffer);
}

function pcmToAudioBuffer(audioContext: AudioContext, pcm: Int16Array, sampleRate = 24000): AudioBuffer {
  const float32 = new Float32Array(pcm.length);
  for (let index = 0; index < pcm.length; index += 1) {
    float32[index] = pcm[index] / 32768;
  }
  const buffer = audioContext.createBuffer(1, float32.length, sampleRate);
  buffer.copyToChannel(float32, 0);
  return buffer;
}

type LiveAgentPhase = 'connecting' | 'transitioning' | 'presenting' | 'listening' | 'probing' | 'error';

const LiveInterviewRoom = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguage();

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agentStatus, setAgentStatus] = useState<LiveAgentSocketStatus | 'error'>('idle');
  const [agentTranscript, setAgentTranscript] = useState('');
  const [liveError, setLiveError] = useState<string | null>(null);
  const [isSocketReady, setIsSocketReady] = useState(false);
  const [socketState, setSocketState] = useState<'idle' | 'connecting' | 'ready' | 'error'>('idle');
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  const phaseCopy = {
    vi: {
      connecting: { label: 'Đang kết nối', cue: 'Đang kết nối tới live agent.' },
      transitioning: {
        label: 'Chuyển bước',
        cue: 'Agent đang chuẩn bị câu hỏi tiếp theo.',
        submittingCue: 'Đang lưu câu trả lời và chuẩn bị bước tiếp theo.',
      },
      presenting: { label: 'Đang trình bày', cue: 'Agent đang đọc câu hỏi.' },
      listening: { label: 'Đang lắng nghe', cue: 'Hãy trả lời tự nhiên. Hệ thống đang ghi hình.' },
      probing: {
        label: 'Đang đào sâu',
        cue: 'Agent vừa để lại gợi ý follow-up. Bạn có thể nghe lại hoặc bắt đầu trả lời.',
      },
      error: {
        label: 'Lỗi',
        cue: 'Live agent hiện không khả dụng. Bạn có thể kết nối lại hoặc tiếp tục xem câu hỏi.',
      },
    },
    en: {
      connecting: { label: 'Connecting', cue: 'Connecting to the live agent.' },
      transitioning: {
        label: 'Transitioning',
        cue: 'Waiting for the live agent to start the question.',
        submittingCue: 'Saving your answer and preparing the next step.',
      },
      presenting: { label: 'Presenting', cue: 'The live agent is presenting the question.' },
      listening: { label: 'Listening', cue: 'Answer naturally. The recording is running.' },
      probing: {
        label: 'Probing',
        cue: 'The agent left a follow-up cue. Replay it or start answering.',
      },
      error: {
        label: 'Error',
        cue: 'The live agent is unavailable right now. Reconnect or continue reviewing the question.',
      },
    },
  } as const;

  const handleEndSession = async () => {
    setEndDialogOpen(false);
    setIsEnding(true);
    try {
      await sessionsApi.complete(id!, { generateReport: false });
      sessionStorage.removeItem(`session_${id}`);
    } catch {
      // Best-effort
    } finally {
      setIsEnding(false);
    }
    navigate('/app/sessions');
  };

  // Force user to end the session, block browser back button & page unload
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);

    const handlePopState = (event: PopStateEvent) => {
      window.history.pushState(null, '', window.location.href);
      toast({
        title: roomLanguage === 'vi' ? 'Bắt buộc kết thúc phiên' : 'Session must be ended',
        description: roomLanguage === 'vi'
          ? 'Bạn không thể quay lại. Vui lòng hoàn thành phỏng vấn hoặc bấm nút Kết thúc.'
          : 'You cannot go back. Please complete the interview or click End.',
        variant: 'destructive',
      });
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
      return '';
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [language, toast]);

  const socketRef = useRef<WebSocket | null>(null);
  const socketSessionRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextPlaybackTimeRef = useRef(0);
  const pendingPlaybackRef = useRef(0);
  const shouldGoIdleRef = useRef(false);

  const currentQuestion = session?.questions[currentIndex] ?? null;
  const questionLabel = currentQuestion ? `Q${currentIndex + 1}` : 'Q';
  const totalQuestions = session?.questions.length ?? 0;
  const sessionLanguage = session?.language === 'en' ? 'en' : 'vi';
  const roomLanguage = session?.language === 'en' ? 'en' : language;
  const copy = {
    confirmEndTitle: roomLanguage === 'vi' ? 'Kết thúc session?' : 'End this session?',
    confirmEnd: roomLanguage === 'vi'
      ? 'Bạn có chắc chắn muốn kết thúc phiên phỏng vấn này? Những câu hỏi chưa trả lời sẽ bị bỏ qua.'
      : 'Are you sure you want to end this session? Any unanswered questions will stay incomplete.',
    confirm: roomLanguage === 'vi' ? 'Xác nhận kết thúc' : 'End session',
    cancel: roomLanguage === 'vi' ? 'Hủy' : 'Cancel',
  };
  const roleLabel = session ? roleLabelMap[session.role]?.[roomLanguage] ?? session.role : '';
  const livePhase: LiveAgentPhase = (() => {
    if (socketState === 'error' || agentStatus === 'error') return 'error';
    if (socketState !== 'ready') return 'connecting';
    if (isSubmitting) return 'transitioning';
    if (agentStatus === 'speaking') return 'presenting';
    if (isRecording) return 'listening';
    if (agentTranscript.trim()) return 'probing';
    return 'transitioning';
  })();
  const currentPhaseCopy = phaseCopy[roomLanguage][livePhase];
  const phaseMessage = (() => {
    if (livePhase === 'error') {
      return liveError ?? currentPhaseCopy.cue;
    }
    if (livePhase === 'transitioning' && isSubmitting) {
      return currentPhaseCopy.submittingCue;
    }
    if ((livePhase === 'presenting' || livePhase === 'probing') && agentTranscript.trim()) {
      return agentTranscript;
    }
    return currentPhaseCopy.cue;
  })();

  useEffect(() => {
    if (!id) return;
    const cached = sessionStorage.getItem(`session_${id}`);
    if (cached) {
      const parsed = JSON.parse(cached) as SessionDetail;
      setSession(parsed);
      return;
    }
    sessionsApi.get(id).then(setSession).catch((error: Error) => {
      toast({
        title: roomLanguage === 'vi' ? 'Không tải được session' : 'Unable to load session',
        description: error.message,
        variant: 'destructive',
      });
      navigate('/app/sessions');
    });
  }, [id, roomLanguage, navigate, toast]);

  const disconnectLiveAgent = useCallback(() => {
    socketSessionRef.current += 1;
    socketRef.current?.close();
    socketRef.current = null;
  }, []);

  const connectLiveAgent = useCallback(() => {
    if (!id || !session || session.mode !== 'live') return;

    disconnectLiveAgent();

    const currentSession = socketSessionRef.current + 1;
    socketSessionRef.current = currentSession;

    setSocketState('connecting');
    setIsSocketReady(false);
    setAgentStatus('idle');
    setAgentTranscript('');
    setLiveError(null);

    const socket = sessionsApi.createLiveAgentSocket?.(id);
    if (!socket) {
      setSocketState('error');
      setLiveError(roomLanguage === 'vi' ? 'Không thể kết nối live agent.' : 'Unable to connect to the live agent.');
      return;
    }

    socketRef.current = socket;
    socket.onmessage = (event) => {
      if (socketSessionRef.current !== currentSession) return;

      const message = JSON.parse(event.data) as LiveAgentSocketMessage;

      if (message.type === 'ready') {
        setSocketState('ready');
        setIsSocketReady(true);
        return;
      }

      if (message.type === 'agent_status') {
        if (message.status === 'speaking') {
          setAgentStatus('speaking');
          shouldGoIdleRef.current = false;
        } else if (pendingPlaybackRef.current === 0) {
          setAgentStatus('idle');
        } else {
          shouldGoIdleRef.current = true;
        }
        return;
      }

      if (message.type === 'agent_transcript' && message.text) {
        setAgentTranscript(message.text);
        return;
      }

      if (message.type === 'agent_audio' && message.audio) {
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext({ sampleRate: 24000 });
        }
        const audioContext = audioContextRef.current;
        const source = audioContext.createBufferSource();
        source.buffer = pcmToAudioBuffer(audioContext, decodeBase64Pcm(message.audio));
        source.connect(audioContext.destination);
        const startAt = Math.max(audioContext.currentTime, nextPlaybackTimeRef.current);
        source.start(startAt);
        nextPlaybackTimeRef.current = startAt + source.buffer.duration;
        pendingPlaybackRef.current += 1;
        setAgentStatus('speaking');
        source.onended = () => {
          pendingPlaybackRef.current = Math.max(0, pendingPlaybackRef.current - 1);
          if (pendingPlaybackRef.current === 0 && shouldGoIdleRef.current) {
            setAgentStatus('idle');
            shouldGoIdleRef.current = false;
          }
        };
        return;
      }

      if (message.type === 'error') {
        setAgentStatus('error');
        setSocketState('error');
        setLiveError(message.message ?? 'Live agent error');
      }
    };

    socket.onerror = () => {
      if (socketSessionRef.current !== currentSession) return;
      setAgentStatus('error');
      setSocketState('error');
      setLiveError(roomLanguage === 'vi' ? 'Live agent bị ngắt kết nối.' : 'The live agent connection failed.');
    };

    return () => {
      if (socketRef.current === socket) {
        socket.close();
        socketRef.current = null;
      }
    };
  }, [disconnectLiveAgent, id, roomLanguage, session]);

  useEffect(() => {
    if (!id || !session || session.mode !== 'live') return;
    const cleanup = connectLiveAgent();
    return cleanup;
  }, [connectLiveAgent, id, session]);

  useEffect(() => {
    if (!isSocketReady || !currentQuestion || socketRef.current?.readyState !== WebSocket.OPEN) return;
    setAgentTranscript('');
    setLiveError(null);
    socketRef.current.send(JSON.stringify({
      type: 'ask',
      questionId: currentQuestion.id,
      language: sessionLanguage,
    }));
  }, [currentQuestion, isSocketReady, sessionLanguage]);

  useEffect(() => () => {
    audioContextRef.current?.close().catch(() => {});
  }, []);

  const askCurrentQuestion = () => {
    if (!currentQuestion || socketRef.current?.readyState !== WebSocket.OPEN || socketState !== 'ready') return;
    setAgentTranscript('');
    setLiveError(null);
    socketRef.current.send(JSON.stringify({
      type: 'ask',
      questionId: currentQuestion.id,
      language: sessionLanguage,
    }));
  };

  const handleReconnect = () => {
    connectLiveAgent();
  };

  const handleRecordingStop = async (videoBlob: Blob, telemetry: TelemetryData) => {
    if (!id || !currentQuestion) return;
    setIsSubmitting(true);
    try {
      const videoFile = new File([videoBlob], `live-answer-${currentQuestion.id}.webm`, { type: videoBlob.type || 'video/webm' });
      await sessionsApi.submitVideoAnswer(id, videoFile, telemetry, sessionLanguage, currentQuestion.id);

      if (currentIndex >= totalQuestions - 1) {
        await sessionsApi.complete(id, { generateReport: true });
        navigate(`/app/sessions/${id}`);
        return;
      }

      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setAgentTranscript('');
    } catch (error) {
      toast({
        title: roomLanguage === 'vi' ? 'Không gửi được câu trả lời' : 'Unable to submit the answer',
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session || !currentQuestion) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#e7f4ff,transparent_38%),linear-gradient(180deg,#fbfdff_0%,#f2f6fb_100%)] p-4 md:p-6">
      <AlertDialog open={endDialogOpen} onOpenChange={setEndDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.confirmEndTitle}</AlertDialogTitle>
            <AlertDialogDescription>{copy.confirmEnd}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isEnding}>{copy.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isEnding}
              onClick={(event) => {
                event.preventDefault();
                void handleEndSession();
              }}
            >
              {isEnding ? <Loader2 className="w-4 h-4 animate-spin" /> : copy.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row">
        <Card className="w-full overflow-hidden border-slate-200 bg-slate-950 text-white lg:w-1/2">
          <CardHeader className="border-b border-white/10">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl">{roomLanguage === 'vi' ? 'HR Live Agent' : 'Live HR Agent'}</CardTitle>
                <p className="text-sm text-slate-300">{roleLabel} · {session.level}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
                  {questionLabel}/{totalQuestions}
                </div>
                <div
                  className={cn(
                    'rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em]',
                    livePhase === 'presenting'
                      ? 'bg-emerald-400/15 text-emerald-200'
                      : livePhase === 'listening'
                        ? 'bg-violet-400/15 text-violet-200'
                        : livePhase === 'probing'
                          ? 'bg-amber-400/15 text-amber-100'
                          : livePhase === 'transitioning'
                            ? 'bg-sky-400/15 text-sky-100'
                            : livePhase === 'error'
                              ? 'bg-rose-400/15 text-rose-200'
                              : 'bg-cyan-400/15 text-cyan-200',
                  )}
                >
                  {currentPhaseCopy.label}
                </div>
                <div
                  className={cn(
                    'rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em]',
                    socketState === 'ready'
                      ? 'bg-emerald-400/15 text-emerald-200'
                      : socketState === 'connecting'
                        ? 'bg-cyan-400/15 text-cyan-200'
                        : socketState === 'error'
                          ? 'bg-rose-400/15 text-rose-200'
                          : 'bg-white/10 text-slate-300',
                  )}
                >
                  {socketState === 'ready'
                    ? (roomLanguage === 'vi' ? 'Đã kết nối' : 'Connected')
                    : socketState === 'connecting'
                      ? (roomLanguage === 'vi' ? 'Đang kết nối' : 'Connecting')
                      : socketState === 'error'
                        ? (roomLanguage === 'vi' ? 'Lỗi' : 'Error')
                        : (roomLanguage === 'vi' ? 'Chờ' : 'Idle')}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex min-h-[560px] flex-col justify-between gap-6 p-6">
            <div className="flex flex-1 flex-col items-center justify-center gap-6">
              <div className="relative">
                <div
                  className={cn(
                    'absolute inset-[-14px] rounded-full transition-all duration-150',
                    agentStatus === 'speaking' ? 'bg-emerald-400/25 shadow-[0_0_70px_rgba(74,222,128,0.7)]' : 'bg-black/50',
                  )}
                />
                <div className="relative flex h-36 w-36 items-center justify-center rounded-full border border-white/10 bg-slate-900">
                  <Bot className="h-16 w-16 text-cyan-300" />
                </div>
              </div>
              <div className="space-y-2 text-center">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{currentPhaseCopy.label}</p>
                <p className="mx-auto max-w-xl text-base text-slate-200" data-testid="live-agent-phase-copy">
                  {phaseMessage}
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-cyan-400/20 bg-white/5 p-5 backdrop-blur">
              <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyan-200">
                <Play className="h-4 w-4" />
                {roomLanguage === 'vi' ? 'Câu hỏi hiện tại' : 'Current question'}
              </div>
              <p className="text-lg leading-8 text-white">{getLocalizedQuestionText(currentQuestion, sessionLanguage)}</p>
              {liveError && (
                <div className="mt-3 flex items-start gap-2 rounded-2xl border border-rose-400/25 bg-rose-500/10 p-3 text-sm text-rose-100">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{liveError}</p>
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  onClick={askCurrentQuestion}
                  disabled={agentStatus === 'speaking' || socketState !== 'ready'}
                >
                  <Mic className="mr-2 h-4 w-4" />
                  {roomLanguage === 'vi' ? 'Đọc lại câu hỏi' : 'Replay question'}
                </Button>
                {socketState !== 'ready' && (
                  <Button variant="outline" onClick={handleReconnect} disabled={socketState === 'connecting'}>
                    {socketState === 'connecting'
                      ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      : <RefreshCw className="mr-2 h-4 w-4" />}
                    {roomLanguage === 'vi' ? 'Kết nối lại' : 'Reconnect'}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full border-slate-200 bg-white/90 shadow-lg lg:w-1/2">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl text-slate-900">{roomLanguage === 'vi' ? 'Ứng viên' : 'Candidate'}</CardTitle>
                <p className="text-sm text-slate-500">
                  {roomLanguage === 'vi'
                    ? 'Trả lời bằng camera. Khi dừng, hệ thống sẽ tự upload và chuyển câu tiếp theo.'
                    : 'Answer on camera. When you stop, the answer uploads in the background and the room advances.'}
                </p>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                <Video className="mr-1 inline h-3.5 w-3.5" />
                {roomLanguage === 'vi' ? 'Chế độ camera' : 'Camera mode'}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 p-6">
            <WebcamTelemetry
              isRecording={isRecording}
              onRecordingStart={(_stream) => undefined}
              onRecordingStop={handleRecordingStop}
              language={sessionLanguage}
              answerText=""
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                variant="accent"
                size="lg"
                onClick={() => setIsRecording((current) => !current)}
                disabled={isSubmitting || agentStatus === 'speaking' || isEnding}
              >
                {isRecording ? <Square className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                {isRecording
                  ? (roomLanguage === 'vi' ? 'Dừng trả lời' : 'Stop answer')
                  : (roomLanguage === 'vi' ? 'Bắt đầu trả lời' : 'Start answer')}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setEndDialogOpen(true)}
                disabled={isRecording || isSubmitting || isEnding}
              >
                {isEnding ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Square className="mr-2 h-4 w-4" />
                )}
                {isEnding
                  ? (roomLanguage === 'vi' ? 'Đang kết thúc...' : 'Ending...')
                  : (roomLanguage === 'vi' ? 'Kết thúc phỏng vấn' : 'End session')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LiveInterviewRoom;
