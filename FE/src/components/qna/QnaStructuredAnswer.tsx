import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  CircleHelp,
  ListChecks,
  MessageSquareQuote,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { QnaStructuredAnswerOut } from '@/lib/api';
import { cn } from '@/lib/utils';

interface QnaStructuredAnswerProps {
  answer: QnaStructuredAnswerOut;
  onAskAboutSelection: (selectedText: string) => void;
}

const copy = {
  vi: {
    quickTake: 'Tóm tắt nhanh',
    directAnswer: 'Trả lời trực tiếp',
    keyPoints: 'Điểm chính nên nhớ',
    gaps: 'Thiếu / còn yếu',
    strongerAnswer: 'Khung trả lời tốt hơn',
    followUp: 'Bạn có thể hỏi tiếp',
    quoteContext: 'Đoạn bạn đang hỏi',
    attachmentContext: 'Nguồn DOCX',
    askAboutSelection: 'Hỏi AI về đoạn này',
  },
  en: {
    quickTake: 'Quick take',
    directAnswer: 'Direct answer',
    keyPoints: 'Key points to remember',
    gaps: 'Common gaps',
    strongerAnswer: 'Stronger answer outline',
    followUp: 'Helpful follow-up prompts',
    quoteContext: 'Quoted context',
    attachmentContext: 'DOCX source',
    askAboutSelection: 'Ask AI about this',
  },
} as const;

function ListCard({
  title,
  items,
  icon,
  tone,
}: {
  title: string;
  items: string[];
  icon: React.ReactNode;
  tone: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className={cn('rounded-3xl border p-5', tone)}>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        <span>{title}</span>
      </div>
      <ul className="space-y-3 text-sm leading-7 text-foreground/90">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="flex gap-3">
            <span className="mt-3 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-current opacity-70" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function QnaStructuredAnswer({ answer, onAskAboutSelection }: QnaStructuredAnswerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectionMenu, setSelectionMenu] = useState<{ text: string; x: number; y: number } | null>(null);
  const language = answer.language === 'vi' ? 'vi' : 'en';
  const text = copy[language];

  const normalizedTitle = useMemo(() => answer.title?.trim() || (language === 'vi' ? 'Phản hồi từ Invera AI' : 'Invera AI response'), [answer.title, language]);

  useEffect(() => {
    const hide = () => setSelectionMenu(null);
    window.addEventListener('scroll', hide, true);
    document.addEventListener('mousedown', hide);
    return () => {
      window.removeEventListener('scroll', hide, true);
      document.removeEventListener('mousedown', hide);
    };
  }, []);

  const handleSelectionCapture = () => {
    window.setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        setSelectionMenu(null);
        return;
      }

      const selectedText = selection.toString().trim();
      if (!selectedText || selectedText.length < 6) {
        setSelectionMenu(null);
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const container = containerRef.current;
      const anchorNode = selection.anchorNode;
      if (!container || !anchorNode || !container.contains(anchorNode)) {
        setSelectionMenu(null);
        return;
      }

      setSelectionMenu({
        text: selectedText,
        x: rect.left + rect.width / 2,
        y: Math.max(rect.top - 12, 16),
      });
    }, 0);
  };

  const handleAskAboutSelection = () => {
    if (!selectionMenu?.text) return;
    onAskAboutSelection(selectionMenu.text);
    window.getSelection()?.removeAllRanges();
    setSelectionMenu(null);
  };

  return (
    <>
      <div
        ref={containerRef}
        className="space-y-4"
        onMouseUp={handleSelectionCapture}
      >
        <Card className="overflow-hidden rounded-[28px] border border-accent/20 bg-gradient-to-br from-accent/12 via-background to-info/10 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.35)]">
          <div className="border-b border-accent/10 px-5 py-4 md:px-6">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-accent">
              <Sparkles className="h-4 w-4" />
              <span>{text.quickTake}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-xl font-semibold tracking-tight text-foreground">{normalizedTitle}</h3>
              {answer.attachment_name && (
                <Badge variant="secondary" className="rounded-full px-3 py-1">
                  {text.attachmentContext}: {answer.attachment_name}
                </Badge>
              )}
            </div>
            {answer.summary && (
              <p className="mt-3 w-full text-sm leading-7 text-foreground/85">{answer.summary}</p>
            )}
          </div>

          <div className="space-y-5 px-5 py-5 md:px-6">
            {answer.quoted_text && (
              <div className="rounded-2xl border border-border/70 bg-background/75 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <MessageSquareQuote className="h-3.5 w-3.5" />
                  <span>{text.quoteContext}</span>
                </div>
                <p className="text-sm leading-7 text-foreground/85">{answer.quoted_text}</p>
              </div>
            )}

            {answer.direct_answer.length > 0 && (
              <div className="rounded-3xl border border-border/70 bg-background/80 p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Target className="h-4 w-4 text-accent" />
                  <span>{text.directAnswer}</span>
                </div>
                <div className="space-y-3 text-[15px] leading-7 text-foreground/90">
                  {answer.direct_answer.map((paragraph, index) => (
                    <p key={`direct-answer-${index}`}>{paragraph}</p>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-4 xl:grid-cols-2">
              <ListCard
                title={text.keyPoints}
                items={answer.key_points}
                icon={<CheckCircle2 className="h-4 w-4 text-success" />}
                tone="border-success/20 bg-success/5"
              />
              <ListCard
                title={text.gaps}
                items={answer.common_gaps}
                icon={<AlertCircle className="h-4 w-4 text-warning" />}
                tone="border-warning/20 bg-warning/5"
              />
              <ListCard
                title={text.strongerAnswer}
                items={answer.better_answer}
                icon={<TrendingUp className="h-4 w-4 text-info" />}
                tone="border-info/20 bg-info/5"
              />
              <ListCard
                title={text.followUp}
                items={answer.follow_up}
                icon={<CircleHelp className="h-4 w-4 text-accent" />}
                tone="border-accent/20 bg-accent/5"
              />
            </div>
          </div>
        </Card>
      </div>

      {selectionMenu && (
        <div
          className="pointer-events-none fixed z-[60] -translate-x-1/2 -translate-y-full"
          style={{ left: selectionMenu.x, top: selectionMenu.y }}
        >
          <div className="pointer-events-auto rounded-full border border-border bg-background/95 p-1 shadow-lg backdrop-blur">
            <Button
              size="sm"
              className="rounded-full px-4"
              onClick={handleAskAboutSelection}
            >
              <ListChecks className="mr-2 h-4 w-4" />
              {text.askAboutSelection}
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
