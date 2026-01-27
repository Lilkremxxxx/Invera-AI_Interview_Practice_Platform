import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, Play, CheckCircle2 } from 'lucide-react';

export const HeroSection = () => {
  return (
    <section className="relative min-h-screen gradient-hero overflow-hidden isolate">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden -z-10 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 -right-32 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 -left-32 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-slow delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/5 rounded-full blur-3xl" />
      </div>

      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-10 -z-10 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }}
      />

      <div className="container mx-auto px-4 pt-32 pb-20 relative">
        <div className="max-w-4xl mx-auto text-center relative">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 text-accent-foreground/90 mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-sm font-medium">Luyện tập phỏng vấn với AI</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6 leading-tight animate-slide-up relative z-30">
            Chinh phục buổi phỏng vấn tiếp theo với{' '}
            <span className="text-gradient relative inline-block">công nghệ AI</span>{' '}
            tiên tiến
          </h1>

          {/* Description */}
          <p className="text-lg md:text-xl text-primary-foreground/70 max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: '100ms' }}>
            Nhận phản hồi cá nhân hóa, theo dõi tiến độ và xây dựng sự tự tin 
            với các buổi phỏng vấn mô phỏng thực tế phù hợp với vị trí mục tiêu của bạn.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <Button variant="hero" size="xl" asChild>
              <Link to="/signup">
                Bắt đầu luyện tập miễn phí
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button variant="hero-outline" size="xl">
              <Play className="w-5 h-5" />
              Xem demo
            </Button>
          </div>

          {/* Social Proof */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-primary-foreground/70 animate-fade-in" style={{ animationDelay: '400ms' }}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-accent" />
              <span>10.000+ người dùng</span>
            </div>
            <div className="hidden sm:block w-1 h-1 rounded-full bg-primary-foreground/30" />
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-accent" />
              <span>500+ câu hỏi phỏng vấn</span>
            </div>
            <div className="hidden sm:block w-1 h-1 rounded-full bg-primary-foreground/30" />
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-accent" />
              <span>Đánh giá 4.9/5</span>
            </div>
          </div>
        </div>

        {/* Hero Image/Mockup */}
        <div className="mt-16 max-w-5xl mx-auto animate-slide-up relative" style={{ animationDelay: '300ms' }}>
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-accent/20 blur-3xl rounded-3xl -z-10 pointer-events-none" aria-hidden="true" />
            
            {/* Main card */}
            <div className="relative bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border/50 overflow-hidden">
              {/* Browser bar */}
              <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-destructive/60" />
                  <div className="w-3 h-3 rounded-full bg-warning/60" />
                  <div className="w-3 h-3 rounded-full bg-success/60" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1 rounded-md bg-background text-xs text-muted-foreground">
                    invera.com/app/interview
                  </div>
                </div>
              </div>
              
              {/* Content mockup */}
              <div className="p-6 md:p-8 grid md:grid-cols-2 gap-6">
                {/* AI Interviewer */}
                <div className="bg-muted/30 rounded-xl p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl gradient-accent flex items-center justify-center">
                      <span className="text-2xl">🤖</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Người phỏng vấn AI</h3>
                      <p className="text-sm text-muted-foreground">Phỏng vấn kỹ thuật</p>
                    </div>
                  </div>
                  <div className="bg-background rounded-lg p-4">
                    <p className="text-foreground leading-relaxed">
                      "Bạn có thể giải thích sự khác biệt giữa REST và GraphQL API không? 
                      Khi nào bạn sẽ chọn cái này thay vì cái kia?"
                    </p>
                  </div>
                </div>

                {/* Answer area */}
                <div className="bg-muted/30 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-muted-foreground">Câu trả lời của bạn</span>
                    <span className="text-xs text-accent font-medium">Câu hỏi 3/10</span>
                  </div>
                  <div className="bg-background rounded-lg p-4 h-32 border-2 border-dashed border-border flex items-center justify-center">
                    <span className="text-muted-foreground text-sm">Nhập hoặc nói câu trả lời của bạn...</span>
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button variant="accent" size="sm">
                      Gửi câu trả lời
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
