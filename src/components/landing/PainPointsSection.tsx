import { AlertCircle, Clock, TrendingDown } from 'lucide-react';

const painPoints = [
  {
    icon: AlertCircle,
    title: "Chưa chuẩn bị cho câu hỏi khó",
    description: "Phỏng vấn thực tế luôn có những câu hỏi bất ngờ. Không có sự luyện tập, ngay cả ứng viên giỏi cũng có thể vấp ngã với câu hỏi hành vi và kỹ thuật.",
  },
  {
    icon: Clock,
    title: "Không có thời gian cho phỏng vấn thử",
    description: "Việc sắp xếp phỏng vấn thử với bạn bè hoặc người hướng dẫn rất khó. Bạn cần luyện tập phù hợp với lịch trình của mình, bất cứ lúc nào.",
  },
  {
    icon: TrendingDown,
    title: "Không có phản hồi",
    description: "Làm sao bạn biết mình đang tiến bộ? Không có phản hồi có cấu trúc, bạn đang luyện tập mù quáng và lặp lại những sai lầm.",
  },
];

export const PainPointsSection = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Tại sao luyện tập phỏng vấn quan trọng
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Thị trường việc làm rất cạnh tranh. Đừng để việc thiếu chuẩn bị cản trở bạn.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {painPoints.map((point, index) => (
            <div 
              key={index} 
              className="group p-8 rounded-2xl bg-card border border-border hover:border-accent/50 hover:shadow-lg transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <point.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                {point.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {point.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
