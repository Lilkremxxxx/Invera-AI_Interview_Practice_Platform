import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Eye,
  MessageSquareText,
  Star,
  TrendingUp,
  BrainCircuit,
  Sparkles,
  Target,
  BarChart3,
  Zap,
  AlertTriangle,
  Camera,
  Mic,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Parser ──────────────────────────────────────────────────────────────────
interface ParsedSection {
  title: string;
  icon: React.ReactNode;
  lines: string[];
  color: string;
}

function parseEvaluationReport(text: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  const sectionConfigs = [
    { keyword: '1. Visual Delivery', icon: <Eye className="w-4 h-4 text-sky-600" />, color: 'from-sky-50/80 to-sky-100/40 border-sky-200/50' },
    { keyword: '2. Verbal Delivery', icon: <Mic className="w-4 h-4 text-violet-600" />, color: 'from-violet-50/80 to-violet-100/40 border-violet-200/50' },
    { keyword: '3. Interview Performance', icon: <BrainCircuit className="w-4 h-4 text-orange-600" />, color: 'from-orange-50/80 to-orange-100/40 border-orange-200/50' },
    { keyword: '4. Overall Presentation Score', icon: <BarChart3 className="w-4 h-4 text-emerald-600" />, color: 'from-emerald-50/80 to-emerald-100/40 border-emerald-200/50' },
    { keyword: '5. Strengths & Areas', icon: <Target className="w-4 h-4 text-rose-600" />, color: 'from-rose-50/80 to-rose-100/40 border-rose-200/50' },
    { keyword: '6. Before / After', icon: <TrendingUp className="w-4 h-4 text-indigo-600" />, color: 'from-indigo-50/80 to-indigo-100/40 border-indigo-200/50' },
  ];

  const lines = text.split('\n');
  let currentSection: ParsedSection | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = sectionConfigs.find((cfg) => trimmed.startsWith(`### ${cfg.keyword}`) || trimmed.startsWith(`## ${cfg.keyword}`) || trimmed.startsWith(cfg.keyword));
    if (match) {
      if (currentSection) sections.push(currentSection);
      currentSection = { title: match.keyword, icon: match.icon, lines: [], color: match.color };
      continue;
    }

    if (currentSection) {
      // Clean the line: remove heading markers, but keep list markers for rendering.
      let clean = trimmed.replace(/^#{1,3}\s*/, '').trim();
      if (clean) currentSection.lines.push(clean);
    }
  }
  if (currentSection) sections.push(currentSection);

  // Fallback: if parser didn't match, just return one section with everything
  if (sections.length === 0) {
    sections.push({
      title: 'Report',
      icon: <Sparkles className="w-4 h-4" />,
      lines: lines.filter((l) => l.trim()),
      color: 'from-gray-50/80 to-gray-100/40 border-gray-200/50',
    });
  }

  return sections;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function parseBold(str: string): React.ReactNode {
  const normalized = str.replace(/^\*(?!\s)/, '').trim();
  const parts = normalized.split('**');
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-foreground">
        {part}
      </strong>
    ) : (
      part
    )
  );
}

function normalizeLine(line: string): string {
  return line.replace(/^\*(?!\s)/, '').trim();
}

function stripBulletMarker(line: string): string {
  return normalizeLine(line).replace(/^[\*\-]\s+/, '').trim();
}

function extractScore(section: ParsedSection): number | null {
  const normalizedLines = section.lines.map(normalizeLine);
  const explicitScoreLine = normalizedLines.find((line) => /^(?:Điểm|Score)\s*:/i.test(line));
  const linesToScan = explicitScoreLine ? [explicitScoreLine] : normalizedLines;

  for (const line of linesToScan) {
    const cleaned = stripBulletMarker(line);
    const scoreLabelMatch = cleaned.match(/^(?:Điểm|Score)\s*:\s*(\d{1,3})\s*\/\s*100\b/i);
    if (scoreLabelMatch) return Math.min(100, parseInt(scoreLabelMatch[1]));

    const scoreLabelPctMatch = cleaned.match(/^(?:Điểm|Score)\s*:\s*(\d{1,3})\s*%/i);
    if (scoreLabelPctMatch) return Math.min(100, parseInt(scoreLabelPctMatch[1]));

    const matches = cleaned.match(/(\d{1,3})\s*\/\s*10\b/);
    if (matches) return Math.min(100, parseInt(matches[1]) * 10);

    const pct = cleaned.match(/(\d{1,3})\s*\/\s*100\b/);
    if (pct) return Math.min(100, parseInt(pct[1]));

    const raw = cleaned.match(/(\d{1,3})\s*%/);
    if (raw) return Math.min(100, parseInt(raw[1]));
  }
  return null;
}

