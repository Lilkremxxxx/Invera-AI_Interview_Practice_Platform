import { Suspense } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/landing/HeroSection';
import { PainPointsSection } from '@/components/landing/PainPointsSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { DashboardDemoSection } from '@/components/landing/DashboardDemoSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { FAQSection } from '@/components/landing/FAQSection';
import { CTASection } from '@/components/landing/CTASection';

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <Suspense fallback={null}>
        <PainPointsSection />
        <HowItWorksSection />
        <FeaturesSection />
        <DashboardDemoSection />
        <PricingSection />
        <FAQSection />
        <CTASection />
      </Suspense>
      <Footer />
    </div>
  );
};

export default Index;
