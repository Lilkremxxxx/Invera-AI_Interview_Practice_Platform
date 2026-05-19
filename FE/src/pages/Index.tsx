import { lazy, Suspense } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/landing/HeroSection';

const PainPointsSection = lazy(() => import('@/components/landing/PainPointsSection').then((module) => ({ default: module.PainPointsSection })));
const HowItWorksSection = lazy(() => import('@/components/landing/HowItWorksSection').then((module) => ({ default: module.HowItWorksSection })));
const FeaturesSection = lazy(() => import('@/components/landing/FeaturesSection').then((module) => ({ default: module.FeaturesSection })));
const DashboardDemoSection = lazy(() => import('@/components/landing/DashboardDemoSection').then((module) => ({ default: module.DashboardDemoSection })));
const PricingSection = lazy(() => import('@/components/landing/PricingSection').then((module) => ({ default: module.PricingSection })));
const FAQSection = lazy(() => import('@/components/landing/FAQSection').then((module) => ({ default: module.FAQSection })));
const CTASection = lazy(() => import('@/components/landing/CTASection').then((module) => ({ default: module.CTASection })));

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
