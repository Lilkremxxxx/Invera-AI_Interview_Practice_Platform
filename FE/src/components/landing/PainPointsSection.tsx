import { AlertCircle, Clock, TrendingDown } from 'lucide-react';
import { useLanguage, translations } from '@/contexts/LanguageContext';

const painIcons = [AlertCircle, Clock, TrendingDown];

export const PainPointsSection = () => {
  const { language, t } = useLanguage();
  const items = translations.pain.items;

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-primary dark:text-foreground mb-4">
            {t('pain', 'sectionTitle')}
          </h2>
          <p className="text-lg text-primary/70 dark:text-muted-foreground max-w-2xl mx-auto">
            {t('pain', 'sectionDesc')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {items.map((point, index) => {
            const Icon = painIcons[index];
            return (
              <div 
                key={index} 
                className="group p-8 rounded-2xl bg-card border border-border hover:border-accent/50 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-semibold text-primary dark:text-foreground mb-3">
                  {point.title[language]}
                </h3>
                <p className="text-primary/70 dark:text-muted-foreground leading-relaxed">
                  {point.desc[language]}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
