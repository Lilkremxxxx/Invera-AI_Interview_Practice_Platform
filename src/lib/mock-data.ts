// Dữ liệu mẫu cho ứng dụng phỏng vấn AI

export const roles = [
  { id: 'frontend', name: 'Lập trình viên Frontend', icon: '💻', questions: 45 },
  { id: 'backend', name: 'Lập trình viên Backend', icon: '⚙️', questions: 52 },
  { id: 'fullstack', name: 'Lập trình viên Full Stack', icon: '🔧', questions: 68 },
  { id: 'data', name: 'Nhà khoa học dữ liệu', icon: '📊', questions: 38 },
  { id: 'ml', name: 'Kỹ sư học máy', icon: '🤖', questions: 42 },
  { id: 'devops', name: 'Kỹ sư DevOps', icon: '🚀', questions: 35 },
  { id: 'product', name: 'Quản lý sản phẩm', icon: '📋', questions: 40 },
  { id: 'marketing', name: 'Quản lý Marketing', icon: '📢', questions: 32 },
  { id: 'sales', name: 'Nhân viên kinh doanh', icon: '💼', questions: 28 },
  { id: 'design', name: 'Nhà thiết kế UX', icon: '🎨', questions: 36 },
];

export const levels = [
  { id: 'intern', name: 'Thực tập sinh', description: 'Cấp độ đầu vào, học các kiến thức cơ bản' },
  { id: 'junior', name: 'Junior', description: '0-2 năm kinh nghiệm' },
  { id: 'mid', name: 'Trung cấp', description: '2-5 năm kinh nghiệm' },
  { id: 'senior', name: 'Senior', description: '5+ năm kinh nghiệm' },
];

export const answerModes = [
  { id: 'text', name: 'Văn bản', icon: '✍️', description: 'Nhập câu trả lời của bạn' },
  { id: 'voice', name: 'Giọng nói', icon: '🎤', description: 'Nói câu trả lời của bạn' },
  { id: 'video', name: 'Video', icon: '📹', description: 'Ghi lại phản hồi video' },
];

export const questionCounts = [5, 10, 15];

export const timeLimits = [
  { id: 'none', name: 'Không giới hạn' },
  { id: '2', name: '2 phút/câu hỏi' },
  { id: '3', name: '3 phút/câu hỏi' },
  { id: '5', name: '5 phút/câu hỏi' },
];

export const difficulties = [
  { id: 'easy', name: 'Dễ', color: 'success' },
  { id: 'medium', name: 'Trung bình', color: 'warning' },
  { id: 'hard', name: 'Khó', color: 'destructive' },
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
    role: 'Lập trình viên Frontend',
    level: 'Trung cấp',
    date: '2024-01-20',
    score: 82,
    questionsCount: 10,
    mode: 'text',
    duration: '25 phút',
  },
  {
    id: '2',
    role: 'Lập trình viên Backend',
    level: 'Senior',
    date: '2024-01-19',
    score: 75,
    questionsCount: 10,
    mode: 'voice',
    duration: '32 phút',
  },
  {
    id: '3',
    role: 'Lập trình viên Full Stack',
    level: 'Junior',
    date: '2024-01-18',
    score: 88,
    questionsCount: 5,
    mode: 'text',
    duration: '12 phút',
  },
  {
    id: '4',
    role: 'Quản lý sản phẩm',
    level: 'Trung cấp',
    date: '2024-01-17',
    score: 71,
    questionsCount: 10,
    mode: 'voice',
    duration: '28 phút',
  },
  {
    id: '5',
    role: 'Lập trình viên Frontend',
    level: 'Senior',
    date: '2024-01-15',
    score: 79,
    questionsCount: 15,
    mode: 'video',
    duration: '45 phút',
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
    name: 'Miễn phí',
    price: 0,
    description: 'Hoàn hảo để bắt đầu',
    features: [
      '5 phiên luyện tập/tháng',
      'Chỉ câu trả lời dạng văn bản',
      'Phản hồi cơ bản',
      '3 vị trí có sẵn',
      'Hỗ trợ cộng đồng',
    ],
    cta: 'Bắt đầu',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 19,
    description: 'Dành cho người tìm việc nghiêm túc',
    features: [
      'Phiên luyện tập không giới hạn',
      'Chế độ văn bản, giọng nói & video',
      'Phản hồi AI nâng cao',
      'Tất cả vị trí & cấp độ',
      'Phân tích tiến độ',
      'Hỗ trợ ưu tiên',
      'Xuất ra PDF',
    ],
    cta: 'Bắt đầu dùng thử miễn phí',
    popular: true,
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
