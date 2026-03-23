import { Target, MessageSquare, TrendingUp, ArrowRight } from 'lucide-react';
import { useLanguage, translations } from '@/contexts/LanguageContext';

const stepIcons = [Target, MessageSquare, TrendingUp];
const stepNumbers = ['01', '02', '03'];

export const HowItWorksSection = () => {
  const { language, t } = useLanguage();
  const steps = translations.how.steps;

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            {t('how', 'badge')}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-primary dark:text-foreground mb-4">
            {t('how', 'title')}
          </h2>
          <p className="text-lg text-primary/70 dark:text-muted-foreground max-w-2xl mx-auto">
            {t('how', 'desc')}
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-24 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-accent/50 via-accent to-accent/50" />
            
            {steps.map((step, index) => {
              const Icon = stepIcons[index];
              return (
                <div key={index} className="relative">
                  <div className="bg-card rounded-2xl p-8 border border-border hover:border-accent/50 hover:shadow-lg transition-all duration-300 h-full">
                    <div className="relative z-10 w-12 h-12 rounded-full gradient-accent flex items-center justify-center text-accent-foreground font-bold mb-6 shadow-glow">
                      {stepNumbers[index]}
                    </div>
                    
                    <div className="flex items-center gap-3 mb-4">
                      <Icon className="w-6 h-6 text-accent" />
                      <h3 className="text-xl font-semibold text-primary dark:text-foreground">
                        {step.title[language]}
                      </h3>
                    </div>
                    
                    <p className="text-primary/70 dark:text-muted-foreground leading-relaxed">
                      {step.desc[language]}
                    </p>
                  </div>
                  
                  {index < steps.length - 1 && (
                    <div className="md:hidden flex justify-center my-4">
                      <ArrowRight className="w-6 h-6 text-accent rotate-90" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