function extractMetricBadges(lines: string[]): { label: string; value: string; color: string }[] {
  const badges: { label: string; value: string; color: string }[] = [];
  for (const line of lines) {
    // Gaze: "45% thời gian"
    const gazeMatch = line.match(/mắt.*?(\d+)%/i);
    if (gazeMatch) badges.push({ label: 'Eye Contact', value: `${gazeMatch[1]}%`, color: gazeMatch[1] >= '60' ? 'bg-emerald-100/80 text-emerald-700 border border-emerald-200/60' : 'bg-amber-100/80 text-amber-700 border border-amber-200/60' });
    // Smile
    const smileMatch = line.match(/(?:Smile|thân thiện|Friendly).*?(\d+)%/i);
    if (smileMatch) badges.push({ label: 'Smile', value: `${smileMatch[1]}%`, color: smileMatch[1] >= '15' ? 'bg-emerald-100/80 text-emerald-700 border border-emerald-200/60' : 'bg-amber-100/80 text-amber-700 border border-amber-200/60' });
    // Posture
    const postureMatch = line.match(/(?:Posture|tư thế).*?(\d+)%/i);
    if (postureMatch) badges.push({ label: 'Posture', value: `${postureMatch[1]}%`, color: postureMatch[1] >= '70' ? 'bg-emerald-100/80 text-emerald-700 border border-emerald-200/60' : 'bg-amber-100/80 text-amber-700 border border-amber-200/60' });
    // Pace / WPM
    const paceMatch = line.match(
      /(\d+(?:\.\d+)?)\s*(?:WPM|words?\s*per\s*minute|từ\s*\/\s*phút|từ\s*phút|minutes?\s*per\s*word)/i
    );
    if (paceMatch) {
      const wpm = Math.round(parseFloat(paceMatch[1]));
      badges.push({ label: 'Pace', value: `${wpm} WPM`, color: wpm >= 90 && wpm <= 150 ? 'bg-emerald-100/80 text-emerald-700 border border-emerald-200/60' : 'bg-amber-100/80 text-amber-700 border border-amber-200/60' });
    }
    // Filler words
    const fillerMatch = line.match(/(?:Filler(?:\s*Words?)?|Từ\s*(?:thừa|đệm)|Fillers?)/i);
    const fillerValueMatch = line.match(/(\d+)/);
    if (fillerMatch && fillerValueMatch) {
      const fillerCount = parseInt(fillerValueMatch[1]);
      badges.push({ label: 'Fillers', value: fillerValueMatch[1], color: fillerCount <= 8 ? 'bg-emerald-100/80 text-emerald-700 border border-emerald-200/60' : 'bg-amber-100/80 text-amber-700 border border-amber-200/60' });
    }
    // Pauses
    const pauseMatch = line.match(/(?:Pause(?:s)?|Long\s*Pauses?|khoảng\s*dừng).*?(\d+)/i);
    if (pauseMatch) badges.push({ label: 'Pauses', value: pauseMatch[1], color: parseInt(pauseMatch[1]) <= 3 ? 'bg-emerald-100/80 text-emerald-700 border border-emerald-200/60' : 'bg-amber-100/80 text-amber-700 border border-amber-200/60' });
    // Blink
    const blinkMatch = line.match(/(?:Blink|chớp mắt).*?(\d+)%/i);
    if (blinkMatch) badges.push({ label: 'Blink', value: `${blinkMatch[1]}%`, color: parseInt(blinkMatch[1]) <= 7 ? 'bg-emerald-100/80 text-emerald-700 border border-emerald-200/60' : 'bg-amber-100/80 text-amber-700 border border-amber-200/60' });
    // Tension
    const tensionMatch = line.match(/(?:Tension|căng thẳng).*?(\d+)%/i);
    if (tensionMatch) badges.push({ label: 'Tension', value: `${tensionMatch[1]}%`, color: parseInt(tensionMatch[1]) <= 25 ? 'bg-emerald-100/80 text-emerald-700 border border-emerald-200/60' : 'bg-rose-100/80 text-rose-700 border border-rose-200/60' });
    // Head Yaw
    const yawMatch = line.match(/(?:Head Yaw|lắc đầu).*?(\d+\.?\d*)/i);
    if (yawMatch) badges.push({ label: 'Head Move', value: yawMatch[1], color: parseFloat(yawMatch[1]) <= 5 ? 'bg-emerald-100/80 text-emerald-700 border border-emerald-200/60' : 'bg-amber-100/80 text-amber-700 border border-amber-200/60' });
  }
  return badges;
}

// ─── MetricBadge ─────────────────────────────────────────────────────────────
const MetricBadge: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium', color)}>
    <span className="opacity-70">{label}</span>
    <span className="font-bold">{value}</span>
  </div>
);

