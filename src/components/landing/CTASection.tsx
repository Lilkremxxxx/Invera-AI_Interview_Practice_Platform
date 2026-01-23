import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';

export const CTASection = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="relative max-w-4xl mx-auto rounded-3xl gradient-hero overflow-hidden">
          {/* Background elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/20 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 px-8 py-16 md:px-16 md:py-20 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 text-accent-foreground/90 mb-6">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Start your journey today</span>
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Ready to Ace Your Next Interview?
            </h2>
            
            <p className="text-lg text-primary-foreground/70 max-w-xl mx-auto mb-8">
              Join thousands of job seekers who improved their interview skills 
              with AI-powered practice. Start free today.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button variant="hero" size="xl" asChild>
                <Link to="/signup">
                  Get started for free
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
