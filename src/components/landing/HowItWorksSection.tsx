import { Target, MessageSquare, TrendingUp, ArrowRight } from 'lucide-react';

const steps = [
  {
    icon: Target,
    step: '01',
    title: 'Choose Your Role',
    description: 'Select from 10+ job roles and experience levels. Get questions tailored to your target position.',
  },
  {
    icon: MessageSquare,
    step: '02',
    title: 'Practice Answering',
    description: 'Answer questions via text, voice, or video. Our AI interviewer creates a realistic interview experience.',
  },
  {
    icon: TrendingUp,
    step: '03',
    title: 'Get Feedback & Improve',
    description: 'Receive instant, structured feedback on your answers. Track your progress over time and see improvement.',
  },
];

export const HowItWorksSection = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            Simple Process
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get started in minutes. Practice as much as you need to feel confident.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connection line */}
            <div className="hidden md:block absolute top-24 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-accent/50 via-accent to-accent/50" />
            
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="bg-card rounded-2xl p-8 border border-border hover:border-accent/50 hover:shadow-lg transition-all duration-300 h-full">
                  {/* Step number */}
                  <div className="relative z-10 w-12 h-12 rounded-full gradient-accent flex items-center justify-center text-accent-foreground font-bold mb-6 shadow-glow">
                    {step.step}
                  </div>
                  
                  <div className="flex items-center gap-3 mb-4">
                    <step.icon className="w-6 h-6 text-accent" />
                    <h3 className="text-xl font-semibold text-foreground">
                      {step.title}
                    </h3>
                  </div>
                  
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
                
                {/* Arrow for mobile */}
                {index < steps.length - 1 && (
                  <div className="md:hidden flex justify-center my-4">
                    <ArrowRight className="w-6 h-6 text-accent rotate-90" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
