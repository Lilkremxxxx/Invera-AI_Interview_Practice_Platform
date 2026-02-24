import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, Play, CheckCircle2 } from 'lucide-react';

export const HeroSection = () => {
  return (
    <section className="relative min-h-screen bg-background overflow-hidden">
      {/* Removed heavy glow effects - clean background only */}
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 lg:pt-32 pb-16 sm:pb-20 lg:pb-24 relative">
        <div className="max-w-5xl mx-auto">
          {/* Badge - Clean design with border */}
          <div className="flex justify-center mb-6 sm:mb-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/30">
              <span className="w-2 h-2 rounded-full bg-accent" />
              <span className="text-sm font-semibold text-primary dark:text-foreground">
                Luyện tập phỏng vấn với AI
              </span>
            </div>
          </div>

          {/* Headline - Near-black text for maximum contrast */}
          <h1 className="text-center mb-6 sm:mb-8 animate-slide-up">
            <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.15] tracking-tight text-primary dark:text-foreground">
              Chinh phục buổi phỏng vấn
            </span>
            <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.15] tracking-tight mt-2 sm:mt-3 text-primary dark:text-foreground">
              tiếp theo với{' '}
              <span className="text-gradient whitespace-nowrap">công nghệ AI</span>
            </span>
            <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.15] tracking-tight mt-2 sm:mt-3 text-primary dark:text-foreground">
              tiên tiến
            </span>
          </h1>

          {/* Description - Medium-dark gray for clear readability */}
          <p 
            className="text-center text-base sm:text-lg lg:text-xl max-w-3xl mx-auto mb-10 sm:mb-12 lg:mb-14 leading-relaxed px-4 animate-slide-up text-primary/70 dark:text-muted-foreground"
            style={{ animationDelay: '100ms' }}
          >
            Nhận phản hồi cá nhân hóa, theo dõi tiến độ và xây dựng sự tự tin 
            với các buổi phỏng vấn mô phỏng thực tế phù hợp với vị trí mục tiêu của bạn.
          </p>

          {/* CTAs - Strong contrast */}
          <div 
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 sm:mb-16 lg:mb-20 animate-slide-up"
            style={{ animationDelay: '200ms' }}
          >
            <Button 
              variant="accent" 
              size="xl" 
              asChild
              className="w-full sm:w-auto font-semibold shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
            >
              <Link to="/signup" className="gap-2">
                Bắt đầu luyện tập miễn phí
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button 
              variant="outline" 
              size="xl" 
              asChild
              className="w-full sm:w-auto font-semibold border-2 hover:bg-muted"
            >
              <Link to="#demo" className="gap-2">
                <Play className="w-5 h-5" />
                Xem demo
              </Link>
            </Button>
          </div>

          {/* Social Proof - Clear contrast */}
          <div 
            className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 animate-fade-in px-4"
            style={{ animationDelay: '400ms' }}
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" />
              <span className="text-sm font-semibold text-primary/70 dark:text-muted-foreground">10.000+ người dùng</span>
            </div>
            <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-border" />
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" />
              <span className="text-sm font-semibold text-primary/70 dark:text-muted-foreground">500+ câu hỏi</span>
            </div>
            <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-border" />
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" />
              <span className="text-sm font-semibold text-primary/70 dark:text-muted-foreground">Đánh giá 4.9/5</span>
            </div>
          </div>
        </div>

        {/* Hero Image/Mockup - Clean card with clear borders */}
        <div 
          className="mt-16 sm:mt-20 lg:mt-24 max-w-6xl mx-auto animate-slide-up px-4"
          style={{ animationDelay: '300ms' }}
        >
          <div className="relative">
            {/* Removed heavy glow - clean shadow only */}
            
            {/* Main card - Clean white with clear border */}
            <div className="relative bg-card rounded-2xl shadow-xl border-2 border-border overflow-hidden">
              {/* Browser bar */}
              <div className="flex items-center gap-2 px-4 py-3 bg-muted border-b-2 border-border">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-destructive" />
                  <div className="w-3 h-3 rounded-full bg-warning" />
                  <div className="w-3 h-3 rounded-full bg-success" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1 rounded-md bg-background text-xs text-muted-foreground font-medium border border-border">
                    invera.com/app/interview
                  </div>
                </div>
              </div>
              
              {/* Content mockup */}
              <div className="p-6 sm:p-8 lg:p-10 grid md:grid-cols-2 gap-6 lg:gap-8 bg-muted/20 dark:bg-muted/30">
                {/* AI Interviewer */}
                <div className="bg-card rounded-xl p-6 border-2 border-border shadow-sm">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl gradient-accent flex items-center justify-center shadow-md">
                      <span className="text-2xl">🤖</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-primary dark:text-foreground">Người phỏng vấn AI</h3>
                      <p className="text-sm text-primary/60 dark:text-muted-foreground font-medium">Phỏng vấn kỹ thuật</p>
                    </div>
                  </div>
                  <div className="bg-muted/40 dark:bg-muted/50 rounded-lg p-4 border border-border">
                    <p className="text-primary dark:text-foreground leading-relaxed text-sm sm:text-base font-medium">
                      "Bạn có thể giải thích sự khác biệt giữa REST và GraphQL API không? 
                      Khi nào bạn sẽ chọn cái này thay vì cái kia?"
                    </p>
                  </div>
                </div>

                {/* Answer area */}
                <div className="bg-card rounded-xl p-6 border-2 border-border shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold text-primary/60 dark:text-muted-foreground">Câu trả lời của bạn</span>
                    <span className="text-xs text-accent-foreground font-bold px-2 py-1 bg-accent rounded-md">Câu hỏi 3/10</span>
                  </div>
                  <div className="bg-muted/40 dark:bg-muted/50 rounded-lg p-4 h-32 border-2 border-dashed border-border flex items-center justify-center">
                    <span className="text-primary/40 dark:text-muted-foreground text-sm font-medium">Nhập hoặc nói câu trả lời của bạn...</span>
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button variant="accent" size="sm" className="font-semibold shadow-sm">
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
