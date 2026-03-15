// Dữ liệu mẫu cho ứng dụng phỏng vấn AI

export const roles = [
  { id: 'frontend', name: { vi: 'Lập trình viên Frontend', en: 'Frontend Developer' }, icon: '💻', questions: 45 },
  { id: 'backend', name: { vi: 'Lập trình viên Backend', en: 'Backend Developer' }, icon: '⚙️', questions: 52 },
  { id: 'fullstack', name: { vi: 'Lập trình viên Full Stack', en: 'Full Stack Developer' }, icon: '🔧', questions: 68 },
  { id: 'data', name: { vi: 'Nhà khoa học dữ liệu', en: 'Data Scientist' }, icon: '📊', questions: 38 },
  { id: 'ml', name: { vi: 'Kỹ sư học máy', en: 'Machine Learning Engineer' }, icon: '🤖', questions: 42 },
  { id: 'devops', name: { vi: 'Kỹ sư DevOps', en: 'DevOps Engineer' }, icon: '🚀', questions: 35 },
  { id: 'product', name: { vi: 'Quản lý sản phẩm', en: 'Product Manager' }, icon: '📋', questions: 40 },
  { id: 'marketing', name: { vi: 'Quản lý Marketing', en: 'Marketing Manager' }, icon: '📢', questions: 32 },
  { id: 'sales', name: { vi: 'Nhân viên kinh doanh', en: 'Sales Representative' }, icon: '💼', questions: 28 },
  { id: 'design', name: { vi: 'Nhà thiết kế UX', en: 'UX Designer' }, icon: '🎨', questions: 36 },
];

export const levels = [
  { id: 'intern', name: { vi: 'Thực tập sinh', en: 'Intern' }, description: { vi: 'Cấp độ đầu vào, học các kiến thức cơ bản', en: 'Entry level, learning the basics' } },
  { id: 'junior', name: { vi: 'Junior', en: 'Junior' }, description: { vi: '0-2 năm kinh nghiệm', en: '0-2 years of experience' } },
  { id: 'mid', name: { vi: 'Trung cấp', en: 'Mid-level' }, description: { vi: '2-5 năm kinh nghiệm', en: '2-5 years of experience' } },
  { id: 'senior', name: { vi: 'Senior', en: 'Senior' }, description: { vi: '5+ năm kinh nghiệm', en: '5+ years of experience' } },
];

export const answerModes = [
  { id: 'text', name: { vi: 'Văn bản', en: 'Text' }, icon: '✍️', description: { vi: 'Nhập câu trả lời của bạn', en: 'Type your answer' } },
  { id: 'voice', name: { vi: 'Giọng nói', en: 'Voice' }, icon: '🎤', description: { vi: 'Nói câu trả lời của bạn', en: 'Speak your answer' } },
  { id: 'video', name: { vi: 'Video', en: 'Video' }, icon: '📹', description: { vi: 'Ghi lại phản hồi video', en: 'Record your video response' } },
];

export const questionCounts = [5, 10, 15];

export const timeLimits = [
  { id: 'none', name: { vi: 'Không giới hạn', en: 'No limit' } },
  { id: '2', name: { vi: '2 phút/câu hỏi', en: '2 min/question' } },
  { id: '3', name: { vi: '3 phút/câu hỏi', en: '3 min/question' } },
  { id: '5', name: { vi: '5 phút/câu hỏi', en: '5 min/question' } },
];

export const difficulties = [
  { id: 'easy', name: { vi: 'Dễ', en: 'Easy' }, color: 'success' },
  { id: 'medium', name: { vi: 'Trung bình', en: 'Medium' }, color: 'warning' },
  { id: 'hard', name: { vi: 'Khó', en: 'Hard' }, color: 'destructive' },
];

