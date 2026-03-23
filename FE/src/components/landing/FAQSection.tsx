import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useLanguage, translations } from '@/contexts/LanguageContext';

export const FAQSection = () => {
  const { language, t } = useLanguage();
  const items = translations.faq.items;

  return (
    <section id="faq" className="scroll-mt-24 py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            {t('faq', 'badge')}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-primary dark:text-foreground mb-4">
            {t('faq', 'title')}
          </h2>
          <p className="text-lg text-primary/70 dark:text-muted-foreground max-w-2xl mx-auto">
            {t('faq', 'desc')}
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {items.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="bg-card border border-border rounded-xl px-6 data-[state=open]:border-accent/50 transition-colors"
              >
                <AccordionTrigger className="text-left text-primary dark:text-foreground hover:text-accent py-5">
                  {faq.q[language]}
                </AccordionTrigger>
                <AccordionContent className="text-primary/70 dark:text-muted-foreground pb-5">
                  {faq.a[language]}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};