// ─── ScoreGauge ──────────────────────────────────────────────────────────────
const ScoreGauge: React.FC<{ score: number; label?: string }> = ({ score, label }) => {
  const clamped = Math.min(100, Math.max(0, score));
  const color =
    clamped >= 80 ? 'stroke-emerald-400' : clamped >= 55 ? 'stroke-amber-400' : 'stroke-rose-400';
  const textColor =
    clamped >= 80 ? 'text-emerald-600' : clamped >= 55 ? 'text-amber-600' : 'text-rose-600';

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--muted))" strokeWidth="5" />
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeDasharray={`${(clamped / 100) * 176} 176`}
            strokeLinecap="round"
            className={color}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-lg font-bold ${textColor}`}>{clamped}</span>
        </div>
      </div>
      {label && <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>}
    </div>
  );
};

// ─── SectionCard ─────────────────────────────────────────────────────────────
const SectionCard: React.FC<{ section: ParsedSection }> = ({ section }) => {
  const badges = extractMetricBadges(section.lines);
  const score = extractScore(section);
  const isScoreSection = section.title.includes('Score');
  const renderLine = (line: string) => {
    const normalized = normalizeLine(line);
    const clean = stripBulletMarker(normalized);
    const plain = clean.replace(/^\*+/, '').replace(/\*+$/, '').trim();
    const scoreMatch = plain.match(/^(Điểm|Score)\s*:\s*(.+)$/i);
    const isHeadingLine = /^(?:Cộng|Trừ|Pros?|Cons?|Ưu điểm|Điểm mạnh|Cần cải thiện|Strengths|Areas to Improve)\s*:?\s*$/i.test(plain);
    const isBulletLine = normalized.startsWith('- ') || normalized.startsWith('* ');

    if (scoreMatch) {
      return (
        <p className="text-sm leading-snug text-foreground">
          <strong className="font-semibold text-foreground">{scoreMatch[1]}:</strong> {parseBold(scoreMatch[2])}
        </p>
      );
    }

    if (isHeadingLine) {
      return <p className="text-sm font-semibold leading-snug text-foreground">{parseBold(plain)}</p>;
    }

    if (isBulletLine) {
      return (
        <div className="flex gap-2 pl-1">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/60" />
          <p className="text-sm leading-snug text-muted-foreground">{parseBold(plain)}</p>
        </div>
      );
    }

    return (
      <p className="text-sm leading-snug text-muted-foreground">
        {parseBold(plain)}
      </p>
    );
  };

  return (
    <Card className={cn('rounded-2xl border bg-gradient-to-br overflow-hidden', section.color)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-bold">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-background/80 shadow-sm">
            {section.icon}
          </div>
          <span>{section.title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isScoreSection && score !== null && (
          <div className="flex justify-center py-2">
            <ScoreGauge score={score} label="Overall Score" />
          </div>
        )}

        {badges.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {badges.map((b, i) => (
              <MetricBadge key={i} {...b} />
            ))}
          </div>
        )}

        {isScoreSection ? (
          <div className="rounded-2xl border border-white/60 bg-background/60 px-4 py-3 shadow-sm space-y-1.5">
            {section.lines.map((line, i) => {
              const alreadyBadged = badges.some((b) => line.includes(b.label) || line.includes(b.value));
              if (alreadyBadged && badges.length > 0 && line.length < 60) return null;
              return (
                <div key={i} className="text-sm leading-snug">
                  {renderLine(line)}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-1.5">
            {section.lines.map((line, i) => {
              // Skip lines already captured as badges
              const alreadyBadged = badges.some((b) => line.includes(b.label) || line.includes(b.value));
              if (alreadyBadged && badges.length > 0 && line.length < 60) return null;

              // Detect strength vs area-to-improve
              const normalized = normalizeLine(line);
              const isPositive =
                normalized.startsWith('Điểm mạnh') ||
                normalized.startsWith('Strengths') ||
                normalized.startsWith('Tốt') ||
                normalized.startsWith('Rất tốt') ||
                (normalized.toLowerCase().includes('improvement') === false &&
                  (normalized.includes('tốt') || normalized.includes('mạnh') || normalized.includes('duy trì') || (normalized.includes('rất') && normalized.includes('ấn tượng'))));
              const isWarning =
                normalized.startsWith('Cần') ||
                normalized.startsWith('Hãy') ||
                normalized.startsWith('Nên') ||
                normalized.toLowerCase().includes('cải thiện') ||
                normalized.toLowerCase().includes('cần lưu ý') ||
                normalized.toLowerCase().includes('cần khắc phục');

              return (
                <div
                  key={i}
                  className={cn(
                    'rounded-xl px-3.5 py-2.5 text-xs leading-relaxed',
                    isPositive
                      ? 'bg-emerald-50/80 border border-emerald-200/50'
                      : isWarning
                      ? 'bg-amber-50/80 border border-amber-200/50'
                      : ''
                  )}
                >
                  {normalizeLine(line).startsWith('- ') || normalizeLine(line).startsWith('* ') ? (
                    <li className="ml-4 list-disc text-muted-foreground">{parseBold(stripBulletMarker(line))}</li>
                  ) : (
                    <p className={cn('text-muted-foreground', isPositive && 'text-emerald-700', isWarning && 'text-amber-700')}>
                      {parseBold(line)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
interface EvaluationReportProps {
  report: string;
}

const EvaluationReport: React.FC<EvaluationReportProps> = ({ report }) => {
  const sections = parseEvaluationReport(report);

  if (!report || sections.length === 0) return null;

  return (
    <div className="space-y-4">
      {sections.map((section, idx) => (
        <SectionCard key={idx} section={section} />
      ))}
    </div>
  );
};

export default EvaluationReport;
