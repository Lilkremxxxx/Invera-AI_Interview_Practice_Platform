import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, Play, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export const HeroSection = () => {
  const { t } = useLanguage();
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
                {t('hero', 'badge')}
              </span>
            </div>
          </div>

          {/* Headline - Near-black text for maximum contrast */}
          <h1 className="text-center mb-6 sm:mb-8 animate-slide-up">
            <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.15] tracking-tight text-primary dark:text-foreground">
              {t('hero', 'headline1')}
            </span>
            <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.15] tracking-tight mt-2 sm:mt-3 text-primary dark:text-foreground">
              {t('hero', 'headline2')}{' '}
              <span className="text-gradient whitespace-nowrap">{t('hero', 'headline3')}</span>
            </span>
            <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.15] tracking-tight mt-2 sm:mt-3 text-primary dark:text-foreground">
              {t('hero', 'headline4')}
            </span>
          </h1>

          {/* Description - Medium-dark gray for clear readability */}
          <p 
            className="text-center text-base sm:text-lg lg:text-xl max-w-3xl mx-auto mb-10 sm:mb-12 lg:mb-14 leading-relaxed px-4 animate-slide-up text-primary/70 dark:text-muted-foreground"
            style={{ animationDelay: '100ms' }}
          >
            {t('hero', 'description')}
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
                {t('hero', 'ctaPrimary')}
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
                {t('hero', 'ctaDemo')}
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
              <span className="text-sm font-semibold text-primary/70 dark:text-muted-foreground">{t('hero', 'stat1')}</span>
            </div>
            <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-border" />
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" />
              <span className="text-sm font-semibold text-primary/70 dark:text-muted-foreground">{t('hero', 'stat2')}</span>
            </div>
            <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-border" />
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" />
              <span className="text-sm font-semibold text-primary/70 dark:text-muted-foreground">{t('hero', 'stat3')}</span>
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
                      <h3 className="font-bold text-primary dark:text-foreground">{t('hero', 'mockRole')}</h3>
                      <p className="text-sm text-primary/60 dark:text-muted-foreground font-medium">{t('hero', 'mockType')}</p>
                    </div>
                  </div>
                  <div className="bg-muted/40 dark:bg-muted/50 rounded-lg p-4 border border-border">
                    <p className="text-primary dark:text-foreground leading-relaxed text-sm sm:text-base font-medium">
                      {t('hero', 'mockQ')}
                    </p>
                  </div>
                </div>

                {/* Answer area */}
                <div className="bg-card rounded-xl p-6 border-2 border-border shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold text-primary/60 dark:text-muted-foreground">{t('hero', 'mockAnswer')}</span>
                    <span className="text-xs text-accent-foreground font-bold px-2 py-1 bg-accent rounded-md">{t('hero', 'mockCount')}</span>
                  </div>
                  <div className="bg-muted/40 dark:bg-muted/50 rounded-lg p-4 h-32 border-2 border-dashed border-border flex items-center justify-center">
                    <span className="text-primary/40 dark:text-muted-foreground text-sm font-medium">{t('hero', 'mockPlaceholder')}</span>
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button variant="accent" size="sm" className="font-semibold shadow-sm">
                      {t('hero', 'mockSubmit')}
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
