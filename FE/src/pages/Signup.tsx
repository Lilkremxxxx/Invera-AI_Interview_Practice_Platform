import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, ArrowRight, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const Signup = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { language, t } = useLanguage();

  const benefits = [
    { vi: 'Phiên luyện tập không giới hạn', en: 'Unlimited practice sessions' },
    { vi: 'Phản hồi được hỗ trợ bởi AI', en: 'AI-powered feedback' },
    { vi: 'Theo dõi tiến độ của bạn', en: 'Track your progress' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = '/app';
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Marketing with improved contrast */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        {/* Darker overlay for better text contrast */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/95 to-primary/90" />
        
        {/* Subtle accent elements */}
        <div className="absolute inset-0 overflow-hidden opacity-20">
          <div className="absolute top-1/4 -right-32 w-96 h-96 bg-accent rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -left-32 w-96 h-96 bg-accent rounded-full blur-3xl" />
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex items-center justify-center p-12 lg:p-16">
          <div className="max-w-md">
            {/* Logo */}
            <Link to="/" className="inline-flex items-center gap-2.5 mb-12 group">
              <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                <Sparkles className="w-6 h-6 text-accent-foreground" />
              </div>
              <span className="font-bold text-2xl text-white">invera</span>
            </Link>

            <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
              {language === 'vi' ? 'Bắt đầu hành trình phỏng vấn của bạn' : 'Start your interview journey'}
            </h2>
            <p className="text-white/90 text-lg mb-10 leading-relaxed">
              {language === 'vi' ? 'Nhận luyện tập và phản hồi cá nhân hóa để có được công việc mơ ước.' : 'Get personalized practice and feedback to land your dream job.'}
            </p>
            
            <ul className="space-y-5">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-3.5 text-white/95">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-accent" />
                  </div>
                  <span className="text-base font-medium">{benefit[language]}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Right Panel - Form with card container */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <Link to="/" className="flex lg:hidden items-center gap-2.5 mb-8">
            <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center shadow-md">
              <Sparkles className="w-6 h-6 text-accent-foreground" />
            </div>
            <span className="font-bold text-2xl text-foreground">invera</span>
          </Link>

          {/* Form Card */}
          <div className="bg-card border border-border/60 rounded-2xl p-8 sm:p-10 shadow-lg">
            {/* Header with clear hierarchy */}
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3 tracking-tight">
                {t('signup', 'title')}
              </h1>
              <p className="text-base text-muted-foreground leading-relaxed">
                {language === 'vi' ? 'Bắt đầu luyện tập miễn phí. Không cần thẻ tín dụng.' : 'Start practicing for free. No credit card required.'}
              </p>
            </div>

            {/* Form with improved spacing */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2.5">
                <Label htmlFor="name" className="text-sm font-semibold text-foreground">
                  {t('signup', 'name')}
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Nguyễn Văn A"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-12 text-base border-border/80 focus:border-accent focus-visible:ring-accent"
                />
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="email" className="text-sm font-semibold text-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ban@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 text-base border-border/80 focus:border-accent focus-visible:ring-accent"
                />
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="password" className="text-sm font-semibold text-foreground">
                  {t('signup', 'password')}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 text-base pr-12 border-border/80 focus:border-accent focus-visible:ring-accent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
                    aria-label={showPassword ? t('login', 'hidePassword') : t('login', 'showPassword')}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground/80 mt-2">
                  Phải có ít nhất 8 ký tự
                </p>
              </div>

              {/* Primary CTA - Dominant */}
              <Button 
                type="submit" 
                variant="accent" 
                size="lg" 
                className="w-full h-12 text-base font-semibold shadow-md hover:shadow-lg mt-8"
              >
                {t('signup', 'submit')}
                <ArrowRight className="w-5 h-5 ml-1" />
              </Button>
            </form>

            {/* Social Login - Visually separated */}
            <div className="mt-8 pt-8 border-t border-border/60">
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/60" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-3 py-1 text-muted-foreground/70 font-medium">
                    Hoặc tiếp tục với
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="h-12 border-border/80 hover:bg-accent/5 hover:border-accent/50 transition-all"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="font-medium">Google</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="h-12 border-border/80 hover:bg-accent/5 hover:border-accent/50 transition-all"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  <span className="font-medium">GitHub</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-8 space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              {t('signup', 'hasAccount')}{' '}
              <Link 
                to="/login" 
                className="text-accent hover:text-accent/80 font-semibold hover:underline transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
              >
                {t('signup', 'loginLink')}
              </Link>
            </p>

            <p className="text-xs text-muted-foreground/70 leading-relaxed px-4">
              Bằng cách tạo tài khoản, bạn đồng ý với{' '}
              <Link 
                to="/terms" 
                className="text-muted-foreground hover:text-foreground underline transition-colors"
              >
                Điều khoản
              </Link>
              {' '}và{' '}
              <Link 
                to="/privacy" 
                className="text-muted-foreground hover:text-foreground underline transition-colors"
              >
                Chính sách bảo mật
              </Link>
              {' '}của chúng tôi
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