export const sampleQuestions = [
  {
    id: 1,
    text: "Hãy kể về bản thân bạn và lý do bạn quan tâm đến vị trí này.",
    category: 'Hành vi',
    difficulty: 'easy',
  },
  {
    id: 2,
    text: "Mô tả một dự án thách thức mà bạn đã làm việc và cách bạn vượt qua các trở ngại.",
    category: 'Hành vi',
    difficulty: 'medium',
  },
  {
    id: 3,
    text: "Giải thích sự khác biệt giữa REST và GraphQL API. Khi nào bạn sẽ chọn cái này thay vì cái kia?",
    category: 'Kỹ thuật',
    difficulty: 'medium',
  },
  {
    id: 4,
    text: "Bạn sẽ tối ưu hóa hiệu suất của một ứng dụng web tải chậm như thế nào?",
    category: 'Kỹ thuật',
    difficulty: 'hard',
  },
  {
    id: 5,
    text: "Mô tả kinh nghiệm của bạn với các hệ thống kiểm soát phiên bản như Git.",
    category: 'Kỹ thuật',
    difficulty: 'easy',
  },
  {
    id: 6,
    text: "Bạn xử lý bất đồng với các thành viên trong nhóm về quyết định kỹ thuật như thế nào?",
    category: 'Hành vi',
    difficulty: 'medium',
  },
  {
    id: 7,
    text: "Hướng dẫn tôi cách tiếp cận của bạn để gỡ lỗi một vấn đề phức tạp trong sản xuất.",
    category: 'Kỹ thuật',
    difficulty: 'hard',
  },
  {
    id: 8,
    text: "Kinh nghiệm của bạn với các phương pháp agile là gì? Bạn quản lý quy trình làm việc của mình như thế nào?",
    category: 'Quy trình',
    difficulty: 'easy',
  },
  {
    id: 9,
    text: "Thiết kế một hệ thống có thể xử lý hàng triệu người dùng đồng thời. Những cân nhắc chính là gì?",
    category: 'Thiết kế hệ thống',
    difficulty: 'hard',
  },
  {
    id: 10,
    text: "Bạn thấy mình ở đâu trong 5 năm tới? Vị trí này phù hợp với mục tiêu nghề nghiệp của bạn như thế nào?",
    category: 'Hành vi',
    difficulty: 'easy',
  },
];

export const sampleFeedback = {
  overallScore: 78,
  criteria: {
    relevance: 85,
    coherence: 75,
    structure: 72,
    wording: 80,
    delivery: 76,
  },
  strengths: [
    "Diễn đạt rõ ràng các khái niệm kỹ thuật",
    "Sử dụng tốt các ví dụ cụ thể từ kinh nghiệm trong quá khứ",
    "Thể hiện cách tiếp cận giải quyết vấn đề",
    "Trình bày tự tin với nhịp độ phù hợp",
  ],
  improvements: [
    "Có thể cung cấp thêm kết quả có thể định lượng",
    "Xem xét sử dụng phương pháp STAR cho câu hỏi hành vi",
    "Thêm nhiều ngữ cảnh về tác động của quyết định của bạn",
    "Giảm các từ lấp đầy như 'ừm' và 'như là'",
  ],
  rewriteSuggestion: {
    original: "Tôi đã làm việc trên một dự án khá phức tạp và chúng tôi gặp một số vấn đề nhưng chúng tôi đã sửa chúng.",
    improved: "Tôi đã dẫn dắt một dự án di chuyển liên quan đến việc chuyển đổi hệ thống cũ của chúng tôi sang kiến trúc microservices. Khi chúng tôi gặp phải các nút thắt hiệu suất, tôi đã triển khai các chiến lược bộ nhớ đệm giảm thời gian phản hồi 40% và cải thiện điểm hài lòng của người dùng.",
  },
  nextSteps: [
    "Luyện tập thêm các câu hỏi thiết kế hệ thống",
    "Xem lại phương pháp STAR cho câu trả lời hành vi",
    "Thử bộ câu hỏi 'Lập trình viên Frontend Senior'",
  ],
};

export const userStats = {
  totalSessions: 24,
  averageScore: 76,
  practiceStreak: 7,
  totalQuestions: 186,
  improvementRate: 12,
};

