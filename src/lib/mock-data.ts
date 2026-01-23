// Mock data for the AI Mock Interviewer application

export const roles = [
  { id: 'frontend', name: 'Frontend Developer', icon: '💻', questions: 45 },
  { id: 'backend', name: 'Backend Developer', icon: '⚙️', questions: 52 },
  { id: 'fullstack', name: 'Full Stack Developer', icon: '🔧', questions: 68 },
  { id: 'data', name: 'Data Scientist', icon: '📊', questions: 38 },
  { id: 'ml', name: 'Machine Learning Engineer', icon: '🤖', questions: 42 },
  { id: 'devops', name: 'DevOps Engineer', icon: '🚀', questions: 35 },
  { id: 'product', name: 'Product Manager', icon: '📋', questions: 40 },
  { id: 'marketing', name: 'Marketing Manager', icon: '📢', questions: 32 },
  { id: 'sales', name: 'Sales Representative', icon: '💼', questions: 28 },
  { id: 'design', name: 'UX Designer', icon: '🎨', questions: 36 },
];

export const levels = [
  { id: 'intern', name: 'Intern', description: 'Entry-level, learning fundamentals' },
  { id: 'junior', name: 'Junior', description: '0-2 years experience' },
  { id: 'mid', name: 'Mid-Level', description: '2-5 years experience' },
  { id: 'senior', name: 'Senior', description: '5+ years experience' },
];

export const answerModes = [
  { id: 'text', name: 'Text', icon: '✍️', description: 'Type your answers' },
  { id: 'voice', name: 'Voice', icon: '🎤', description: 'Speak your answers' },
  { id: 'video', name: 'Video', icon: '📹', description: 'Record video responses' },
];

export const questionCounts = [5, 10, 15];

export const timeLimits = [
  { id: 'none', name: 'No limit' },
  { id: '2', name: '2 min/question' },
  { id: '3', name: '3 min/question' },
  { id: '5', name: '5 min/question' },
];

export const difficulties = [
  { id: 'easy', name: 'Easy', color: 'success' },
  { id: 'medium', name: 'Medium', color: 'warning' },
  { id: 'hard', name: 'Hard', color: 'destructive' },
];

export const sampleQuestions = [
  {
    id: 1,
    text: "Tell me about yourself and why you're interested in this role.",
    category: 'Behavioral',
    difficulty: 'easy',
  },
  {
    id: 2,
    text: "Describe a challenging project you worked on and how you overcame obstacles.",
    category: 'Behavioral',
    difficulty: 'medium',
  },
  {
    id: 3,
    text: "Explain the difference between REST and GraphQL APIs. When would you choose one over the other?",
    category: 'Technical',
    difficulty: 'medium',
  },
  {
    id: 4,
    text: "How would you optimize the performance of a slow-loading web application?",
    category: 'Technical',
    difficulty: 'hard',
  },
  {
    id: 5,
    text: "Describe your experience with version control systems like Git.",
    category: 'Technical',
    difficulty: 'easy',
  },
  {
    id: 6,
    text: "How do you handle disagreements with team members about technical decisions?",
    category: 'Behavioral',
    difficulty: 'medium',
  },
  {
    id: 7,
    text: "Walk me through your approach to debugging a complex issue in production.",
    category: 'Technical',
    difficulty: 'hard',
  },
  {
    id: 8,
    text: "What's your experience with agile methodologies? How do you manage your workflow?",
    category: 'Process',
    difficulty: 'easy',
  },
  {
    id: 9,
    text: "Design a system that can handle millions of concurrent users. What are the key considerations?",
    category: 'System Design',
    difficulty: 'hard',
  },
  {
    id: 10,
    text: "Where do you see yourself in 5 years? How does this role fit into your career goals?",
    category: 'Behavioral',
    difficulty: 'easy',
  },
];

export const sampleFeedback = {
  overallScore: 78,
  criteria: {
    relevance: 85,
    coherence: 75,
    structure: 72,
    wording: 80,
    delivery: 76,
  },
  strengths: [
    "Clear articulation of technical concepts",
    "Good use of specific examples from past experience",
    "Demonstrated problem-solving approach",
    "Confident delivery with appropriate pacing",
  ],
  improvements: [
    "Could provide more quantifiable results",
    "Consider using the STAR method for behavioral questions",
    "Add more context about the impact of your decisions",
    "Reduce filler words like 'um' and 'like'",
  ],
  rewriteSuggestion: {
    original: "I worked on a project that was pretty complex and we had some issues but we fixed them.",
    improved: "I led a migration project that involved transitioning our legacy system to a microservices architecture. When we encountered performance bottlenecks, I implemented caching strategies that reduced response times by 40% and improved user satisfaction scores.",
  },
  nextSteps: [
    "Practice more system design questions",
    "Review STAR method for behavioral answers",
    "Try the 'Senior Frontend Developer' question set",
  ],
};

