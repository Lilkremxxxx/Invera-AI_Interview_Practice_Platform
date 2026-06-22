import { useState } from 'react';

import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { MascotDecoration } from './MascotDecoration';
import { PricingComparisonSheet } from '@/components/pricing/PricingComparisonSheet';

const pricingSectionCopy = {
  badge: { vi: 'Bảng giá', en: 'Pricing' },
  title: { vi: 'Bảng giá so sánh rõ ràng', en: 'A clear pricing comparison sheet' },
  description: {
    vi: 'So sánh trực tiếp các gói trong một sheet, giống bảng tính bạn đã gửi.',
    en: 'Compare every plan in a single sheet, matching the spreadsheet-style layout you shared.',
  },
  month: { vi: 'Theo tháng', en: 'Monthly' },
  year: { vi: 'Theo năm', en: 'Yearly' },
} as const;

export const PricingSection = () => {
  const [billing, setBilling] = useState<'month' | 'year'>('month');
  const { language } = useLanguage();

  return (
    <section id="pricing" className="relative scroll-mt-24 overflow-hidden py-20 bg-background">
      <MascotDecoration
        index={6}
        className="absolute left-2 top-24 hidden w-24 -rotate-6 opacity-90 lg:block xl:left-12 xl:w-32"
      />
      <div className="container relative mx-auto px-4">
        <div className="text-center mb-10">
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            {pricingSectionCopy.badge[language]}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-primary dark:text-foreground mb-4">
            {pricingSectionCopy.title[language]}
          </h2>
          <p className="text-lg text-primary/70 dark:text-muted-foreground max-w-2xl mx-auto">
            {pricingSectionCopy.description[language]}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 mb-12">
          <button
            onClick={() => setBilling('month')}
            className={cn(
              'px-5 py-2 rounded-full text-sm font-medium transition-all',
              billing === 'month'
                ? 'bg-accent text-white shadow'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            {pricingSectionCopy.month[language]}
          </button>
          <button
            onClick={() => setBilling('year')}
            className={cn(
              'px-5 py-2 rounded-full text-sm font-medium transition-all',
              billing === 'year'
                ? 'bg-accent text-white shadow'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            {pricingSectionCopy.year[language]}
          </button>
        </div>

        <div className="max-w-7xl mx-auto">
          <PricingComparisonSheet
            billingPeriod={billing}
            language={language}
          />
        </div>
      </div>
    </section>
  );
};
