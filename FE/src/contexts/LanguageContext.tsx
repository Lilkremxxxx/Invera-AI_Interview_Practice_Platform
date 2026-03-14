import { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'vi' | 'en';

// ─── Translation dictionary ────────────────────────────────────────────────
export const translations = {
  // ── Navbar ──────────────────────────────────────────────────────────────
  nav: {
    features:    { vi: 'Tính năng',           en: 'Features' },
    pricing:     { vi: 'Bảng giá',            en: 'Pricing' },
    faq:         { vi: 'Câu hỏi thường gặp',  en: 'FAQ' },
    login:       { vi: 'Đăng nhập',           en: 'Log in' },
    signup:      { vi: 'Bắt đầu luyện tập',  en: 'Start practicing' },
  },

  // ── Hero ────────────────────────────────────────────────────────────────
  hero: {
    badge:       { vi: 'Luyện tập phỏng vấn với AI', en: 'AI-Powered Interview Practice' },
    headline1:   { vi: 'Chinh phục buổi phỏng vấn',  en: 'Ace your next' },
    headline2:   { vi: 'tiếp theo với',               en: 'interview with' },
    headline3:   { vi: 'công nghệ AI',                en: 'AI technology' },
    headline4:   { vi: 'tiên tiến',                   en: 'that works' },
    description: {
      vi: 'Nhận phản hồi cá nhân hóa, theo dõi tiến độ và xây dựng sự tự tin với các buổi phỏng vấn mô phỏng thực tế phù hợp với vị trí mục tiêu của bạn.',
      en: 'Get personalized feedback, track your progress, and build confidence with realistic mock interviews tailored to your target role.',
    },
    ctaPrimary:  { vi: 'Bắt đầu luyện tập miễn phí', en: 'Start practicing for free' },
    ctaDemo:     { vi: 'Xem demo',                    en: 'Watch demo' },
    stat1:       { vi: '10.000+ người dùng',          en: '10,000+ users' },
    stat2:       { vi: '500+ câu hỏi',                en: '500+ questions' },
    stat3:       { vi: 'Đánh giá 4.9/5',              en: '4.9/5 rating' },
    mockRole:    { vi: 'Người phỏng vấn AI',          en: 'AI Interviewer' },
    mockType:    { vi: 'Phỏng vấn kỹ thuật',          en: 'Technical Interview' },
    mockQ:       {
      vi: '"Bạn có thể giải thích sự khác biệt giữa REST và GraphQL API không? Khi nào bạn sẽ chọn cái này thay vì cái kia?"',
      en: '"Can you explain the difference between REST and GraphQL APIs? When would you choose one over the other?"',
    },
    mockAnswer:  { vi: 'Câu trả lời của bạn', en: 'Your answer' },
    mockCount:   { vi: 'Câu hỏi 3/10',        en: 'Question 3/10' },
    mockPlaceholder: { vi: 'Nhập hoặc nói câu trả lời của bạn...', en: 'Type or speak your answer...' },
    mockSubmit:  { vi: 'Gửi câu trả lời',     en: 'Submit answer' },
  },

  // ── PainPoints ──────────────────────────────────────────────────────────
  pain: {
    sectionTitle: { vi: 'Tại sao luyện tập phỏng vấn quan trọng', en: 'Why interview practice matters' },
    sectionDesc:  {
      vi: 'Thị trường việc làm rất cạnh tranh. Đừng để việc thiếu chuẩn bị cản trở bạn.',
      en: 'The job market is competitive. Don\'t let lack of preparation hold you back.',
    },
    items: [
      {
        title: { vi: 'Chưa chuẩn bị cho câu hỏi khó', en: 'Unprepared for tough questions' },
        desc:  {
          vi: 'Phỏng vấn thực tế luôn có những câu hỏi bất ngờ. Không có sự luyện tập, ngay cả ứng viên giỏi cũng có thể vấp ngã.',
          en: 'Real interviews always have unexpected questions. Without practice, even strong candidates can stumble.',
        },
      },
      {
        title: { vi: 'Không có thời gian cho phỏng vấn thử', en: 'No time for mock interviews' },
        desc:  {
          vi: 'Việc sắp xếp phỏng vấn thử với bạn bè hoặc người hướng dẫn rất khó. Bạn cần luyện tập phù hợp với lịch trình của mình.',
          en: 'Scheduling mock interviews with friends or coaches is difficult. You need practice that fits your schedule.',
        },
      },
      {
        title: { vi: 'Không có phản hồi', en: 'No structured feedback' },
        desc:  {
          vi: 'Làm sao bạn biết mình đang tiến bộ? Không có phản hồi có cấu trúc, bạn đang luyện tập mù quáng.',
          en: 'How do you know you\'re improving? Without structured feedback, you\'re practicing blind.',
        },
      },
    ],
  },

  // ── HowItWorks ──────────────────────────────────────────────────────────
  how: {
    badge:  { vi: 'Quy trình đơn giản', en: 'Simple process' },
    title:  { vi: 'Cách thức hoạt động', en: 'How it works' },
    desc:   { vi: 'Bắt đầu trong vài phút. Luyện tập nhiều như bạn cần để cảm thấy tự tin.', en: 'Get started in minutes. Practice as much as you need to feel confident.' },
    steps: [
      {
        title: { vi: 'Chọn vị trí của bạn',     en: 'Choose your role' },
        desc:  { vi: 'Chọn từ hơn 10 vị trí công việc và cấp độ kinh nghiệm. Nhận câu hỏi phù hợp với vị trí mục tiêu của bạn.', en: 'Select from 10+ job roles and experience levels. Get questions tailored to your target position.' },
      },
      {
        title: { vi: 'Luyện tập trả lời',        en: 'Practice answering' },
        desc:  { vi: 'Trả lời câu hỏi qua văn bản, giọng nói hoặc video. Người phỏng vấn AI của chúng tôi tạo ra trải nghiệm thực tế.', en: 'Answer questions via text, voice, or video. Our AI interviewer creates a realistic experience.' },
      },
      {
        title: { vi: 'Nhận phản hồi & Cải thiện', en: 'Get feedback & improve' },
        desc:  { vi: 'Nhận phản hồi tức thì, có cấu trúc. Theo dõi tiến độ theo thời gian và thấy sự cải thiện.', en: 'Get instant, structured feedback. Track progress over time and see real improvement.' },
      },
    ],
  },

  // ── Features ────────────────────────────────────────────────────────────
  features: {
    badge:  { vi: 'Tính năng',              en: 'Features' },
    title:  { vi: 'Mọi thứ bạn cần để chuẩn bị', en: 'Everything you need to prepare' },
    desc:   { vi: 'Công cụ và tính năng toàn diện để giúp bạn thành công trong các cuộc phỏng vấn.', en: 'Comprehensive tools and features designed to help you succeed in interviews.' },
    optional: { vi: 'Tùy chọn', en: 'Optional' },
    items: [
      {
        title: { vi: 'Câu hỏi theo vị trí',        en: 'Role-specific questions' },
        desc:  { vi: 'Bộ câu hỏi được tuyển chọn cho Frontend, Backend, Data Science, Product, Marketing và nhiều hơn nữa.', en: 'Curated question sets for Frontend, Backend, Data Science, Product, Marketing and more.' },
        highlights: [
          { vi: 'Hơn 10 vị trí công việc',   en: '10+ job roles' },
          { vi: 'Nhiều cấp độ kinh nghiệm',  en: 'Multiple experience levels' },
          { vi: 'Chuyên biệt theo ngành',    en: 'Industry-specific' },
        ],
      },
      {
        title: { vi: 'Nhiều chế độ trả lời',        en: 'Multiple answer modes' },
        desc:  { vi: 'Luyện tập theo cách của bạn—nhập câu trả lời, ghi âm giọng nói hoặc sử dụng video.', en: 'Practice your way—type answers, record voice, or use video for a full simulation.' },
        highlights: [
          { vi: 'Nhập văn bản', en: 'Text input' },
          { vi: 'Ghi âm giọng nói', en: 'Voice recording' },
          { vi: 'Chế độ video', en: 'Video mode' },
        ],
      },
      {
        title: { vi: 'Phản hồi có cấu trúc',        en: 'Structured feedback' },
        desc:  { vi: 'Nhận phân tích chi tiết về mức độ liên quan, mạch lạc, cấu trúc và cách trình bày.', en: 'Get detailed analysis of relevance, coherence, structure, and delivery with improvement tips.' },
        highlights: [
          { vi: 'Phân tích điểm số', en: 'Score breakdown' },
          { vi: 'Xác định điểm mạnh', en: 'Strength identification' },
          { vi: 'Gợi ý viết lại', en: 'Rewrite suggestions' },
        ],
      },
      {
        title: { vi: 'Theo dõi tiến độ',            en: 'Progress tracking' },
        desc:  { vi: 'Xem sự cải thiện của bạn theo thời gian với phân tích chi tiết và lịch sử phiên.', en: 'See your improvement over time with detailed analytics and session history.' },
        highlights: [
          { vi: 'Biểu đồ trực quan',  en: 'Visual charts' },
          { vi: 'Lịch sử phiên',      en: 'Session history' },
          { vi: 'Theo dõi chuỗi ngày', en: 'Streak tracking' },
        ],
      },
      {
        title: { vi: 'Chuyển văn bản thành giọng nói', en: 'Text-to-speech' },
        desc:  { vi: 'Nghe phản hồi của bạn được đọc to. Tuyệt vời để xem lại khi di chuyển.', en: 'Hear your feedback read aloud. Great for reviewing on the go or accessibility.' },
        highlights: [
          { vi: 'Giọng nói tự nhiên', en: 'Natural voice' },
          { vi: 'Tốc độ điều chỉnh', en: 'Adjustable speed' },
          { vi: 'Nhiều ngôn ngữ',    en: 'Multiple languages' },
        ],
        optional: true,
      },
      {
        title: { vi: 'Phân tích biểu cảm',           en: 'Expression analysis' },
        desc:  { vi: 'Nhận thông tin chi tiết về giao tiếp phi ngôn ngữ của bạn trong các phiên video.', en: 'Get insights into your non-verbal communication in video practice sessions.' },
        highlights: [
          { vi: 'Giao tiếp bằng mắt',      en: 'Eye contact' },
          { vi: 'Biểu cảm khuôn mặt',      en: 'Facial expressions' },
          { vi: 'Dấu hiệu tự tin',          en: 'Confidence signals' },
        ],
        optional: true,
      },
    ],
  },

  // ── Testimonials ────────────────────────────────────────────────────────
  testimonials: {
    badge:  { vi: 'Đánh giá',                         en: 'Testimonials' },
    title:  { vi: 'Được yêu thích bởi người tìm việc', en: 'Loved by job seekers' },
    desc:   { vi: 'Nghe từ các chuyên gia đã có được công việc mơ ước sau khi luyện tập với chúng tôi.', en: 'Hear from professionals who landed their dream jobs after practicing with us.' },
  },

  // ── FAQ ─────────────────────────────────────────────────────────────────
  faq: {
    badge:  { vi: 'Câu hỏi thường gặp', en: 'FAQ' },
    title:  { vi: 'Câu hỏi thường gặp', en: 'Frequently Asked Questions' },
    desc:   { vi: 'Có câu hỏi? Chúng tôi có câu trả lời.', en: 'Have questions? We have answers.' },
    items: [
      {
        q: { vi: 'Phản hồi AI hoạt động như thế nào?', en: 'How does the AI feedback work?' },
        a: {
          vi: 'AI của chúng tôi phân tích câu trả lời của bạn dựa trên nhiều tiêu chí bao gồm mức độ liên quan, mạch lạc, cấu trúc và cách diễn đạt. Đối với chế độ giọng nói và video, chúng tôi cũng phân tích các khía cạnh trình bày như nhịp độ và sự tự tin.',
          en: 'Our AI analyzes your answers based on multiple criteria including relevance, coherence, structure, and delivery. For voice and video modes, we also analyze presentation aspects like pace and confidence.',
        },
      },
      {
        q: { vi: 'Tôi có thể luyện tập cho các công ty cụ thể không?', en: 'Can I practice for specific companies?' },
        a: {
          vi: 'Có! Gói Pro của chúng tôi bao gồm các bộ câu hỏi dành riêng cho công ty cho các công ty công nghệ hàng đầu như Google, Meta, Amazon và nhiều hơn nữa.',
          en: 'Yes! Our Pro plan includes company-specific question sets for top tech companies like Google, Meta, Amazon, and more.',
        },
      },
      {
        q: { vi: 'Dữ liệu của tôi có được bảo mật không?', en: 'Is my data secure?' },
        a: {
          vi: 'Hoàn toàn. Chúng tôi coi trọng quyền riêng tư. Các phiên luyện tập và bản ghi của bạn được mã hóa và không bao giờ được chia sẻ với bên thứ ba.',
          en: 'Absolutely. We take privacy seriously. Your practice sessions and recordings are encrypted and never shared with third parties.',
        },
      },
      {
        q: { vi: 'Độ chính xác của chuyển giọng nói thành văn bản như thế nào?', en: 'How accurate is the speech-to-text?' },
        a: {
          vi: 'Công nghệ chuyển giọng nói thành văn bản của chúng tôi đạt độ chính xác hơn 95% cho giọng nói rõ ràng. Chúng tôi hỗ trợ nhiều giọng và tiếp tục cải thiện.',
          en: 'Our speech-to-text achieves over 95% accuracy for clear speech. We support multiple accents and continue to improve.',
        },
      },
    ],
  },

  // ── CTA ─────────────────────────────────────────────────────────────────
  cta: {
    badge:  { vi: 'Bắt đầu hành trình của bạn hôm nay', en: 'Start your journey today' },
    title:  { vi: 'Sẵn sàng chinh phục buổi phỏng vấn tiếp theo?', en: 'Ready to ace your next interview?' },
    desc:   {
      vi: 'Tham gia cùng hàng nghìn người tìm việc đã cải thiện kỹ năng phỏng vấn với luyện tập được hỗ trợ bởi AI. Bắt đầu miễn phí hôm nay.',
      en: 'Join thousands of job seekers who have improved their interview skills with AI-powered practice. Start free today.',
    },
    button: { vi: 'Bắt đầu miễn phí', en: 'Start for free' },
  },

  // ── Footer ──────────────────────────────────────────────────────────────
  footer: {
    tagline:  { vi: 'Luyện tập tạo nên sự hoàn hảo. Nền tảng phỏng vấn được hỗ trợ bởi AI của chúng tôi giúp bạn chuẩn bị cho công việc mơ ước.', en: 'Practice makes perfect. Our AI-powered interview platform helps you prepare for your dream job with personalized feedback.' },
    product:  { vi: 'Sản phẩm',           en: 'Product' },
    features: { vi: 'Tính năng',          en: 'Features' },
    pricing:  { vi: 'Bảng giá',           en: 'Pricing' },
    faq:      { vi: 'Câu hỏi thường gặp', en: 'FAQ' },
    dashboard:{ vi: 'Bảng điều khiển',    en: 'Dashboard' },
    company:  { vi: 'Công ty',            en: 'Company' },
    about:    { vi: 'Về chúng tôi',       en: 'About us' },
    contact:  { vi: 'Liên hệ',            en: 'Contact' },
    privacy:  { vi: 'Chính sách bảo mật', en: 'Privacy policy' },
    terms:    { vi: 'Điều khoản dịch vụ', en: 'Terms of service' },
    copyright:{ vi: 'Tất cả quyền được bảo lưu.', en: 'All rights reserved.' },
  },

  // ── Sidebar ─────────────────────────────────────────────────────────────
  sidebar: {
    dashboard:  { vi: 'Bảng điều khiển', en: 'Dashboard' },
    newSession:  { vi: 'Phiên mới',       en: 'New session' },
    sessions:   { vi: 'Phiên',           en: 'Sessions' },
    profile:    { vi: 'Hồ sơ',           en: 'Profile' },
    settings:   { vi: 'Cài đặt',         en: 'Settings' },
    user:       { vi: 'Người dùng',      en: 'User' },
    proPlan:    { vi: 'Gói Pro',          en: 'Pro plan' },
    logout:     { vi: 'Đăng xuất',       en: 'Log out' },
  },

  // ── Dashboard page ──────────────────────────────────────────────────────
  dashboard: {
    title:        { vi: 'Bảng điều khiển',    en: 'Dashboard' },
    welcome:      { vi: 'Chào mừng trở lại! Sẵn sàng luyện tập?', en: 'Welcome back! Ready to practice?' },
    newSession:   { vi: 'Tạo phiên mới',      en: 'New session' },
    totalSessions:{ vi: 'Tổng số phiên',      en: 'Total sessions' },
    avgScore:     { vi: 'Điểm trung bình',    en: 'Average score' },
    vsPrevMonth:  { vi: 'so với tháng trước', en: 'vs last month' },
    streak:       { vi: 'Chuỗi luyện tập',   en: 'Practice streak' },
    days:         { vi: 'ngày',               en: 'days' },
    questionsAnswered: { vi: 'Câu hỏi đã trả lời', en: 'Questions answered' },
    progressTime: { vi: 'Tiến độ theo thời gian', en: 'Progress over time' },
    days7:        { vi: '7 ngày',             en: '7 days' },
    days30:       { vi: '30 ngày',            en: '30 days' },
    days90:       { vi: '90 ngày',            en: '90 days' },
    score:        { vi: 'Điểm',              en: 'Score' },
    recentSessions: { vi: 'Phiên gần đây',   en: 'Recent sessions' },
    viewAll:      { vi: 'Xem tất cả',        en: 'View all' },
    role:         { vi: 'Vai trò',           en: 'Role' },
    level:        { vi: 'Cấp độ',           en: 'Level' },
    date:         { vi: 'Ngày',             en: 'Date' },
    scoreLabel:   { vi: 'Điểm',             en: 'Score' },
    mode:         { vi: 'Chế độ',           en: 'Mode' },
    duration:     { vi: 'Thời lượng',       en: 'Duration' },
    questions:    { vi: 'câu hỏi',          en: 'questions' },
    noSessions:   { vi: 'Chưa có phiên nào. Hãy bắt đầu!', en: 'No sessions yet. Get started!' },
  },

  // ── Sessions page ────────────────────────────────────────────────────────
  sessions: {
    title:        { vi: 'Phiên',                                    en: 'Sessions' },
    subtitle:     { vi: 'Xem và quản lý các phiên luyện tập của bạn', en: 'View and manage your practice sessions' },
    exportAll:    { vi: 'Xuất tất cả',                             en: 'Export all' },
    searchPlaceholder: { vi: 'Tìm kiếm theo vị trí...',           en: 'Search by role...' },
    all:          { vi: 'Tất cả',                                  en: 'All' },
    text:         { vi: 'Văn bản',                                 en: 'Text' },
    voice:        { vi: 'Giọng nói',                               en: 'Voice' },
    video:        { vi: 'Video',                                   en: 'Video' },
    historyTitle: { vi: 'Lịch sử luyện tập',                      en: 'Practice history' },
    noFound:      { vi: 'Không tìm thấy phiên nào',               en: 'No sessions found' },
    adjustFilter: { vi: 'Thử điều chỉnh bộ lọc của bạn',         en: 'Try adjusting your filters' },
    getStarted:   { vi: 'Bắt đầu phiên luyện tập đầu tiên của bạn', en: 'Start your first practice session' },
    newSession:   { vi: 'Tạo phiên mới',                          en: 'New session' },
    questions:    { vi: 'câu hỏi',                                en: 'questions' },
  },

  // ── Profile page ─────────────────────────────────────────────────────────
  profile: {
    title:            { vi: 'Hồ sơ',                               en: 'Profile' },
    subtitle:         { vi: 'Quản lý hồ sơ và mục tiêu nghề nghiệp của bạn', en: 'Manage your profile and career goals' },
    personalInfo:     { vi: 'Thông tin cá nhân',                   en: 'Personal information' },
    uploadPhoto:      { vi: 'Tải ảnh lên',                         en: 'Upload photo' },
    fullName:         { vi: 'Họ và tên',                           en: 'Full name' },
    email:            { vi: 'Email',                               en: 'Email' },
    careerGoals:      { vi: 'Mục tiêu nghề nghiệp',               en: 'Career goals' },
    targetRole:       { vi: 'Vị trí mục tiêu',                    en: 'Target role' },
    careerDesc:       { vi: 'Mô tả mục tiêu nghề nghiệp',         en: 'Career goal description' },
    careerPlaceholder:{ vi: 'Mô tả mục tiêu nghề nghiệp và những gì bạn muốn đạt được...', en: 'Describe your career goals and what you want to achieve...' },
    cvTitle:          { vi: 'Sơ yếu lý lịch / CV',               en: 'Resume / CV' },
    uploadResume:     { vi: 'Tải lên sơ yếu lý lịch của bạn',    en: 'Upload your resume' },
    fileTypes:        { vi: 'PDF, DOC hoặc DOCX tối đa 10MB',     en: 'PDF, DOC or DOCX up to 10MB' },
    chooseFile:       { vi: 'Chọn tệp',                           en: 'Choose file' },
    saveChanges:      { vi: 'Lưu thay đổi',                       en: 'Save changes' },
  },

  // ── NewSession page ──────────────────────────────────────────────────────
  newSession: {
    title:            { vi: 'Tạo phiên mới',                      en: 'Create New Session' },
    subtitle:         { vi: 'Thiết lập phiên luyện tập phỏng vấn của bạn', en: 'Set up your interview practice session' },
    stepRole:         { vi: 'Chọn vai trò',                       en: 'Choose Role' },
    stepLevel:        { vi: 'Chọn cấp độ',                       en: 'Select Level' },
    stepOptions:      { vi: 'Tùy chọn',                           en: 'Options' },
    chooseRole:       { vi: 'Chọn vai trò mục tiêu',             en: 'Choose Your Target Role' },
    searchRoles:      { vi: 'Tìm kiếm vai trò...',               en: 'Search roles...' },
    selectLevel:      { vi: 'Chọn cấp độ kinh nghiệm',           en: 'Select Experience Level' },
    configOptions:    { vi: 'Cấu hình tùy chọn',                 en: 'Configure Options' },
    numQuestions:     { vi: 'Số câu hỏi',                        en: 'Number of Questions' },
    timeLimit:        { vi: 'Giới hạn thời gian',                en: 'Time Limit' },
    answerMode:       { vi: 'Chế độ trả lời',                    en: 'Answer Mode' },
    difficulty:       { vi: 'Độ khó',                            en: 'Difficulty' },
    sessionSummary:   { vi: 'Tóm tắt phiên',                     en: 'Session Summary' },
    role:             { vi: 'Vai trò',                            en: 'Role' },
    level:            { vi: 'Cấp độ',                            en: 'Level' },
    questions:        { vi: 'Câu hỏi',                           en: 'Questions' },
    answerModeLabel:  { vi: 'Chế độ trả lời',                    en: 'Answer Mode' },
    difficultyLabel:  { vi: 'Độ khó',                            en: 'Difficulty' },
    notSelected:      { vi: 'Chưa chọn',                         en: 'Not selected' },
    back:             { vi: 'Quay lại',                           en: 'Back' },
    next:             { vi: 'Tiếp theo',                          en: 'Next' },
    startInterview:   { vi: 'Bắt đầu phỏng vấn',                en: 'Start Interview' },
  },

  // ── Login / Signup ──────────────────────────────────────────────────────
  login: {
    welcome:      { vi: 'Chào mừng trở lại',                en: 'Welcome back' },
    subtitle:     { vi: 'Nhập thông tin đăng nhập để truy cập tài khoản của bạn', en: 'Enter your credentials to access your account' },
    email:        { vi: 'Email',                             en: 'Email' },
    password:     { vi: 'Mật khẩu',                         en: 'Password' },
    forgot:       { vi: 'Quên mật khẩu?',                   en: 'Forgot password?' },
    submit:       { vi: 'Đăng nhập',                        en: 'Log in' },
    submitting:   { vi: 'Đang đăng nhập...',                en: 'Logging in...' },
    noAccount:    { vi: 'Chưa có tài khoản?',               en: "Don't have an account?" },
    signupLink:   { vi: 'Đăng ký',                          en: 'Sign up' },
    hidePassword: { vi: 'Ẩn mật khẩu',                     en: 'Hide password' },
    showPassword: { vi: 'Hiện mật khẩu',                   en: 'Show password' },
    panelTitle:   { vi: 'Cải thiện kỹ năng phỏng vấn của bạn', en: 'Improve your interview skills' },
    panelSub:     { vi: 'Tham gia hàng nghìn chuyên gia đã có được công việc mơ ước.', en: 'Join thousands of professionals who landed their dream jobs.' },
    feature1:     { vi: 'Câu hỏi phỏng vấn thực tế cho 10+ vị trí', en: 'Real interview questions for 10+ roles' },
    feature2:     { vi: 'Phản hồi AI tức thì có cấu trúc',          en: 'Instant structured AI feedback' },
    feature3:     { vi: 'Theo dõi tiến độ chi tiết',                en: 'Detailed progress tracking' },
    feature4:     { vi: 'Luyện tập bất cứ lúc nào, bất cứ nơi đâu',en: 'Practice anytime, anywhere' },
    error:        { vi: 'Email hoặc mật khẩu không đúng. Vui lòng thử lại.', en: 'Incorrect email or password. Please try again.' },
  },

  signup: {
    title:        { vi: 'Tạo tài khoản',             en: 'Create account' },
    subtitle:     { vi: 'Bắt đầu hành trình luyện tập phỏng vấn của bạn', en: 'Start your interview practice journey' },
    name:         { vi: 'Họ và tên',                  en: 'Full name' },
    email:        { vi: 'Email',                      en: 'Email' },
    password:     { vi: 'Mật khẩu',                  en: 'Password' },
    confirm:      { vi: 'Xác nhận mật khẩu',         en: 'Confirm password' },
    terms:        { vi: 'Tôi đồng ý với',             en: 'I agree to the' },
    termsLink:    { vi: 'Điều khoản dịch vụ',        en: 'Terms of Service' },
    and:          { vi: 'và',                         en: 'and' },
    privacyLink:  { vi: 'Chính sách bảo mật',        en: 'Privacy Policy' },
    submit:       { vi: 'Tạo tài khoản',             en: 'Create account' },
    submitting:   { vi: 'Đang tạo tài khoản...',     en: 'Creating account...' },
    hasAccount:   { vi: 'Đã có tài khoản?',          en: 'Already have an account?' },
    loginLink:    { vi: 'Đăng nhập',                 en: 'Log in' },
    errorEmail:   { vi: 'Email này đã được sử dụng. Vui lòng dùng email khác.', en: 'This email is already in use. Please use a different email.' },
    error:        { vi: 'Có lỗi xảy ra khi tạo tài khoản. Vui lòng thử lại.', en: 'An error occurred while creating your account. Please try again.' },
  },

  // ── Settings ────────────────────────────────────────────────────────────
  settings: {
    title:           { vi: 'Cài đặt',                      en: 'Settings' },
    subtitle:        { vi: 'Quản lý tùy chọn ứng dụng của bạn', en: 'Manage your application preferences' },
    language:        { vi: 'Ngôn ngữ',                     en: 'Language' },
    languageDesc:    { vi: 'Chọn ngôn ngữ ưa thích của bạn', en: 'Choose your preferred language' },
    audio:           { vi: 'Cài đặt âm thanh',             en: 'Audio settings' },
    audioDesc:       { vi: 'Cấu hình chuyển văn bản thành giọng nói và phản hồi âm thanh', en: 'Configure text-to-speech and audio feedback' },
    tts:             { vi: 'Chuyển văn bản thành giọng nói', en: 'Text-to-speech' },
    ttsDesc:         { vi: 'Nghe phản hồi được đọc to cho bạn', en: 'Hear feedback read aloud to you' },
    appearance:      { vi: 'Giao diện',                    en: 'Appearance' },
    appearanceDesc:  { vi: 'Tùy chỉnh giao diện và cảm giác', en: 'Customize the look and feel' },
    darkMode:        { vi: 'Chế độ tối',                   en: 'Dark mode' },
    darkModeDesc:    { vi: 'Sử dụng giao diện tối cho ứng dụng', en: 'Use dark theme for the application' },
    darkModeLocked:  { vi: 'Chỉ khả dụng cho người dùng đã đăng nhập', en: 'Only available for logged-in users' },
    loginToChange:   { vi: 'Đăng nhập để thay đổi chủ đề', en: 'Log in to change the theme' },
    privacy:         { vi: 'Quyền riêng tư',               en: 'Privacy' },
    privacyDesc:     { vi: 'Kiểm soát dữ liệu và cài đặt quyền riêng tư của bạn', en: 'Control your data and privacy settings' },
    dataSharing:     { vi: 'Chia sẻ dữ liệu ẩn danh',     en: 'Anonymous data sharing' },
    dataSharingDesc: { vi: 'Giúp cải thiện AI của chúng tôi bằng cách chia sẻ dữ liệu luyện tập ẩn danh', en: 'Help improve our AI by sharing anonymous practice data' },
    deleteData:      { vi: 'Xóa tất cả dữ liệu của tôi',  en: 'Delete all my data' },
    save:            { vi: 'Lưu cài đặt',                  en: 'Save settings' },
  },
} as const;

// ─── Context ───────────────────────────────────────────────────────────────
interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (section: keyof typeof translations, key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('invera-language') as Language) || 'vi';
  });

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('invera-language', lang);
  };

  const t = (section: keyof typeof translations, key: string): string => {
    const sectionData = translations[section] as Record<string, Record<Language, string>>;
    return sectionData?.[key]?.[language] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
