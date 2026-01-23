import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
  Volume2, 
  ArrowRight, 
  X, 
  Mic, 
  MicOff, 
  Video,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Lightbulb
} from 'lucide-react';
import { sampleQuestions, sampleFeedback } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

const InterviewRoom = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answer, setAnswer] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const question = sampleQuestions[currentQuestion];
  const progress = ((currentQuestion + 1) / sampleQuestions.length) * 100;

  const handleSubmitAnswer = () => {
    setIsAnalyzing(true);
    // Simulate AI analysis
    setTimeout(() => {
      setIsAnalyzing(false);
      setShowFeedback(true);
    }, 2000);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < sampleQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setAnswer('');
      setShowFeedback(false);
    } else {
      navigate('/app/sessions');
    }
  };

  const handleEndSession = () => {
    if (confirm('Are you sure you want to end this session?')) {
      navigate('/app/sessions');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-card border-b px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-accent">
              Question {currentQuestion + 1} of {sampleQuestions.length}
            </span>
            <div className="w-32 hidden sm:block">
              <Progress value={progress} className="h-2" />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">02:45</span>
            </div>
            <Button variant="destructive" size="sm" onClick={handleEndSession}>
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">End Session</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-20 pb-8 px-4">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-6">
          {/* AI Interviewer Side */}
          <div className="space-y-6">
            <div className="bg-card rounded-2xl border p-6 md:p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl gradient-accent flex items-center justify-center">
                    <span className="text-3xl">🤖</span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-success flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-success-foreground animate-pulse" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-lg">AI Interviewer</h3>
                  <p className="text-sm text-muted-foreground">Technical Interview • Mid-Level</p>
                </div>
              </div>

              <div className="bg-muted/50 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-medium",
                    question.difficulty === 'easy' ? "bg-success/20 text-success" :
                    question.difficulty === 'medium' ? "bg-warning/20 text-warning" :
                    "bg-destructive/20 text-destructive"
                  )}>
                    {question.difficulty}
                  </span>
                  <span className="text-xs text-muted-foreground">{question.category}</span>
                </div>
                <p className="text-foreground text-lg leading-relaxed">
                  "{question.text}"
                </p>
              </div>

              <div className="flex gap-3 mt-4">
                <Button variant="outline" size="sm">
                  <Volume2 className="w-4 h-4" />
                  Play question
                </Button>
              </div>
            </div>

            {/* STAR Hint */}
            <div className="bg-info/10 border border-info/20 rounded-xl p-4 flex gap-3">
              <Lightbulb className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Pro tip: Use the STAR method</p>
                <p className="text-xs text-muted-foreground">
                  Structure your answer: Situation, Task, Action, Result
                </p>
              </div>
            </div>
          </div>

          {/* Answer Side */}
          <div className="space-y-6">
            {!showFeedback && !isAnalyzing && (
              <div className="bg-card rounded-2xl border p-6 md:p-8">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-foreground">Your Answer</h4>
                  <span className="text-sm text-muted-foreground">{answer.length} characters</span>
                </div>

                <Textarea
                  placeholder="Type your answer here... Be specific and use examples from your experience."
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="min-h-[200px] resize-none text-base"
                />

                {/* Voice/Video Controls */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="flex gap-2">
                    <Button
                      variant={isRecording ? "destructive" : "outline"}
                      size="sm"
                      onClick={() => setIsRecording(!isRecording)}
                    >
                      {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      {isRecording ? 'Stop' : 'Voice'}
                    </Button>
                    <Button variant="outline" size="sm">
                      <Video className="w-4 h-4" />
                      Video
                    </Button>
                  </div>
                  <Button 
                    variant="accent" 
                    onClick={handleSubmitAnswer}
                    disabled={!answer.trim()}
                  >
                    Submit Answer
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Analyzing State */}
            {isAnalyzing && (
              <div className="bg-card rounded-2xl border p-8 text-center">
                <div className="w-16 h-16 rounded-2xl gradient-accent flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Sparkles className="w-8 h-8 text-accent-foreground" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">AI is analyzing your answer...</h4>
                <p className="text-sm text-muted-foreground">This usually takes a few seconds</p>
                <div className="mt-6 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
                  <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
                </div>
              </div>
            )}

            {/* Feedback Panel */}
            {showFeedback && (
              <div className="bg-card rounded-2xl border p-6 md:p-8 space-y-6">
                {/* Overall Score */}
                <div className="text-center pb-6 border-b">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl gradient-accent mb-3">
                    <span className="text-3xl font-bold text-accent-foreground">
                      {sampleFeedback.overallScore}
                    </span>
                  </div>
                  <p className="text-muted-foreground">Overall Score</p>
                </div>

                {/* Score Breakdown */}
                <div>
                  <h5 className="font-semibold text-foreground mb-4">Score Breakdown</h5>
                  <div className="space-y-3">
                    {Object.entries(sampleFeedback.criteria).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground capitalize w-24">{key}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full gradient-accent rounded-full transition-all"
                            style={{ width: `${value}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-10 text-right">{value}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Strengths */}
                <div>
                  <h5 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    Strengths
                  </h5>
                  <ul className="space-y-2">
                    {sampleFeedback.strengths.map((strength, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-success mt-1.5 flex-shrink-0" />
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Improvements */}
                <div>
                  <h5 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-warning" />
                    Areas to Improve
                  </h5>
                  <ul className="space-y-2">
                    {sampleFeedback.improvements.map((improvement, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-warning mt-1.5 flex-shrink-0" />
                        {improvement}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Rewrite Suggestion */}
                <div className="bg-muted/50 rounded-xl p-4">
                  <h5 className="font-semibold text-foreground mb-3">Suggested Improvement</h5>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Your version:</p>
                      <p className="text-sm text-foreground/70 line-through">
                        {sampleFeedback.rewriteSuggestion.original}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Improved version:</p>
                      <p className="text-sm text-foreground">
                        {sampleFeedback.rewriteSuggestion.improved}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button variant="outline" className="flex-1">
                    Retry Question
                  </Button>
                  <Button variant="accent" className="flex-1" onClick={handleNextQuestion}>
                    {currentQuestion < sampleQuestions.length - 1 ? 'Next Question' : 'Finish Session'}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewRoom;
