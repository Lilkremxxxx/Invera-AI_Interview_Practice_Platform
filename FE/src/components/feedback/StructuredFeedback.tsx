import {
  AlertCircle,
  CheckCircle2,
  CircleHelp,
  ListChecks,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { parseStructuredFeedback } from '@/lib/feedback';

interface StructuredFeedbackProps {
  feedback: string;
  className?: string;
}

const sectionCopy = {
  vi: {
    strengths: 'Điểm tốt',
    gaps: 'Thiếu / còn yếu',
    improvements: 'Ưu tiên cải thiện',
    outline: 'Khung trả lời tốt hơn',
    followUp: 'Câu hỏi follow-up',
    missing: 'Thiếu',
    noFeedback: 'Chưa có phản hồi chi tiết.',
    strong: 'Tốt',
    mixed: 'Trung bình',
    weak: 'Yếu',
  },
  en: {
    strengths: 'Strengths',
    gaps: 'Gaps',
    improvements: 'Priority improvements',
    outline: 'Stronger answer outline',
    followUp: 'Follow-up questions',
    missing: 'Missing',
    noFeedback: 'No detailed feedback yet.',
    strong: 'Strong',
    mixed: 'Mixed',
    weak: 'Weak',
  },
};

function assessmentClasses(assessment: 'strong' | 'mixed' | 'weak' | null) {
  switch (assessment) {
    case 'strong':
      return 'bg-success/12 text-success border-success/20';
    case 'mixed':
      return 'bg-warning/12 text-warning border-warning/20';
    case 'weak':
      return 'bg-destructive/12 text-destructive border-destructive/20';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

function assessmentLabel(language: 'vi' | 'en', assessment: 'strong' | 'mixed' | 'weak' | null) {
  if (!assessment) {
    return null;
  }
  return sectionCopy[language][assessment];
}

function FeedbackListCard({
  title,
  items,
  icon,
  toneClass,
}: {
  title: string;
  items: string[];
  icon: React.ReactNode;
  toneClass: string;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className={cn('rounded-2xl border p-4 md:p-5', toneClass)}>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        <span>{title}</span>
      </div>
      <ul className="space-y-2 text-sm leading-6 text-foreground/90">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-current opacity-70" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StructuredFeedback({ feedback, className }: StructuredFeedbackProps) {
  const parsed = parseStructuredFeedback(feedback);
  const copy = sectionCopy[parsed.language];

  if (!parsed.isStructured) {
    return (
      <div className={cn('rounded-2xl border bg-muted/30 p-4 text-sm leading-7 text-foreground/90', className)}>
        {parsed.fallbackParagraphs.length > 0 ? parsed.fallbackParagraphs.map((paragraph, index) => (
          <p key={index} className={cn(index > 0 && 'mt-3')}>
            {paragraph}
          </p>
        )) : (
          <p>{feedback || copy.noFeedback}</p>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {parsed.summary && (
        <div className="rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-accent">
            <Sparkles className="h-4 w-4" />
            <span>{parsed.language === 'vi' ? 'Tóm tắt nhanh' : 'Quick summary'}</span>
          </div>
          <p className="text-sm leading-7 text-foreground">
            {parsed.summary}
          </p>
        </div>
      )}

      {parsed.criteria.length > 0 && (
        <div className="rounded-2xl border bg-card/80 p-4 md:p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Target className="h-4 w-4 text-accent" />
            <span>{parsed.language === 'vi' ? 'Tiêu chí chấm' : 'Scoring criteria'}</span>
          </div>
          <div className="grid gap-3">
            {parsed.criteria.map((criterion, index) => (
              <div
                key={`${criterion.title}-${index}`}
                className="rounded-xl border border-border/70 bg-background/80 p-4"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-foreground">{criterion.title}</p>
                  {assessmentLabel(parsed.language, criterion.assessment) && (
                    <Badge
                      variant="outline"
                      className={cn('border text-[11px] font-semibold uppercase tracking-[0.16em]', assessmentClasses(criterion.assessment))}
                    >
                      {assessmentLabel(parsed.language, criterion.assessment)}
                    </Badge>
                  )}
                </div>
                {criterion.evidence && (
                  <p className="text-sm leading-6 text-foreground/90">{criterion.evidence}</p>
                )}
                {criterion.missing && (
                  <div className="mt-3 rounded-lg border border-dashed border-border/70 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{copy.missing}:</span> {criterion.missing}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <FeedbackListCard
          title={copy.strengths}
          items={parsed.strengths}
          icon={<CheckCircle2 className="h-4 w-4 text-success" />}
          toneClass="border-success/20 bg-success/5"
        />
        <FeedbackListCard
          title={copy.gaps}
          items={parsed.gaps}
          icon={<AlertCircle className="h-4 w-4 text-warning" />}
          toneClass="border-warning/20 bg-warning/5"
        />
        <FeedbackListCard
          title={copy.improvements}
          items={parsed.improvements}
          icon={<TrendingUp className="h-4 w-4 text-accent" />}
          toneClass="border-accent/20 bg-accent/5"
        />
        <FeedbackListCard
          title={copy.outline}
          items={parsed.betterOutline}
          icon={<ListChecks className="h-4 w-4 text-info" />}
          toneClass="border-info/20 bg-info/5"
        />
      </div>

      <FeedbackListCard
        title={copy.followUp}
        items={parsed.followUp}
        icon={<CircleHelp className="h-4 w-4 text-foreground" />}
        toneClass="border-border bg-muted/30"
      />
    </div>
  );
}
