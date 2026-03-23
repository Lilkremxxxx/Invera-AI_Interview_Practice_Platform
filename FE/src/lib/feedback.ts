export type FeedbackAssessment = 'strong' | 'mixed' | 'weak' | null;

export interface FeedbackCriterion {
  title: string;
  assessment: FeedbackAssessment;
  evidence: string;
  missing?: string;
}

export interface ParsedFeedback {
  language: 'vi' | 'en';
  summary?: string;
  criteria: FeedbackCriterion[];
  strengths: string[];
  gaps: string[];
  improvements: string[];
  betterOutline: string[];
  followUp: string[];
  fallbackParagraphs: string[];
  isStructured: boolean;
}

type SectionKey =
  | 'criteria'
  | 'strengths'
  | 'gaps'
  | 'improvements'
  | 'betterOutline'
  | 'followUp';

const SECTION_HEADERS: Record<SectionKey, string[]> = {
  criteria: ['Tiêu chí chấm', 'Scoring criteria'],
  strengths: ['Điểm tốt', 'Strengths'],
  gaps: ['Thiếu / còn yếu', 'Gaps'],
  improvements: ['Ưu tiên cải thiện', 'Priority improvements'],
  betterOutline: ['Khung trả lời tốt hơn', 'Stronger answer outline'],
  followUp: ['Câu hỏi follow-up', 'Follow-up questions'],
};

const SUMMARY_HEADERS = ['Tóm tắt', 'Summary'];

function detectLanguage(feedback: string): 'vi' | 'en' {
  if (feedback.includes('Tóm tắt:') || feedback.includes('Tiêu chí chấm:')) {
    return 'vi';
  }
  return 'en';
}

function normalizeHeader(line: string): string {
  return line.trim().replace(/:$/, '');
}

function matchSection(line: string): SectionKey | null {
  const normalized = normalizeHeader(line);
  for (const [section, labels] of Object.entries(SECTION_HEADERS) as [SectionKey, string[]][]) {
    if (labels.includes(normalized)) {
      return section;
    }
  }
  return null;
}

function parseCriterion(line: string): FeedbackCriterion {
  const trimmed = line.replace(/^-+\s*/, '').trim();
  const match = trimmed.match(/^(.*?)\s*-\s*(strong|mixed|weak):\s*(.*?)(?:\s*\|\s*(.*))?$/i);
  if (!match) {
    return {
      title: trimmed,
      assessment: null,
      evidence: '',
    };
  }

  return {
    title: match[1].trim(),
    assessment: match[2].toLowerCase() as FeedbackAssessment,
    evidence: match[3].trim(),
    missing: match[4]?.trim() || undefined,
  };
}

export function parseStructuredFeedback(feedback: string): ParsedFeedback {
  const language = detectLanguage(feedback);
  const lines = feedback
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const parsed: ParsedFeedback = {
    language,
    criteria: [],
    strengths: [],
    gaps: [],
    improvements: [],
    betterOutline: [],
    followUp: [],
    fallbackParagraphs: [],
    isStructured: false,
  };

  let currentSection: SectionKey | null = null;

  for (const line of lines) {
    const summaryMatch = line.match(/^(Tóm tắt|Summary):\s*(.+)$/);
    if (summaryMatch && SUMMARY_HEADERS.includes(summaryMatch[1])) {
      parsed.summary = summaryMatch[2].trim();
      parsed.isStructured = true;
      currentSection = null;
      continue;
    }

    const section = matchSection(line);
    if (section) {
      currentSection = section;
      parsed.isStructured = true;
      continue;
    }

    if (!currentSection) {
      parsed.fallbackParagraphs.push(line);
      continue;
    }

    const content = line.replace(/^-+\s*/, '').trim();
    if (!content) {
      continue;
    }

    switch (currentSection) {
      case 'criteria':
        parsed.criteria.push(parseCriterion(line));
        break;
      case 'strengths':
        parsed.strengths.push(content);
        break;
      case 'gaps':
        parsed.gaps.push(content);
        break;
      case 'improvements':
        parsed.improvements.push(content);
        break;
      case 'betterOutline':
        parsed.betterOutline.push(content);
        break;
      case 'followUp':
        parsed.followUp.push(content);
        break;
    }
  }

  return parsed;
}
