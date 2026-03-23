import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/use-auth';
import { authApi } from '@/lib/api';
import { BrandIcon } from '@/components/layout/BrandIcon';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { t } = useLanguage();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const oauthError = searchParams.get('oauth_error');
    if (oauthError) {
      setErrorMsg(oauthError);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/app', { replace: true });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('login', 'error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Form with card container */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <Link to="/" className="flex lg:hidden items-center gap-2.5 mb-8">
            <BrandIcon className="w-10 h-10 shadow-md" />
            <span className="font-bold text-2xl text-foreground">invera</span>
          </Link>

          {/* Form Card */}
          <div className="bg-card border border-border/60 rounded-2xl p-8 sm:p-10 shadow-lg">
            {/* Header with clear hierarchy */}
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3 tracking-tight">
                {t('login', 'welcome')}
              </h1>
              <p className="text-base text-muted-foreground leading-relaxed">
                {t('login', 'subtitle')}
              </p>
            </div>

            {/* Form with improved spacing */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error message */}
              {errorMsg && (
                <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-2.5">
                <Label htmlFor="email" className="text-sm font-semibold text-foreground">
                  {t('login', 'email')}
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-semibold text-foreground">
                    {t('login', 'password')}
                  </Label>
                  <Link 
                    to="/forgot-password" 
                    className="text-sm text-accent hover:text-accent/80 font-medium hover:underline transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
                  >
                    {t('login', 'forgot')}
                  </Link>
                </div>
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
              </div>

              {/* Primary CTA - Dominant */}
              <Button 
                type="submit" 
                variant="accent" 
                size="lg" 
                disabled={isSubmitting}
                className="w-full h-12 text-base font-semibold shadow-md hover:shadow-lg mt-8"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {t('login', 'submitting')}
                  </>
                ) : (
                  <>
                    {t('login', 'submit')}
                    <ArrowRight className="w-5 h-5 ml-1" />
                  </>
                )}
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
                  type="button"
                  variant="outline" 
                  size="lg" 
                  className="h-12 border-border/80 hover:bg-accent/5 hover:border-accent/50 transition-all"
                  onClick={() => authApi.oauthRedirect('google')}
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
                  type="button"
                  variant="outline" 
                  size="lg" 
                  className="h-12 border-border/80 hover:bg-accent/5 hover:border-accent/50 transition-all"
                  onClick={() => authApi.oauthRedirect('github')}
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  <span className="font-medium">GitHub</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Footer Link */}
          <p className="mt-8 text-center text-sm text-muted-foreground">
            {t('login', 'noAccount')}{' '}
            <Link 
              to="/signup" 
              className="text-accent hover:text-accent/80 font-semibold hover:underline transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
            >
              {t('login', 'signupLink')}
            </Link>
          </p>
        </div>
      </div>

      {/* Right Panel - Marketing with improved contrast */}
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
          <div className="max-w-md text-center">
            {/* Logo */}
            <Link to="/" className="inline-flex items-center gap-2.5 mb-12 group">
              <BrandIcon className="w-10 h-10 shadow-lg transition-transform group-hover:-translate-y-0.5" />
              <span className="font-bold text-2xl text-white">invera</span>
            </Link>

            <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
              Luyện tập tạo nên sự hoàn hảo
            </h2>
            <p className="text-white/90 text-lg leading-relaxed">
              Tham gia cùng hàng nghìn người tìm việc đã cải thiện kỹ năng phỏng vấn 
              với luyện tập và phản hồi được hỗ trợ bởi AI.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
