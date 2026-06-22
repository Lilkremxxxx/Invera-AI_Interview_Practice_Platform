export type FeedbackAssessment = 'strong' | 'mixed' | 'weak' | null;

export interface FeedbackCriterion {
  title: string;
  assessment: FeedbackAssessment;
  quote?: string;
  evidence: string;
  missing?: string;
}

export interface ParsedFeedback {
  language: 'vi' | 'en';
  summary?: string;
  summaryGaps?: string;
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
  gaps: ['Thiếu / còn yếu', 'Điểm cần cải thiện', 'Gaps'],
  improvements: ['Ưu tiên cải thiện', 'Priority improvements'],
  betterOutline: ['Khung trả lời tốt hơn', 'Stronger answer outline'],
  followUp: ['Câu hỏi follow-up', 'Follow-up questions'],
};

const SUMMARY_HEADERS = ['Tóm tắt', 'Summary'];
const SUMMARY_GAPS_HEADERS = ['Thiếu / còn yếu', 'Gaps'];

function stripEvidenceConfidence(text: string | undefined): string {
  if (!text) return '';
  return text
    .replace(/\s*\((?:Mức tin cậy bằng chứng|Evidence confidence):\s*[^)]+\)\s*$/i, '')
    .trim();
}

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
  const match = trimmed.match(/^(.*?)\s*-\s*(strong|mixed|weak|fails|meets|excellent|good|fail|pass|borderline):\s*(.*?)(?:\s*\|\s*(.*))?$/i);
  if (!match) {
    return {
      title: trimmed,
      assessment: null,
      evidence: '',
    };
  }

  const details = [match[3], match[4]]
    .filter(Boolean)
    .join(' | ')
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);
  const quote = details
    .find((part) => /^(Trích dẫn|Quote):/i.test(part))
    ?.replace(/^(Trích dẫn|Quote):\s*/i, '')
    .trim();
  const evaluation = details
    .find((part) => /^(Đánh giá|Evaluation):/i.test(part))
    ?.replace(/^(Đánh giá|Evaluation):\s*/i, '')
    .trim();
  const missing = details
    .find((part) => /^(Thiếu|Missing):/i.test(part))
    ?.replace(/^(Thiếu|Missing):\s*/i, '')
    .trim();

  let assessment: FeedbackAssessment = null;
  const rawAssessment = match[2].toLowerCase();
  if (['strong', 'excellent', 'good', 'pass'].includes(rawAssessment)) {
    assessment = 'strong';
  } else if (['mixed', 'meets', 'borderline'].includes(rawAssessment)) {
    assessment = 'mixed';
  } else if (['weak', 'fails', 'fail'].includes(rawAssessment)) {
    assessment = 'weak';
  }

  return {
    title: match[1].trim(),
    assessment,
    quote,
    evidence: stripEvidenceConfidence(evaluation || match[3].trim()),
    missing: missing || undefined,
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

    const summaryGapsMatch = line.match(/^(Thiếu \/ còn yếu|Gaps):\s*(.+)$/);
    if (summaryGapsMatch && SUMMARY_GAPS_HEADERS.includes(summaryGapsMatch[1])) {
      parsed.summaryGaps = summaryGapsMatch[2].trim();
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
