import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { parseStructuredFeedback } from '../lib/feedback';
import EvaluationReport from '../components/feedback/EvaluationReport';

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

  it('should parse quick summary into summary and gaps bullets', () => {
    const feedback = `
Tóm tắt: Ứng viên trả lời đúng ý chính về dropna().
Thiếu / còn yếu: Chưa nói về axis, how, thresh và tác động khi xóa dữ liệu.
Tiêu chí chấm:
- Technical Communication - mixed: Đánh giá: Trình bày ngắn gọn.
    `.trim();

    const parsed = parseStructuredFeedback(feedback);
    expect(parsed.isStructured).toBe(true);
    expect(parsed.summary).toBe('Ứng viên trả lời đúng ý chính về dropna().');
    expect(parsed.summaryGaps).toBe('Chưa nói về axis, how, thresh và tác động khi xóa dữ liệu.');
  });

  it('should strip evidence confidence suffixes from evidence text', () => {
    const feedback = `
Tóm tắt: Giao tiếp nhìn chung ổn.
Tiêu chí chấm:
- Communication - strong: Đánh giá: Video telemetry cho thấy giao tiếp bằng mắt tốt (gazeRatio 0.94), ít căng thẳng (avgTensionScore 0.07). (Mức tin cậy bằng chứng: Cao)
    `.trim();

    const parsed = parseStructuredFeedback(feedback);
    expect(parsed.criteria[0]?.evidence).toBe(
      'Video telemetry cho thấy giao tiếp bằng mắt tốt (gazeRatio 0.94), ít căng thẳng (avgTensionScore 0.07).'
    );
  });

  it('renders Pace and Fillers badges from Vietnamese verbal delivery variants', () => {
    render(
      React.createElement(EvaluationReport, {
        report: `
### 2. Verbal Delivery
- Tốc độ nói: 128 từ/phút
- Tổng số từ đệm: 4
- Tổng số khoảng dừng dài: 2
        `.trim(),
      })
    );

    expect(screen.getByText('2. Verbal Delivery')).toBeTruthy();
    expect(screen.getByText('Pace')).toBeTruthy();
    expect(screen.getByText('128 WPM')).toBeTruthy();
    expect(screen.getByText('Fillers')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
  });

  it('extracts the explicit overall score and renders the compact score block', () => {
    render(
      React.createElement(EvaluationReport, {
        report: `
### 4. Overall Presentation Score
*Điểm: 65/100
**Cộng:**
- Không có khoảng dừng dài
- Câu trả lời câu 3 có nội dung tốt
**Trừ:**
- Lỗi mic ở câu 1 (không trả lời được)
- Độ lắc đầu cao (0.8) và tỉ lệ chớp mắt cao (4%) thể hiện căng thẳng
- Mức hoàn tất 100% ở phần khác không được tính nhầm vào điểm
        `.trim(),
      })
    );

    expect(screen.getByText('4. Overall Presentation Score')).toBeTruthy();
    expect(screen.getByText('Điểm:')).toBeTruthy();
    expect(screen.getByText('65/100')).toBeTruthy();
    expect(screen.getByText('Cộng:')).toBeTruthy();
    expect(screen.getByText('Trừ:')).toBeTruthy();
    expect(screen.getByText('65')).toBeTruthy();
  });
});
