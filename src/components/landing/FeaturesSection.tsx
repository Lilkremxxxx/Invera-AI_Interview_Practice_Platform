import { 
  Target, 
  Mic, 
  BarChart3, 
  History, 
  Volume2, 
  Eye,
  CheckCircle2
} from 'lucide-react';

const features = [
  {
    icon: Target,
    title: 'Role-Based Questions',
    description: 'Curated question sets for Frontend, Backend, Data Science, Product, Marketing, and more.',
    highlights: ['10+ job roles', 'Multiple experience levels', 'Industry-specific'],
  },
  {
    icon: Mic,
    title: 'Multiple Answer Modes',
    description: 'Practice your way—type your answers, record your voice, or use video for full simulation.',
    highlights: ['Text input', 'Voice recording', 'Video mode'],
  },
  {
    icon: BarChart3,
    title: 'Structured Feedback',
    description: 'Get detailed analysis on relevance, coherence, structure, and delivery with improvement tips.',
    highlights: ['Score breakdown', 'Strengths identified', 'Rewrite suggestions'],
  },
  {
    icon: History,
    title: 'Progress Tracking',
    description: 'See your improvement over time with detailed analytics and session history.',
    highlights: ['Visual charts', 'Session history', 'Streak tracking'],
  },
  {
    icon: Volume2,
    title: 'Text-to-Speech',
    description: 'Have your feedback read aloud. Great for reviewing on the go or accessibility.',
    highlights: ['Natural voice', 'Adjustable speed', 'Multiple languages'],
    optional: true,
  },
  {
    icon: Eye,
    title: 'Expression Analysis',
    description: 'Get insights on your non-verbal communication during video practice sessions.',
    highlights: ['Eye contact', 'Facial expressions', 'Confidence cues'],
    optional: true,
  },
];

export const FeaturesSection = () => {
  return (
    <section id="features" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            Features
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Everything You Need to Prepare
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Comprehensive tools and features designed to help you succeed in your interviews.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="group relative bg-card rounded-2xl p-6 border border-border hover:border-accent/50 hover:shadow-lg transition-all duration-300"
            >
              {feature.optional && (
                <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">
                  Optional
                </span>
              )}
              
              <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <feature.icon className="w-6 h-6" />
              </div>
              
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              
              <p className="text-muted-foreground mb-4 leading-relaxed">
                {feature.description}
              </p>
              
              <ul className="space-y-2">
                {feature.highlights.map((highlight, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
