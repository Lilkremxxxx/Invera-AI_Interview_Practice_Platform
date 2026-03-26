import { ChangeEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Loader2,
  MessageSquareText,
  Paperclip,
  SendHorizonal,
  Sparkles,
  X,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { ApiError, QnaMessageOut, qnaApi } from '@/lib/api';
import { userInitials } from '@/lib/plans';
import { cn } from '@/lib/utils';
import { QnaStructuredAnswer } from '@/components/qna/QnaStructuredAnswer';

const DOCX_MAX_BYTES = 10 * 1024 * 1024;

const copy = {
  vi: {
    title: 'Invera QnA',
    subtitle: 'Hỏi bất kỳ điều gì về câu trả lời phỏng vấn, kiến thức kỹ thuật, hoặc upload DOCX để AI giải thích theo rubric của Invera.',
    panelTitle: 'QnA theo rubric Invera',
    panelBody: 'AI sẽ trả lời theo hướng rõ ràng, đúng trọng tâm, nhấn mạnh điểm cần cải thiện và cách biến câu trả lời thành phiên bản mạnh hơn khi đi phỏng vấn.',
    suggestedPrompt: 'Ví dụ: Giải thích giúp mình CORS trong FastAPI và mình nên trả lời câu này thế nào khi đi phỏng vấn?',
    emptyTitle: 'Chưa có hội thoại nào',
    emptyBody: 'Hãy bắt đầu bằng một câu hỏi text hoặc upload một file DOCX để AI phân tích nội dung cho bạn.',
    quoteReady: 'Đã thêm đoạn bôi đen vào khung hỏi.',
    quotePlaceholder: 'Đoạn đang được hỏi tiếp',
    docxReady: 'DOCX đã sẵn sàng để gửi',
    docxHint: 'Hỗ trợ DOCX tối đa 10MB. PDF sẽ thêm sau.',
    invalidDocxType: 'Hiện chỉ hỗ trợ file DOCX cho tab QnA.',
    invalidDocxSize: 'DOCX vượt quá 10MB.',
    askPlaceholder: 'Hỏi bất kỳ điều gì về câu trả lời, rubric, hoặc nội dung từ DOCX...',
    attachDocx: 'Đính kèm DOCX',
    removeDocx: 'Xóa DOCX',
    send: 'Gửi câu hỏi',
    sending: 'AI đang trả lời...',
    loadingThread: 'Đang tải hội thoại QnA...',
    sendFailed: 'Không thể gửi câu hỏi lúc này.',
    inputRequired: 'Hãy nhập câu hỏi hoặc đính kèm một file DOCX.',
    lockedTitle: 'QnA đã bị khóa',
    lockedBody: 'Gói Free không dùng được QnA. Hãy nâng cấp lên Basic, Pro hoặc Premium để mở khóa.',
    unlockNow: 'Mở khóa ngay',
    followUpTemplate: 'Giải thích rõ hơn đoạn này theo rubric Invera và chỉ ra mình nên trả lời tốt hơn như thế nào:',
    user: 'Bạn',
    ai: 'Invera AI',
  },
  en: {
    title: 'Invera QnA',
    subtitle: 'Ask anything about interview answers, technical concepts, or upload a DOCX so the AI can explain it using Invera’s rubric.',
    panelTitle: 'Rubric-aware QnA',
    panelBody: 'The assistant stays aligned with Invera’s coaching style: relevance, clarity, concrete examples, and how to turn a draft answer into a stronger interview-ready version.',
    suggestedPrompt: 'Example: Help me explain CORS in FastAPI and how I should answer it in an interview.',
    emptyTitle: 'No conversation yet',
    emptyBody: 'Start with a text question or upload a DOCX so the AI can analyze the content for you.',
    quoteReady: 'The highlighted excerpt has been added to your prompt.',
    quotePlaceholder: 'Follow-up excerpt',
    docxReady: 'DOCX ready to send',
    docxHint: 'DOCX up to 10MB is supported now. PDF can come later.',
    invalidDocxType: 'Only DOCX files are supported in QnA right now.',
    invalidDocxSize: 'The DOCX file exceeds the 10MB limit.',
    askPlaceholder: 'Ask anything about an answer, the rubric, or content from a DOCX...',
    attachDocx: 'Attach DOCX',
    removeDocx: 'Remove DOCX',
    send: 'Send question',
    sending: 'AI is responding...',
    loadingThread: 'Loading your QnA thread...',
    sendFailed: 'Unable to send your question right now.',
    inputRequired: 'Enter a question or attach a DOCX file first.',
    lockedTitle: 'QnA is locked',
    lockedBody: 'The Free plan cannot use QnA. Upgrade to Basic, Pro, or Premium to unlock it.',
    unlockNow: 'Unlock now',
    followUpTemplate: 'Explain this excerpt in Invera rubric style and show how I should answer it better:',
    user: 'You',
    ai: 'Invera AI',
  },
} as const;

function formatDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

type PersistedQnaState = {
  threadId: string | null;
  messages: QnaMessageOut[];
  draft: string;
  quotedText: string;
};

export default function Qna() {
  const { user, refreshUser } = useAuthContext();
  const { language } = useLanguage();
  const { toast } = useToast();
  const text = copy[language];
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';

  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<QnaMessageOut[]>([]);
  const [message, setMessage] = useState('');
  const [quotedText, setQuotedText] = useState('');
  const [docxFile, setDocxFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const restoredFromCacheRef = useRef(false);
  const canUseQna = user?.is_admin || user?.can_use_qna || false;
  const coachBadgeLabel = user?.plan_tier === 'pro' ? 'Pro' : 'Rubric coach';
  const qnaStorageKey = useMemo(
    () => `invera_qna_state_${user?.id ?? 'guest'}`,
    [user?.id],
  );

  const syncQnaAccess = async () => {
    const latestUser = await refreshUser();
    return Boolean(latestUser?.is_admin || latestUser?.can_use_qna);
  };

  const hasComposerPayload = message.trim().length > 0 || !!docxFile;

  useEffect(() => {
    restoredFromCacheRef.current = false;
    let cancelled = false;
    const loadThread = async () => {
      const latestCanUseQna = await syncQnaAccess();
      if (cancelled) return;

      if (!latestCanUseQna) {
        setLoading(false);
        return;
      }

      try {
        const cached = sessionStorage.getItem(qnaStorageKey);
        if (cached) {
          const parsed = JSON.parse(cached) as PersistedQnaState;
          setThreadId(parsed.threadId ?? null);
          setMessages(Array.isArray(parsed.messages) ? parsed.messages : []);
          setMessage(typeof parsed.draft === 'string' ? parsed.draft : '');
          setQuotedText(typeof parsed.quotedText === 'string' ? parsed.quotedText : '');
          setLoading(false);
          restoredFromCacheRef.current = true;
        }
      } catch {
        sessionStorage.removeItem(qnaStorageKey);
      }

      if (!restoredFromCacheRef.current) {
        setLoading(true);
      }

      try {
        const thread = await qnaApi.getThread();
        if (cancelled) return;
        setThreadId(thread.id);
        setMessages(thread.messages);
      } catch (error) {
        if (error instanceof ApiError && error.status === 403) {
          await refreshUser();
        }
        if (cancelled) return;
        toast({
          title: text.sendFailed,
          description: error instanceof Error ? error.message : undefined,
          variant: 'destructive',
        });
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadThread();
    return () => {
      cancelled = true;
    };
  }, [qnaStorageKey, refreshUser, text.sendFailed, toast]);

  useEffect(() => {
    if (!canUseQna) return;
    const persisted: PersistedQnaState = {
      threadId,
      messages,
      draft: message,
      quotedText,
    };
    sessionStorage.setItem(qnaStorageKey, JSON.stringify(persisted));
  }, [canUseQna, message, messages, qnaStorageKey, quotedText, threadId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  const highlightedSelectionTemplate = useMemo(() => {
    return `${text.followUpTemplate}\n\n"${quotedText}"`;
  }, [quotedText, text.followUpTemplate]);

  const handleDocxChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isDocx =
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      lowerName.endsWith('.docx');
    if (!isDocx) {
      toast({ title: text.invalidDocxType, variant: 'destructive' });
      return;
    }
    if (file.size > DOCX_MAX_BYTES) {
      toast({ title: text.invalidDocxSize, variant: 'destructive' });
      return;
    }

    setDocxFile(file);
    toast({ title: text.docxReady, description: file.name });
  };

  const handleAskAboutSelection = (selectedText: string) => {
    if (!canUseQna) return;
    setQuotedText(selectedText);
    setMessage((current) => current.trim() ? current : `${text.followUpTemplate}\n\n"${selectedText}"`);
    window.setTimeout(() => composerRef.current?.focus(), 0);
    toast({ title: text.quoteReady });
  };

  const handleSend = async () => {
    const latestCanUseQna = await syncQnaAccess();
    if (!latestCanUseQna) {
      toast({ title: text.lockedTitle, description: text.lockedBody, variant: 'destructive' });
      return;
    }
    if (!hasComposerPayload) {
      toast({ title: text.inputRequired, variant: 'destructive' });
      return;
    }

    setSending(true);
    try {
      const result = await qnaApi.sendMessage({
        message: message.trim(),
        selectedText: quotedText.trim() || undefined,
        docx: docxFile,
      });
      setThreadId(result.thread_id);
      setMessages((current) => [...current, result.user_message, result.assistant_message]);
      setMessage('');
      setQuotedText('');
      setDocxFile(null);
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        await refreshUser();
      }
      toast({
        title: text.sendFailed,
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    if (!sending && canUseQna && hasComposerPayload) {
      void handleSend();
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="grid gap-4 xl:grid-cols-[228px_minmax(0,1fr)] 2xl:grid-cols-[240px_minmax(0,1fr)]">
        <Card className="rounded-[28px] border border-border/70 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-5 text-white shadow-[0_24px_72px_-40px_rgba(8,145,178,0.5)]">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-white/10 p-2.5">
              <Sparkles className="h-4.5 w-4.5 text-cyan-200" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-100/80">Invera</p>
              <h1 className="text-[1.75rem] font-semibold tracking-tight">{text.title}</h1>
            </div>
          </div>
          <p className="text-sm leading-6 text-slate-200">{text.subtitle}</p>
          <div className="mt-6 rounded-[24px] border border-white/10 bg-white/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
              <MessageSquareText className="h-4 w-4 text-cyan-200" />
              <span>{text.panelTitle}</span>
            </div>
            <p className="text-sm leading-6 text-slate-300">{text.panelBody}</p>
          </div>
          <div className="mt-4 rounded-[24px] border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm leading-6 text-cyan-50">
            {text.suggestedPrompt}
          </div>
        </Card>

        <Card className="rounded-[32px] border border-border/70 bg-background/95 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.35)]">
          <div className="flex h-[84vh] min-h-[780px] flex-col">
            <div className="border-b border-border/70 px-5 py-4 md:px-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-foreground">{text.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    {threadId ? `Thread ${threadId.slice(0, 8)}` : text.loadingThread}
                  </p>
                </div>
                <Badge variant="secondary" className="rounded-full px-3 py-1">
                  {coachBadgeLabel}
                </Badge>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-5 md:px-6 xl:px-8">
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-3/5 rounded-[28px]" />
                  <Skeleton className="ml-auto h-20 w-2/5 rounded-[28px]" />
                  <Skeleton className="h-64 w-full rounded-[32px]" />
                </div>
              ) : !canUseQna ? (
                <div className="flex h-full min-h-[360px] items-center justify-center">
                  <div className="max-w-lg rounded-[32px] border border-dashed border-border bg-muted/20 px-8 py-10 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
                      <MessageSquareText className="h-6 w-6 text-accent" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">{text.lockedTitle}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{text.lockedBody}</p>
                    <Button asChild className="mt-5 rounded-full px-5">
                      <Link to="/app/upgrade">{text.unlockNow}</Link>
                    </Button>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full min-h-[360px] items-center justify-center">
                  <div className="max-w-lg rounded-[32px] border border-dashed border-border bg-muted/20 px-8 py-10 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
                      <MessageSquareText className="h-6 w-6 text-accent" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">{text.emptyTitle}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{text.emptyBody}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {messages.map((item) => (
                    <div
                      key={item.id}
                      className={cn('flex gap-3', item.role === 'user' ? 'justify-end' : 'justify-start')}
                    >
                      {item.role === 'assistant' && (
                        <Avatar className="mt-1 hidden h-10 w-10 border border-border/70 sm:flex">
                          <AvatarFallback className="bg-accent/10 text-accent">
                            <Sparkles className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}

                      <div
                        className={cn(
                          'space-y-2',
                          item.role === 'user' ? 'max-w-[min(100%,760px)] items-end' : 'w-full max-w-none'
                        )}
                      >
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground/80">
                            {item.role === 'user' ? text.user : text.ai}
                          </span>
                          <span>{formatDateTime(item.created_at, locale)}</span>
                        </div>

                        {item.role === 'assistant' && item.structured_payload ? (
                          <QnaStructuredAnswer
                            answer={item.structured_payload}
                            onAskAboutSelection={handleAskAboutSelection}
                          />
                        ) : (
                          <div
                            className={cn(
                              'rounded-[28px] border px-5 py-4 text-sm leading-7 shadow-sm',
                              item.role === 'user'
                                ? 'border-accent/30 bg-accent text-accent-foreground'
                                : 'border-border/70 bg-background',
                            )}
                          >
                            {item.selected_text && (
                              <div className={cn(
                                'mb-3 rounded-2xl border px-3 py-2 text-xs leading-6',
                                item.role === 'user'
                                  ? 'border-white/20 bg-white/10 text-white/90'
                                  : 'border-border/70 bg-muted/40 text-muted-foreground',
                              )}>
                                {item.selected_text}
                              </div>
                            )}
                            {item.attachment_name && (
                              <div className={cn(
                                'mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium',
                                item.role === 'user'
                                  ? 'bg-white/15 text-white'
                                  : 'bg-accent/10 text-accent',
                              )}>
                                <FileText className="h-3.5 w-3.5" />
                                <span>{item.attachment_name}</span>
                              </div>
                            )}
                            <p>{item.content}</p>
                          </div>
                        )}
                      </div>

                      {item.role === 'user' && (
                        <Avatar className="mt-1 hidden h-10 w-10 border border-border/70 sm:flex">
                          <AvatarImage src={user?.avatar_url ?? undefined} alt={user?.email ?? text.user} />
                          <AvatarFallback>{userInitials(user)}</AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}

                  {sending && (
                    <div className="flex gap-3">
                      <Avatar className="mt-1 hidden h-10 w-10 border border-border/70 sm:flex">
                        <AvatarFallback className="bg-accent/10 text-accent">
                          <Sparkles className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="w-full max-w-none rounded-[28px] border border-border/70 bg-background px-5 py-4 shadow-sm">
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>{text.sending}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={endRef} />
                </div>
              )}
            </div>

            <div className="border-t border-border/70 px-4 py-4 md:px-6 xl:px-8">
              <div className="space-y-3 rounded-[28px] border border-border/70 bg-muted/15 p-3 md:p-4">
                {quotedText && (
                  <div className="flex items-start justify-between gap-3 rounded-2xl border border-info/20 bg-info/5 px-4 py-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-info">{text.quotePlaceholder}</p>
                      <p className="mt-1 text-sm leading-6 text-foreground/90">{quotedText}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={() => setQuotedText('')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {docxFile && (
                  <Alert className="rounded-2xl border-accent/20 bg-accent/5">
                    <FileText className="h-4 w-4" />
                    <AlertTitle>{text.docxReady}</AlertTitle>
                    <AlertDescription className="flex items-center justify-between gap-3">
                      <span>{docxFile.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto px-2 py-1"
                        onClick={() => setDocxFile(null)}
                      >
                        {text.removeDocx}
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                <Textarea
                  ref={composerRef}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  placeholder={quotedText ? highlightedSelectionTemplate : text.askPlaceholder}
                  disabled={!canUseQna}
                  className="min-h-[126px] resize-none rounded-[24px] border-0 bg-background/80 px-4 py-4 text-sm leading-7 shadow-inner focus-visible:ring-2 focus-visible:ring-accent"
                />

                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="hidden"
                      onChange={handleDocxChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full"
                      disabled={!canUseQna}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="mr-2 h-4 w-4" />
                      {text.attachDocx}
                    </Button>
                    <span className="text-xs text-muted-foreground">{text.docxHint}</span>
                  </div>

                  <Button
                    type="button"
                    className="rounded-full px-5"
                    disabled={!canUseQna || !hasComposerPayload || sending}
                    onClick={handleSend}
                  >
                    {sending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {text.sending}
                      </>
                    ) : (
                      <>
                        <SendHorizonal className="mr-2 h-4 w-4" />
                        {text.send}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
