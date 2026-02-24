import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';

export const CTASection = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="relative max-w-4xl mx-auto rounded-3xl bg-card border-2 border-border shadow-xl overflow-hidden">
          {/* Removed blur effects - clean background only */}

          <div className="relative z-10 px-8 py-16 md:px-16 md:py-20 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/30 mb-6">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold text-primary dark:text-foreground">Bắt đầu hành trình của bạn hôm nay</span>
            </div>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-primary dark:text-foreground mb-6 leading-tight">
              Sẵn sàng chinh phục buổi phỏng vấn tiếp theo?
            </h2>
            
            <p className="text-base md:text-lg text-primary/70 dark:text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Tham gia cùng hàng nghìn người tìm việc đã cải thiện kỹ năng phỏng vấn 
              với luyện tập được hỗ trợ bởi AI. Bắt đầu miễn phí hôm nay.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button variant="accent" size="xl" asChild className="font-semibold shadow-md hover:shadow-lg">
                <Link to="/signup" className="gap-2">
                  Bắt đầu miễn phí
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
