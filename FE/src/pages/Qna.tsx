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
    title: 'Hỏi Đáp với AI Rubric',
    subtitle: 'Hỏi bất kỳ điều gì về câu trả lời phỏng vấn, kiến thức kỹ thuật, hoặc tải lên file DOCX để AI giải thích chi tiết theo tiêu chuẩn đánh giá của Invera.',
    panelTitle: 'Hỏi Đáp theo Tiêu Chí Rubric',
    panelBody: 'Trợ lý học tập bám sát phương pháp hướng dẫn của Invera: tập trung vào tính mạch lạc, rõ ràng, đưa ra các ví dụ cụ thể và cách tối ưu hóa câu trả lời thô để giúp bạn sẵn sàng chinh phục nhà tuyển dụng.',
    suggestedPrompt: 'Ví dụ: Giải thích giúp mình CORS trong FastAPI và cách trả lời câu này khi đi phỏng vấn?',
    emptyTitle: 'Bắt đầu cuộc trò chuyện mới',
    emptyBody: 'Hãy gửi một câu hỏi hoặc đính kèm tài liệu DOCX để nhận phản hồi phân tích chi tiết.',
    quoteReady: 'Đã sao chép đoạn trích dẫn vào khung soạn thảo.',
    quotePlaceholder: 'Đoạn trích đang được hỏi tiếp',
    docxReady: 'File DOCX đã được tải lên và sẵn sàng để gửi',
    docxHint: 'Hỗ trợ định dạng DOCX dung lượng tối đa 10MB.',
    invalidDocxType: 'Hệ thống hiện chỉ hỗ trợ file DOCX cho trang Hỏi Đáp (QnA).',
    invalidDocxSize: 'File DOCX vượt quá giới hạn dung lượng 10MB.',
    askPlaceholder: 'Hỏi bất kỳ điều gì về câu trả lời, tiêu chí chấm điểm, hoặc tải lên tài liệu DOCX để bắt đầu...',
    attachDocx: 'Đính kèm DOCX',
    removeDocx: 'Xóa tài liệu',
    send: 'Gửi câu hỏi',
    sending: 'AI đang phân tích và soạn câu trả lời...',
    loadingThread: 'Đang tải lịch sử hội thoại...',
    sendFailed: 'Đã xảy ra lỗi khi gửi câu hỏi.',
    inputRequired: 'Vui lòng nhập nội dung câu hỏi hoặc tải lên tài liệu DOCX.',
    lockedTitle: 'Tính năng Hỏi Đáp (QnA) đã bị khóa',
    lockedBody: 'Gói dùng thử miễn phí không bao gồm quyền truy cập Hỏi Đáp (QnA). Vui lòng nâng cấp lên các gói Basic, Pro hoặc Premium để tiếp tục trải nghiệm.',
    unlockNow: 'Nâng cấp mở khóa ngay',
    followUpTemplate: 'Giải thích chi tiết hơn đoạn này theo tiêu chuẩn đánh giá của Invera và hướng dẫn cách hoàn thiện tốt nhất:',
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
    docxHint: 'DOCX up to 10MB is supported now.',
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

