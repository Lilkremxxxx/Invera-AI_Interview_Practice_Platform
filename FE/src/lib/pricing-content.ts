export type PricingLanguage = 'vi' | 'en';

export const pricingPlanContent = {
  free: {
    description: {
      vi: 'Thử nghiệm nền tảng trước khi trả phí.',
      en: 'Try the platform before committing to a paid plan.',
    },
    targetUsers: {
      vi: [
        'Muốn trải nghiệm trước khi trả tiền',
        'Chỉ cần một bài phỏng vấn thử',
        'Đang tìm hiểu vai trò hoặc cấp độ mới',
      ],
      en: [
        'Want to try the experience before paying',
        'Only need one mock interview',
        'Are exploring a new role or level',
      ],
    },
    features: {
      vi: [
        '1 phiên duy nhất',
        '1 vai trò / 1 cấp độ',
        'Phỏng vấn AI giọng nói cơ bản',
        'Chấm điểm rubric cơ bản',
        'Báo cáo tóm tắt ngắn',
      ],
      en: [
        '1 session total',
        '1 role / 1 level',
        'Basic voice AI interview',
        'Basic rubric scoring',
        'Short summary report',
      ],
    },
    cta: { vi: 'Bắt đầu miễn phí', en: 'Start for free' },
  },
  basic: {
    description: {
      vi: 'Luyện tập linh hoạt theo từng phiên.',
      en: 'Flexible practice designed around individual sessions.',
    },
    targetUsers: {
      vi: [
        'Thích trả tiền theo phiên, không cam kết dài hạn',
        'Đang chuẩn bị cho một cuộc phỏng vấn sắp tới',
        'Cần phản hồi nhanh về cấu trúc và câu trả lời',
        'Muốn luyện tập linh hoạt theo nhu cầu',
      ],
      en: [
        'Prefer session-based value without a long commitment',
        'Are preparing for an upcoming interview',
        'Need quick feedback on answer structure and clarity',
        'Want flexible practice when you need it',
      ],
    },
    features: {
      vi: [
        'Phỏng vấn AI giọng nói (chọn vai trò & cấp độ)',
        'Câu hỏi hành vi + kỹ thuật',
        'Chấm điểm theo rubric',
        'Báo cáo tóm tắt phiên',
        'Lịch sử 30 ngày',
        'So sánh điểm giữa các phiên',
      ],
      en: [
        'Voice AI interviews with role and level selection',
        'Behavioral and technical question sets',
        'Rubric-based scoring',
        'Session summary reports',
        '30-day session history',
        'Compare scores across sessions',
      ],
    },
    cta: { vi: 'Chọn Basic', en: 'Choose Basic' },
  },
  pro: {
    description: {
      vi: 'Cải thiện có hệ thống với phân tích nâng cao.',
      en: 'Improve systematically with deeper analytics and review.',
    },
    targetUsers: {
      vi: [
        'Đang ứng tuyển nhiều công ty cùng lúc',
        'Muốn cải thiện đo lường được theo thời gian',
        'Cần phân tích chi tiết và theo dõi hiệu suất',
        'Luyện tập vài lần mỗi tuần',
      ],
      en: [
        'Are applying to multiple companies at once',
        'Want measurable improvement over time',
        'Need deeper analysis and performance tracking',
        'Practice several times each week',
      ],
    },
    features: {
      vi: [
        'Lịch sử phiên không giới hạn',
        'Phân tích hiệu suất chi tiết',
        'Bảng theo dõi tiến độ',
        'Phản hồi có cấu trúc nâng cao',
        'Xuất báo cáo PDF',
        'AI điều chỉnh độ khó',
        'Bộ câu hỏi theo công ty',
      ],
      en: [
        'Unlimited session history',
        'Detailed performance analytics',
        'Progress dashboard',
        'Advanced structured feedback',
        'PDF report export',
        'Adaptive AI difficulty',
        'Company-specific question packs',
      ],
    },
    cta: { vi: 'Chọn Pro', en: 'Choose Pro' },
  },
  premium: {
    description: {
      vi: 'Hỗ trợ tối đa với AI + mentor thực để sẵn sàng phỏng vấn.',
      en: 'Maximum support with AI plus real mentor guidance.',
    },
    targetUsers: {
      vi: [
        'Đang nhắm đến vai trò senior hoặc cạnh tranh cao',
        'Muốn phản hồi thời gian thực từ mentor',
        'Cần chiến lược cá nhân hóa dựa trên CV',
        'Muốn tỷ lệ sẵn sàng phỏng vấn cao nhất',
      ],
      en: [
        'Are targeting senior or highly competitive roles',
        'Want real-time mentor feedback',
        'Need personalized strategy based on your resume',
        'Want the highest interview-readiness support',
      ],
    },
    features: {
      vi: [
        'Chế độ phỏng vấn kết hợp (AI + mentor)',
        'Mentor quan sát và can thiệp khi cần',
        'Phản hồi định tính thời gian thực',
        'Chiến lược cải thiện cá nhân hóa',
        'Tùy chỉnh câu hỏi theo CV',
        'Đánh giá sẵn sàng phỏng vấn',
        'Lên lịch ưu tiên',
      ],
      en: [
        'Hybrid interview mode with AI and mentor',
        'Mentor observation and intervention when needed',
        'Real-time qualitative feedback',
        'Personalized improvement strategy',
        'Resume-tailored questions',
        'Interview-readiness assessment',
        'Priority scheduling',
      ],
    },
    cta: { vi: 'Chọn Premium', en: 'Choose Premium' },
  },
} as const;
