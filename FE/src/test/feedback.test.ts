import { describe, it, expect } from 'vitest';
import { parseStructuredFeedback } from '../lib/feedback';

describe('parseStructuredFeedback', () => {
  it('should parse standard assessments correctly', () => {
    const feedback = `
Tóm tắt: Câu trả lời tốt.
Tiêu chí chấm:
- Domain Knowledge & Technical Accuracy - strong: Trích dẫn: “logic” | Đánh giá: Rất chính xác. | Thiếu: Không có.
- Problem Decomposition & Reasoning - mixed: Trích dẫn: “chia nhỏ” | Đánh giá: Tương đối tốt.
- Design, Implementation & Trade-offs - weak: Trích dẫn: “if-else” | Đánh giá: Sơ sài.
    `.trim();

    const parsed = parseStructuredFeedback(feedback);
    expect(parsed.isStructured).toBe(true);
    expect(parsed.summary).toBe('Câu trả lời tốt.');
    expect(parsed.criteria).toHaveLength(3);

    expect(parsed.criteria[0]).toEqual({
      title: 'Domain Knowledge & Technical Accuracy',
      assessment: 'strong',
      quote: '“logic”',
      evidence: 'Rất chính xác.',
      missing: 'Không có.',
    });

    expect(parsed.criteria[1]).toEqual({
      title: 'Problem Decomposition & Reasoning',
      assessment: 'mixed',
      quote: '“chia nhỏ”',
      evidence: 'Tương đối tốt.',
      missing: undefined,
    });

    expect(parsed.criteria[2]).toEqual({
      title: 'Design, Implementation & Trade-offs',
      assessment: 'weak',
      quote: '“if-else”',
      evidence: 'Sơ sài.',
      missing: undefined,
    });
  });

  it('should parse extended assessments (fails, meets, excellent) and map them correctly', () => {
    const feedback = `
Tóm tắt: Cần cải thiện một số chỗ.
Tiêu chí chấm:
- Design, Implementation & Trade-offs - fails: Trích dẫn: “if (score >= 50)” | Đánh giá: Ví dụ quá đơn giản. | Thiếu: Cần so sánh logic && với & (bitwise).
- Domain Knowledge & Technical Accuracy - meets: Trích dẫn: “cache” | Đánh giá: Đúng lý thuyết.
- Technical Communication - excellent: Trích dẫn: “trình bày” | Đánh giá: Rất rõ ràng mạch lạc.
    `.trim();

    const parsed = parseStructuredFeedback(feedback);
    expect(parsed.isStructured).toBe(true);
    expect(parsed.summary).toBe('Cần cải thiện một số chỗ.');
    expect(parsed.criteria).toHaveLength(3);

    // fails -> weak
    expect(parsed.criteria[0]).toEqual({
      title: 'Design, Implementation & Trade-offs',
      assessment: 'weak',
      quote: '“if (score >= 50)”',
      evidence: 'Ví dụ quá đơn giản.',
      missing: 'Cần so sánh logic && với & (bitwise).',
    });

    // meets -> mixed
    expect(parsed.criteria[1]).toEqual({
      title: 'Domain Knowledge & Technical Accuracy',
      assessment: 'mixed',
      quote: '“cache”',
      evidence: 'Đúng lý thuyết.',
      missing: undefined,
    });

    // excellent -> strong
    expect(parsed.criteria[2]).toEqual({
      title: 'Technical Communication',
      assessment: 'strong',
      quote: '“trình bày”',
      evidence: 'Rất rõ ràng mạch lạc.',
      missing: undefined,
    });
  });
});
