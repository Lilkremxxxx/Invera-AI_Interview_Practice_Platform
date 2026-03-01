import { Target, MessageSquare, TrendingUp, ArrowRight } from 'lucide-react';

const steps = [
  {
    icon: Target,
    step: '01',
    title: 'Chọn vị trí của bạn',
    description: 'Chọn từ hơn 10 vị trí công việc và cấp độ kinh nghiệm. Nhận câu hỏi phù hợp với vị trí mục tiêu của bạn.',
  },
  {
    icon: MessageSquare,
    step: '02',
    title: 'Luyện tập trả lời',
    description: 'Trả lời câu hỏi qua văn bản, giọng nói hoặc video. Người phỏng vấn AI của chúng tôi tạo ra trải nghiệm phỏng vấn thực tế.',
  },
  {
    icon: TrendingUp,
    step: '03',
    title: 'Nhận phản hồi & Cải thiện',
    description: 'Nhận phản hồi tức thì, có cấu trúc về câu trả lời của bạn. Theo dõi tiến độ theo thời gian và thấy sự cải thiện.',
  },
];

export const HowItWorksSection = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            Quy trình đơn giản
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-primary dark:text-foreground mb-4">
            Cách thức hoạt động
          </h2>
          <p className="text-lg text-primary/70 dark:text-muted-foreground max-w-2xl mx-auto">
            Bắt đầu trong vài phút. Luyện tập nhiều như bạn cần để cảm thấy tự tin.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connection line */}
            <div className="hidden md:block absolute top-24 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-accent/50 via-accent to-accent/50" />
            
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="bg-card rounded-2xl p-8 border border-border hover:border-accent/50 hover:shadow-lg transition-all duration-300 h-full">
                  {/* Step number */}
                  <div className="relative z-10 w-12 h-12 rounded-full gradient-accent flex items-center justify-center text-accent-foreground font-bold mb-6 shadow-glow">
                    {step.step}
                  </div>
                  
                  <div className="flex items-center gap-3 mb-4">
                    <step.icon className="w-6 h-6 text-accent" />
                    <h3 className="text-xl font-semibold text-primary dark:text-foreground">
                      {step.title}
                    </h3>
                  </div>
                  
                  <p className="text-primary/70 dark:text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
                
                {/* Arrow for mobile */}
                {index < steps.length - 1 && (
                  <div className="md:hidden flex justify-center my-4">
                    <ArrowRight className="w-6 h-6 text-accent rotate-90" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