const SUGGESTED_PROMPTS = {
  vi: [
    {
      title: 'FastAPI & CORS',
      prompt: 'Giải thích giúp mình CORS trong FastAPI và cách trả lời câu này khi đi phỏng vấn để ghi điểm tối đa?',
      icon: Sparkles,
    },
    {
      title: 'Tối ưu hóa SQL',
      prompt: 'Làm thế nào để phát hiện và tối ưu hóa các truy vấn SQL chậm trong môi trường production?',
      icon: MessageSquareText,
    },
    {
      title: 'REST API vs GraphQL',
      prompt: 'So sánh REST API và GraphQL. Khi nào một dự án thực tế nên ưu tiên chọn GraphQL thay vì REST?',
      icon: MessageSquareText,
    },
    {
      title: 'Phân tích file DOCX',
      prompt: 'Mình đã đính kèm bản nháp câu trả lời phỏng vấn. Nhờ AI phân tích, chấm điểm theo rubric và đề xuất bản viết lại tốt hơn.',
      icon: FileText,
    },
  ],
  en: [
    {
      title: 'FastAPI & CORS',
      prompt: 'Help me explain CORS in FastAPI and how I should answer it in an interview to get maximum scores.',
      icon: Sparkles,
    },
    {
      title: 'SQL Optimization',
      prompt: 'How do I detect and optimize slow SQL queries in a production database environment?',
      icon: MessageSquareText,
    },
    {
      title: 'REST API vs GraphQL',
      prompt: 'Compare REST API and GraphQL. When should a real production project choose GraphQL over REST?',
      icon: MessageSquareText,
    },
    {
      title: 'Analyze DOCX draft',
      prompt: 'I have attached my draft interview answer. Please analyze it based on the rubric and write a better version.',
      icon: FileText,
    },
  ],
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
  const coachBadgeLabel =
    user?.plan_tier === 'pro'
      ? 'Pro'
      : language === 'vi'
      ? 'Trợ lý Rubric'
      : 'Rubric coach';
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
    <div className="w-full h-[calc(100vh-3.5rem)] lg:h-[calc(100vh-4.5rem)] flex flex-col px-1 sm:px-2 pb-1 sm:pb-2">
      <Card className="flex-1 flex flex-col rounded-[32px] border border-border/70 bg-background/95 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.35)] overflow-hidden min-h-0">
        <div className="flex flex-1 flex-col min-h-0">
          {/* Header */}
          <div className="border-b border-border/70 px-5 py-4 md:px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-cyan-500/10 p-2 text-cyan-600 dark:text-cyan-400">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-foreground">{text.title}</h2>
                  <p className="text-xs text-muted-foreground">
                    {threadId ? `Thread ID: ${threadId.slice(0, 8)}` : text.loadingThread}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="rounded-full px-3 py-1 font-semibold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                {coachBadgeLabel}
              </Badge>
            </div>
          </div>

          {/* Main Area */}
          <div className="flex-1 overflow-y-auto px-4 py-6 md:px-6 bg-slate-50/20 dark:bg-slate-950/20">
            {loading ? (
              <div className="w-full space-y-4">
                <Skeleton className="h-20 w-3/5 rounded-[24px]" />
                <Skeleton className="ml-auto h-16 w-2/5 rounded-[24px]" />
                <Skeleton className="h-48 w-full rounded-[28px]" />
              </div>
            ) : !canUseQna ? (
              <div className="flex h-full min-h-[360px] items-center justify-center">
                <div className="max-w-md w-full rounded-[28px] border border-dashed border-border bg-card/50 px-6 py-8 text-center shadow-sm">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                    <MessageSquareText className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">{text.lockedTitle}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text.lockedBody}</p>
                  <Button asChild className="mt-5 rounded-full px-6 bg-cyan-600 hover:bg-cyan-700 text-white transition-all shadow-md shadow-cyan-600/25">
                    <Link to="/app/upgrade">{text.unlockNow}</Link>
                  </Button>
                </div>
              </div>
            ) : messages.length === 0 ? (
              /* Welcome Panel when there are no messages */
              <div className="flex h-full flex-col justify-center items-center py-6">
                <div className="w-full px-4 text-center space-y-6">
                  {/* Hero Header */}
                  <div className="space-y-3">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25">
                      <Sparkles className="h-7 w-7" />
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                      {language === 'vi' ? 'Trợ lý Hỏi Đáp Rubric' : 'Invera Rubric Coach'}
                    </h3>
                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xl mx-auto">
                      {text.subtitle}
                    </p>
                  </div>

                  {/* Rubric Details Panel */}
                  <div className="rounded-[24px] border border-border bg-card/60 p-5 text-left shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-bold text-foreground mb-2">
                      <MessageSquareText className="h-4.5 w-4.5 text-cyan-500" />
                      <span>{text.panelTitle}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">{text.panelBody}</p>
                  </div>

                  {/* Suggested Prompts Grid */}
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {language === 'vi' ? 'Gợi ý chủ đề thảo luận' : 'Suggested Topics'}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {SUGGESTED_PROMPTS[language].map((item, idx) => {
                        const IconComponent = item.icon;
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              setMessage(item.prompt);
                              window.setTimeout(() => composerRef.current?.focus(), 0);
                            }}
                            className="flex flex-col items-start text-left p-4 rounded-2xl border border-border bg-card hover:bg-muted/40 hover:border-cyan-500/40 transition-all duration-200 group relative shadow-sm"
                          >
                            <div className="flex items-center gap-2 mb-1.5">
                              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 group-hover:bg-cyan-500/20 transition-colors">
                                <IconComponent className="h-3.5 w-3.5" />
                              </div>
                              <span className="text-xs sm:text-sm font-semibold text-foreground group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                                {item.title}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {item.prompt}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Chat Thread Messages List */
              <div className="w-full space-y-6">
                {messages.map((item) => (
                  <div
                    key={item.id}
                    className={cn('flex gap-3', item.role === 'user' ? 'justify-end' : 'justify-start')}
                  >
                    {item.role === 'assistant' && (
                      <Avatar className="mt-1 hidden h-9 w-9 border border-border/70 sm:flex">
                        <AvatarFallback className="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                          <Sparkles className="h-4.5 w-4.5" />
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div
                      className={cn(
                        'space-y-1.5',
                        item.role === 'user' ? 'max-w-[min(100%,720px)] items-end' : 'w-full max-w-none'
                      )}
                    >
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground/80">
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
                            'rounded-[24px] border px-5 py-3.5 text-sm leading-relaxed shadow-sm whitespace-pre-wrap',
                            item.role === 'user'
                              ? 'border-cyan-600 bg-cyan-600 text-white'
                              : 'border-border/80 bg-card text-foreground',
                          )}
                        >
                          {item.selected_text && (
                            <div className={cn(
                              'mb-3 rounded-xl border px-3 py-2 text-xs leading-relaxed',
                              item.role === 'user'
                                ? 'border-white/20 bg-white/10 text-white/90'
                                : 'border-border bg-muted/50 text-muted-foreground',
                            )}>
                              {item.selected_text}
                            </div>
                          )}
                          {item.attachment_name && (
                            <div className={cn(
                              'mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold',
                              item.role === 'user'
                                ? 'bg-white/15 text-white'
                                : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
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
                      <Avatar className="mt-1 hidden h-9 w-9 border border-border/70 sm:flex">
                        <AvatarImage src={user?.avatar_url ?? undefined} alt={user?.email ?? text.user} />
                        <AvatarFallback className="font-semibold bg-muted">{userInitials(user)}</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}

                {sending && (
                  <div className="flex gap-3">
                    <Avatar className="mt-1 hidden h-9 w-9 border border-border/70 sm:flex">
                      <AvatarFallback className="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                        <Sparkles className="h-4.5 w-4.5 animate-pulse" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="w-full max-w-none rounded-[24px] border border-border/70 bg-card px-5 py-4 shadow-sm">
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <Loader2 className="h-4.5 w-4.5 animate-spin text-cyan-500" />
                        <span>{text.sending}</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>
            )}
          </div>

          {/* Composer Input Area */}
          <div className="border-t border-border bg-background/50 backdrop-blur-md px-4 py-4 md:px-6">
            <div className="w-full space-y-3 rounded-[24px] border border-border bg-card shadow-lg p-3 transition-all duration-200 focus-within:border-cyan-500/40 focus-within:shadow-cyan-500/5">
              {quotedText && (
                <div className="flex items-start justify-between gap-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">{text.quotePlaceholder}</p>
                    <p className="mt-0.5 text-xs text-foreground/90 truncate">{quotedText}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-full hover:bg-muted/80"
                    onClick={() => setQuotedText('')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {docxFile && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-cyan-500 shrink-0" />
                    <span className="text-xs font-semibold text-foreground/90 truncate">{docxFile.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-3 py-1 rounded-full text-xs font-medium hover:bg-muted"
                    onClick={() => setDocxFile(null)}
                  >
                    {text.removeDocx}
                  </Button>
                </div>
              )}

              <Textarea
                ref={composerRef}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder={quotedText ? highlightedSelectionTemplate : text.askPlaceholder}
                disabled={!canUseQna}
                className="min-h-[72px] md:min-h-[88px] resize-none rounded-[16px] border-0 bg-transparent px-3 py-2 text-sm leading-relaxed shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
              />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-border/50 pt-3 px-1">
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
                    className="rounded-full h-8 px-4 text-xs font-semibold hover:border-cyan-500/30 hover:bg-cyan-500/5"
                    disabled={!canUseQna}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="mr-1.5 h-3.5 w-3.5" />
                    {text.attachDocx}
                  </Button>
                  <span className="text-[10px] text-muted-foreground">{text.docxHint}</span>
                </div>

                <Button
                  type="button"
                  className="rounded-full h-9 px-5 text-xs font-bold bg-cyan-600 hover:bg-cyan-700 text-white shadow-md shadow-cyan-600/25 transition-all"
                  disabled={!canUseQna || !hasComposerPayload || sending}
                  onClick={handleSend}
                >
                  {sending ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      {text.sending}
                    </>
                  ) : (
                    <>
                      <SendHorizonal className="mr-1.5 h-3.5 w-3.5" />
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
  );
}