export const userStats = {
  totalSessions: 24,
  averageScore: 76,
  practiceStreak: 7,
  totalQuestions: 186,
  improvementRate: 12,
};

export const recentSessions = [
  {
    id: '1',
    role: 'Frontend Developer',
    level: 'Mid-Level',
    date: '2024-01-20',
    score: 82,
    questionsCount: 10,
    mode: 'text',
    duration: '25 min',
  },
  {
    id: '2',
    role: 'Backend Developer',
    level: 'Senior',
    date: '2024-01-19',
    score: 75,
    questionsCount: 10,
    mode: 'voice',
    duration: '32 min',
  },
  {
    id: '3',
    role: 'Full Stack Developer',
    level: 'Junior',
    date: '2024-01-18',
    score: 88,
    questionsCount: 5,
    mode: 'text',
    duration: '12 min',
  },
  {
    id: '4',
    role: 'Product Manager',
    level: 'Mid-Level',
    date: '2024-01-17',
    score: 71,
    questionsCount: 10,
    mode: 'voice',
    duration: '28 min',
  },
  {
    id: '5',
    role: 'Frontend Developer',
    level: 'Senior',
    date: '2024-01-15',
    score: 79,
    questionsCount: 15,
    mode: 'video',
    duration: '45 min',
  },
];

export const progressData = {
  daily: [
    { date: 'Mon', score: 72 },
    { date: 'Tue', score: 75 },
    { date: 'Wed', score: 74 },
    { date: 'Thu', score: 78 },
    { date: 'Fri', score: 80 },
    { date: 'Sat', score: 82 },
    { date: 'Sun', score: 85 },
  ],
  weekly: [
    { date: 'Week 1', score: 68 },
    { date: 'Week 2', score: 72 },
    { date: 'Week 3', score: 76 },
    { date: 'Week 4', score: 82 },
  ],
  monthly: [
    { date: 'Oct', score: 62 },
    { date: 'Nov', score: 70 },
    { date: 'Dec', score: 75 },
    { date: 'Jan', score: 82 },
  ],
};

export const testimonials = [
  {
    id: 1,
    name: 'Sarah Chen',
    role: 'Software Engineer at Google',
    avatar: 'SC',
    content: "This platform helped me land my dream job! The AI feedback was incredibly detailed and helped me improve my communication skills significantly.",
    rating: 5,
  },
  {
    id: 2,
    name: 'Michael Rodriguez',
    role: 'Product Manager at Meta',
    avatar: 'MR',
    content: "The structured feedback and progress tracking kept me motivated throughout my job search. Highly recommend for anyone preparing for tech interviews.",
    rating: 5,
  },
  {
    id: 3,
    name: 'Emily Watson',
    role: 'Data Scientist at Amazon',
    avatar: 'EW',
    content: "The role-specific questions were spot-on. I felt much more confident going into my actual interviews after practicing here.",
    rating: 5,
  },
];

export const pricingPlans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Perfect for getting started',
    features: [
      '5 practice sessions/month',
      'Text-based answers only',
      'Basic feedback',
      '3 roles available',
      'Community support',
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 19,
    description: 'For serious job seekers',
    features: [
      'Unlimited practice sessions',
      'Text, Voice & Video modes',
      'Advanced AI feedback',
      'All roles & levels',
      'Progress analytics',
      'Priority support',
      'Export to PDF',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
];

export const faqs = [
  {
    question: 'How does the AI feedback work?',
    answer: 'Our AI analyzes your answers based on multiple criteria including relevance, coherence, structure, and wording. For voice and video modes, we also analyze delivery aspects like pace and confidence.',
  },
  {
    question: 'Can I practice for specific companies?',
    answer: 'Yes! Our Pro plan includes company-specific question sets for top tech companies like Google, Meta, Amazon, and more.',
  },
  {
    question: 'Is my data private?',
    answer: 'Absolutely. We take privacy seriously. Your practice sessions and recordings are encrypted and never shared with third parties.',
  },
  {
    question: 'How accurate is the voice transcription?',
    answer: 'Our speech-to-text technology achieves over 95% accuracy for clear English speech. We support multiple accents and continue to improve.',
  },
];