export const recentSessions = [
  {
    id: '1',
    role: { vi: 'Lập trình viên Frontend', en: 'Frontend Developer' },
    level: { vi: 'Trung cấp', en: 'Mid-level' },
    date: '2024-01-20',
    score: 82,
    questionsCount: 10,
    mode: 'text',
    duration: { vi: '25 phút', en: '25 min' },
  },
  {
    id: '2',
    role: { vi: 'Lập trình viên Backend', en: 'Backend Developer' },
    level: { vi: 'Senior', en: 'Senior' },
    date: '2024-01-19',
    score: 75,
    questionsCount: 10,
    mode: 'voice',
    duration: { vi: '32 phút', en: '32 min' },
  },
  {
    id: '3',
    role: { vi: 'Lập trình viên Full Stack', en: 'Full Stack Developer' },
    level: { vi: 'Junior', en: 'Junior' },
    date: '2024-01-18',
    score: 88,
    questionsCount: 5,
    mode: 'text',
    duration: { vi: '12 phút', en: '12 min' },
  },
  {
    id: '4',
    role: { vi: 'Quản lý sản phẩm', en: 'Product Manager' },
    level: { vi: 'Trung cấp', en: 'Mid-level' },
    date: '2024-01-17',
    score: 71,
    questionsCount: 10,
    mode: 'voice',
    duration: { vi: '28 phút', en: '28 min' },
  },
  {
    id: '5',
    role: { vi: 'Lập trình viên Frontend', en: 'Frontend Developer' },
    level: { vi: 'Senior', en: 'Senior' },
    date: '2024-01-15',
    score: 79,
    questionsCount: 15,
    mode: 'video',
    duration: { vi: '45 phút', en: '45 min' },
  },
];

export const progressData = {
  daily: [
    { date: 'T2', score: 72 },
    { date: 'T3', score: 75 },
    { date: 'T4', score: 74 },
    { date: 'T5', score: 78 },
    { date: 'T6', score: 80 },
    { date: 'T7', score: 82 },
    { date: 'CN', score: 85 },
  ],
  weekly: [
    { date: 'Tuần 1', score: 68 },
    { date: 'Tuần 2', score: 72 },
    { date: 'Tuần 3', score: 76 },
    { date: 'Tuần 4', score: 82 },
  ],
  monthly: [
    { date: 'T10', score: 62 },
    { date: 'T11', score: 70 },
    { date: 'T12', score: 75 },
    { date: 'T1', score: 82 },
  ],
};

export const testimonials = [
  {
    id: 1,
    name: 'Nguyễn Thị Mai',
    role: 'Kỹ sư phần mềm tại Google',
    avatar: 'NM',
    content: "Nền tảng này đã giúp tôi có được công việc mơ ước! Phản hồi từ AI cực kỳ chi tiết và giúp tôi cải thiện kỹ năng giao tiếp đáng kể.",
    rating: 5,
  },
  {
    id: 2,
    name: 'Trần Văn Minh',
    role: 'Quản lý sản phẩm tại Meta',
    avatar: 'TM',
    content: "Phản hồi có cấu trúc và theo dõi tiến độ giúp tôi có động lực trong suốt quá trình tìm việc. Rất khuyến khích cho bất kỳ ai chuẩn bị cho phỏng vấn công nghệ.",
    rating: 5,
  },
  {
    id: 3,
    name: 'Lê Thị Hương',
    role: 'Nhà khoa học dữ liệu tại Amazon',
    avatar: 'LH',
    content: "Các câu hỏi theo vị trí rất chính xác. Tôi cảm thấy tự tin hơn nhiều khi tham gia các cuộc phỏng vấn thực tế sau khi luyện tập ở đây.",
    rating: 5,
  },
];

