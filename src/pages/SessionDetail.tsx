import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  Download, 
  Target,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import { sampleQuestions, sampleFeedback, recentSessions } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

const SessionDetail = () => {
  const { id } = useParams();
  const session = recentSessions.find(s => s.id === id) || recentSessions[0];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/app/sessions">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{session.role}</h1>
            <p className="text-muted-foreground">
              {session.level} • {session.date} • {session.duration}
            </p>
          </div>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4" />
          Export PDF
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold text-accent-foreground">{session.score}%</span>
            </div>
            <p className="text-sm text-muted-foreground">Overall Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
              <Target className="w-6 h-6 text-accent" />
            </div>
            <p className="text-2xl font-bold text-foreground">{session.questionsCount}</p>
            <p className="text-sm text-muted-foreground">Questions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-6 h-6 text-success" />
            </div>
            <p className="text-2xl font-bold text-foreground">+8%</p>
            <p className="text-sm text-muted-foreground">Improvement</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6 text-info" />
            </div>
            <p className="text-2xl font-bold text-foreground">{session.duration}</p>
            <p className="text-sm text-muted-foreground">Duration</p>
          </CardContent>
        </Card>
      </div>

      {/* Questions Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Question Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sampleQuestions.slice(0, session.questionsCount).map((question, index) => {
              const score = Math.floor(Math.random() * 30) + 70;
              return (
                <div 
                  key={question.id}
                  className="flex items-start gap-4 p-4 rounded-xl bg-muted/50"
                >
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <span className="font-semibold text-accent">{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
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
                    <p className="text-foreground line-clamp-2">{question.text}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={cn(
                      "text-lg font-semibold",
                      score >= 80 ? "text-success" : score >= 60 ? "text-warning" : "text-destructive"
                    )}>
                      {score}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Summary Feedback */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" />
              Key Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {sampleFeedback.strengths.map((strength, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-success mt-2 flex-shrink-0" />
                  <span className="text-muted-foreground">{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-warning" />
              Areas to Improve
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {sampleFeedback.improvements.map((improvement, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-warning mt-2 flex-shrink-0" />
                  <span className="text-muted-foreground">{improvement}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Recommended Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4">
            {sampleFeedback.nextSteps.map((step, i) => (
              <div key={i} className="p-4 rounded-xl bg-muted/50">
                <div className="w-8 h-8 rounded-lg gradient-accent flex items-center justify-center mb-3">
                  <span className="text-sm font-bold text-accent-foreground">{i + 1}</span>
                </div>
                <p className="text-sm text-foreground">{step}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-6 border-t flex justify-center">
            <Button variant="accent" asChild>
              <Link to="/app/new">Start Another Practice Session</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SessionDetail;
