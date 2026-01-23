import { AlertCircle, Clock, TrendingDown } from 'lucide-react';

const painPoints = [
  {
    icon: AlertCircle,
    title: "Unprepared for tough questions",
    description: "Real interviews throw curveballs. Without practice, even great candidates stumble on behavioral and technical questions.",
  },
  {
    icon: Clock,
    title: "No time for mock interviews",
    description: "Scheduling mock interviews with friends or mentors is hard. You need practice that fits your schedule, anytime.",
  },
  {
    icon: TrendingDown,
    title: "No feedback loop",
    description: "How do you know if you're improving? Without structured feedback, you're practicing blind and repeating mistakes.",
  },
];

export const PainPointsSection = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Why Interview Practice Matters
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            The job market is competitive. Don't let lack of preparation hold you back.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {painPoints.map((point, index) => (
            <div 
              key={index} 
              className="group p-8 rounded-2xl bg-card border border-border hover:border-accent/50 hover:shadow-lg transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <point.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                {point.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {point.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