export const pricingPlans = [
  {
    id: 'free',
    name: 'Free',
    icon: '🎤',
    priceMonth: 0,
    priceYear: 0,
    sessionsPerMonth: 1,
    tokensPerSession: 7800,
    extraSessionMonth: 35000,
    extraSessionYear: null,
    description: 'Thử nghiệm nền tảng trước khi trả phí.',
    targetUsers: [
      'Muốn trải nghiệm trước khi trả tiền',
      'Chỉ cần một bài phỏng vấn thử',
      'Đang tìm hiểu vai trò hoặc cấp độ mới',
    ],
    features: [
      '1 phiên duy nhất',
      '1 vai trò / 1 cấp độ',
      'Phỏng vấn AI giọng nói cơ bản',
      'Chấm điểm rubric cơ bản',
      'Báo cáo tóm tắt ngắn',
    ],
    cta: 'Bắt đầu miễn phí',
    popular: false,
  },
  {
    id: 'basic',
    name: 'Basic',
    icon: '👑',
    priceMonth: 99000,
    priceYear: 799000,
    sessionsPerMonth: 5,
    tokensPerSession: 7800,
    extraSessionMonth: 35000,
    extraSessionYear: 28000,
    description: 'Luyện tập linh hoạt theo từng phiên.',
    targetUsers: [
      'Thích trả tiền theo phiên, không cam kết dài hạn',
      'Đang chuẩn bị cho một cuộc phỏng vấn sắp tới',
      'Cần phản hồi nhanh về cấu trúc và câu trả lời',
      'Muốn luyện tập linh hoạt theo nhu cầu',
    ],
    features: [
      'Phỏng vấn AI giọng nói (chọn vai trò & cấp độ)',
      'Câu hỏi hành vi + kỹ thuật',
      'Chấm điểm theo rubric',
      'Báo cáo tóm tắt phiên',
      'Lịch sử 30 ngày',
      'So sánh điểm giữa các phiên',
    ],
    cta: 'Chọn Basic',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: '👑',
    priceMonth: 199000,
    priceYear: 1799000,
    sessionsPerMonth: 8,
    tokensPerSession: 10800,
    extraSessionMonth: 30000,
    extraSessionYear: 28000,
    description: 'Cải thiện có hệ thống với phân tích nâng cao.',
    targetUsers: [
      'Đang ứng tuyển nhiều công ty cùng lúc',
      'Muốn cải thiện đo lường được theo thời gian',
      'Cần phân tích chi tiết và theo dõi hiệu suất',
      'Luyện tập vài lần mỗi tuần',
    ],
    features: [
      'Lịch sử phiên không giới hạn',
      'Phân tích hiệu suất chi tiết',
      'Bảng theo dõi tiến độ',
      'Phản hồi có cấu trúc nâng cao',
      'Xuất báo cáo PDF',
      'AI điều chỉnh độ khó',
      'Bộ câu hỏi theo công ty',
    ],
    cta: 'Chọn Pro',
    popular: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    icon: '👑',
    priceMonth: 299000,
    priceYear: 2799000,
    sessionsPerMonth: 12,
    tokensPerSession: 10800,
    extraSessionMonth: 28000,
    extraSessionYear: 28000,
    description: 'Hỗ trợ tối đa với AI + mentor thực để sẵn sàng phỏng vấn.',
    targetUsers: [
      'Đang nhắm đến vai trò senior hoặc cạnh tranh cao',
      'Muốn phản hồi thời gian thực từ mentor',
      'Cần chiến lược cá nhân hóa dựa trên CV',
      'Muốn tỷ lệ sẵn sàng phỏng vấn cao nhất',
    ],
    features: [
      'Chế độ phỏng vấn kết hợp (AI + mentor)',
      'Mentor quan sát và can thiệp khi cần',
      'Phản hồi định tính thời gian thực',
      'Chiến lược cải thiện cá nhân hóa',
      'Tùy chỉnh câu hỏi theo CV',
      'Đánh giá sẵn sàng phỏng vấn',
      'Lên lịch ưu tiên',
    ],
    cta: 'Chọn Premium',
    popular: false,
  },
];

export const faqs = [
  {
    question: 'Phản hồi AI hoạt động như thế nào?',
    answer: 'AI của chúng tôi phân tích câu trả lời của bạn dựa trên nhiều tiêu chí bao gồm mức độ liên quan, mạch lạc, cấu trúc và cách diễn đạt. Đối với chế độ giọng nói và video, chúng tôi cũng phân tích các khía cạnh trình bày như nhịp độ và sự tự tin.',
  },
  {
    question: 'Tôi có thể luyện tập cho các công ty cụ thể không?',
    answer: 'Có! Gói Pro của chúng tôi bao gồm các bộ câu hỏi dành riêng cho công ty cho các công ty công nghệ hàng đầu như Google, Meta, Amazon và nhiều hơn nữa.',
  },
  {
    question: 'Dữ liệu của tôi có được bảo mật không?',
    answer: 'Hoàn toàn. Chúng tôi coi trọng quyền riêng tư. Các phiên luyện tập và bản ghi của bạn được mã hóa và không bao giờ được chia sẻ với bên thứ ba.',
  },
  {
    question: 'Độ chính xác của chuyển giọng nói thành văn bản như thế nào?',
    answer: 'Công nghệ chuyển giọng nói thành văn bản của chúng tôi đạt độ chính xác hơn 95% cho giọng nói tiếng Anh rõ ràng. Chúng tôi hỗ trợ nhiều giọng và tiếp tục cải thiện.',
  },
];
