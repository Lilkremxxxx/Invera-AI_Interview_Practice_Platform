import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export const CTASection = () => {
  const { t } = useLanguage();
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="relative max-w-4xl mx-auto rounded-3xl bg-card border-2 border-border shadow-xl overflow-hidden">
          <div className="relative z-10 px-8 py-16 md:px-16 md:py-20 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/30 mb-6">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold text-primary dark:text-foreground">{t('cta', 'badge')}</span>
            </div>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-primary dark:text-foreground mb-6 leading-tight">
              {t('cta', 'title')}
            </h2>
            
            <p className="text-base md:text-lg text-primary/70 dark:text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              {t('cta', 'desc')}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button variant="accent" size="xl" asChild className="font-semibold shadow-md hover:shadow-lg">
                <Link to="/signup" className="gap-2">
                  {t('cta', 'button')}
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
