import { 
  Target, 
  Mic, 
  BarChart3, 
  History, 
  Volume2, 
  Eye,
  CheckCircle2
} from 'lucide-react';

const features = [
  {
    icon: Target,
    title: 'Câu hỏi theo vị trí',
    description: 'Bộ câu hỏi được tuyển chọn cho Frontend, Backend, Data Science, Product, Marketing và nhiều hơn nữa.',
    highlights: ['Hơn 10 vị trí công việc', 'Nhiều cấp độ kinh nghiệm', 'Chuyên biệt theo ngành'],
  },
  {
    icon: Mic,
    title: 'Nhiều chế độ trả lời',
    description: 'Luyện tập theo cách của bạn—nhập câu trả lời, ghi âm giọng nói hoặc sử dụng video để mô phỏng đầy đủ.',
    highlights: ['Nhập văn bản', 'Ghi âm giọng nói', 'Chế độ video'],
  },
  {
    icon: BarChart3,
    title: 'Phản hồi có cấu trúc',
    description: 'Nhận phân tích chi tiết về mức độ liên quan, mạch lạc, cấu trúc và cách trình bày với các mẹo cải thiện.',
    highlights: ['Phân tích điểm số', 'Xác định điểm mạnh', 'Gợi ý viết lại'],
  },
  {
    icon: History,
    title: 'Theo dõi tiến độ',
    description: 'Xem sự cải thiện của bạn theo thời gian với phân tích chi tiết và lịch sử phiên.',
    highlights: ['Biểu đồ trực quan', 'Lịch sử phiên', 'Theo dõi chuỗi ngày'],
  },
  {
    icon: Volume2,
    title: 'Chuyển văn bản thành giọng nói',
    description: 'Nghe phản hồi của bạn được đọc to. Tuyệt vời để xem lại khi di chuyển hoặc hỗ trợ khả năng tiếp cận.',
    highlights: ['Giọng nói tự nhiên', 'Tốc độ điều chỉnh', 'Nhiều ngôn ngữ'],
    optional: true,
  },
  {
    icon: Eye,
    title: 'Phân tích biểu cảm',
    description: 'Nhận thông tin chi tiết về giao tiếp phi ngôn ngữ của bạn trong các phiên luyện tập video.',
    highlights: ['Giao tiếp bằng mắt', 'Biểu cảm khuôn mặt', 'Dấu hiệu tự tin'],
    optional: true,
  },
];

export const FeaturesSection = () => {
  return (
    <section id="features" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            Tính năng
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-primary dark:text-foreground mb-4">
            Mọi thứ bạn cần để chuẩn bị
          </h2>
          <p className="text-lg text-primary/70 dark:text-muted-foreground max-w-2xl mx-auto">
            Công cụ và tính năng toàn diện được thiết kế để giúp bạn thành công trong các cuộc phỏng vấn.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="group relative bg-card rounded-2xl p-6 border border-border hover:border-accent/50 hover:shadow-lg transition-all duration-300"
            >
              {feature.optional && (
                <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">
                  Tùy chọn
                </span>
              )}
              
              <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <feature.icon className="w-6 h-6" />
              </div>
              
              <h3 className="text-xl font-semibold text-primary dark:text-foreground mb-2">
                {feature.title}
              </h3>
              
              <p className="text-primary/70 dark:text-muted-foreground mb-4 leading-relaxed">
                {feature.description}
              </p>
              
              <ul className="space-y-2">
                {feature.highlights.map((highlight, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-primary/60 dark:text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
