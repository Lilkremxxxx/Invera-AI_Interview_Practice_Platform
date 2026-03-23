import { 
  Target, 
  Mic, 
  BarChart3, 
  History, 
  Volume2, 
  Eye,
  CheckCircle2
} from 'lucide-react';
import { useLanguage, translations } from '@/contexts/LanguageContext';

const featureIcons = [Target, Mic, BarChart3, History, Volume2, Eye];

export const FeaturesSection = () => {
  const { language, t } = useLanguage();

  const items = translations.features.items;

  return (
    <section id="features" className="scroll-mt-24 py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            {t('features', 'badge')}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-primary dark:text-foreground mb-4">
            {t('features', 'title')}
          </h2>
          <p className="text-lg text-primary/70 dark:text-muted-foreground max-w-2xl mx-auto">
            {t('features', 'desc')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {items.map((feature, index) => {
            const Icon = featureIcons[index];
            return (
              <div 
                key={index}
                className="group relative bg-card rounded-2xl p-6 border border-border hover:border-accent/50 hover:shadow-lg transition-all duration-300"
              >
                {'optional' in feature && feature.optional && (
                  <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">
                    {t('features', 'optional')}
                  </span>
                )}
                
                <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Icon className="w-6 h-6" />
                </div>
                
                <h3 className="text-xl font-semibold text-primary dark:text-foreground mb-2">
                  {feature.title[language]}
                </h3>
                
                <p className="text-primary/70 dark:text-muted-foreground mb-4 leading-relaxed">
                  {feature.desc[language]}
                </p>
                
                <ul className="space-y-2">
                  {feature.highlights.map((highlight, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-primary/60 dark:text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                      {highlight[language]}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
