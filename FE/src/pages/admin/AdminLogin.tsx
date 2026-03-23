import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, Eye, EyeOff, Info, Loader2, ShieldCheck } from 'lucide-react';

import { BrandIcon } from '@/components/layout/BrandIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/contexts/LanguageContext';

export function AdminLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, clearAuth, isAuthenticated, loading, user } = useAuth();
  const { language } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const provider = searchParams.get('oauth_provider');
  const notice = searchParams.get('notice');
  const noticeEmail = searchParams.get('email');
  const oauthError = searchParams.get('oauth_error');
  const copy = {
    noAdminAccess: language === 'vi' ? 'Tài khoản này không có quyền truy cập khu vực admin.' : 'This account does not have access to the admin area.',
    loginError: language === 'vi' ? 'Không thể đăng nhập admin lúc này.' : 'Unable to sign in to the admin area right now.',
    panelBody: language === 'vi'
      ? 'Đăng nhập bằng tài khoản admin local đã xác thực email. Quyền admin phụ chỉ được kích hoạt sau khi admin chính mời và bạn xác thực mã code.'
      : 'Sign in with a verified local admin account. Secondary admin access is only activated after the primary admin invites the account and email verification is completed.',
    subtitle: language === 'vi'
      ? 'Dùng email và mật khẩu local của tài khoản admin. Google/GitHub không dùng cho khu vực admin.'
      : 'Use the local email/password for your admin account. Google/GitHub is not used inside the admin area.',
    adminEmail: language === 'vi' ? 'Email admin' : 'Admin email',
    password: language === 'vi' ? 'Mật khẩu' : 'Password',
    hidePassword: language === 'vi' ? 'Ẩn mật khẩu' : 'Hide password',
    showPassword: language === 'vi' ? 'Hiện mật khẩu' : 'Show password',
    signingIn: language === 'vi' ? 'Đang đăng nhập...' : 'Signing in...',
    enterAdmin: language === 'vi' ? 'Vào khu vực admin' : 'Enter admin area',
    invitedNoAccount: language === 'vi' ? 'Đã được admin chính mời nhưng chưa có tài khoản?' : 'Were you invited by the primary admin but do not have an account yet?',
    createAdminAccount: language === 'vi' ? 'Tạo tài khoản admin' : 'Create admin account',
    notAdmin: language === 'vi' ? 'Không phải admin?' : 'Not an admin?',
    userLogin: language === 'vi' ? 'Đăng nhập người dùng' : 'Log in as user',
  };

  const adminNotice = useMemo(() => {
    if (notice === 'admin-local-only') {
      return provider === 'google' || provider === 'github'
        ? `Because ${noticeEmail || 'this account'} is managed as an admin account, ${provider} sign-in is disabled here. Use the admin sign-in link and continue with your local email/password admin credentials.`
        : 'This account is managed as an admin account. Use the admin sign-in link and continue with your local email/password admin credentials.';
    }
    if (notice === 'admin-access-granted') {
      return noticeEmail
        ? `${noticeEmail} already has a verified account and has just been granted admin access. Sign in here with the same local email/password you already use for Invera.`
        : 'This verified account has just been granted admin access. Sign in here with the same local email/password you already use for Invera.';
    }
    return null;
  }, [notice, noticeEmail, provider]);

  useEffect(() => {
    if (noticeEmail) {
      setEmail(noticeEmail);
    }
  }, [noticeEmail]);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) return;
    if (user?.is_admin) {
      navigate('/admin', { replace: true });
      return;
    }
    navigate('/app', { replace: true });
  }, [isAuthenticated, loading, navigate, user]);

  useEffect(() => {
    if (oauthError && !adminNotice) {
      setErrorMsg(oauthError);
    }
  }, [adminNotice, oauthError]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const me = await login(email, password);
      if (!me.is_admin) {
        clearAuth();
        setErrorMsg(copy.noAdminAccess);
        return;
      }
      navigate('/admin', { replace: true });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : copy.loginError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/95 to-primary/90" />
        <div className="absolute inset-0 overflow-hidden opacity-20">
          <div className="absolute top-1/4 -right-32 w-96 h-96 bg-accent rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -left-32 w-96 h-96 bg-accent rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex items-center justify-center p-12 lg:p-16">
          <div className="max-w-md">
            <Link to="/" className="inline-flex items-center gap-2.5 mb-12 group">
              <BrandIcon className="w-10 h-10 shadow-lg transition-transform group-hover:-translate-y-0.5" />
              <span className="font-bold text-2xl text-white">invera</span>
            </Link>

            <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
              Admin access only
            </h2>
            <p className="text-white/90 text-lg leading-relaxed">
              {copy.panelBody}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12">
        <div className="w-full max-w-md">
          <Link to="/" className="flex lg:hidden items-center gap-2.5 mb-8">
            <BrandIcon className="w-10 h-10 shadow-md" />
            <span className="font-bold text-2xl text-foreground">invera</span>
          </Link>

          <div className="bg-card border border-border/60 rounded-2xl p-8 sm:p-10 shadow-lg">
            <div className="mb-8">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-5">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3 tracking-tight">
                Admin login
              </h1>
              <p className="text-base text-muted-foreground leading-relaxed">
                {copy.subtitle}
              </p>
            </div>

            {adminNotice && (
              <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-sky-100 p-1.5 text-sky-700">
                    <Info className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold">
                      {notice === 'admin-access-granted' ? 'Admin access granted' : 'Admin account detected'}
                    </p>
                    <p className="leading-relaxed">{adminNotice}</p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {errorMsg && (
                <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-2.5">
                <Label htmlFor="admin-email" className="text-sm font-semibold text-foreground">
                  {copy.adminEmail}
                </Label>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 text-base border-border/80 focus:border-accent focus-visible:ring-accent"
                />
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="admin-password" className="text-sm font-semibold text-foreground">
                  {copy.password}
                </Label>
                <div className="relative">
                  <Input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 text-base pr-12 border-border/80 focus:border-accent focus-visible:ring-accent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? copy.hidePassword : copy.showPassword}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="accent"
                size="lg"
                disabled={isSubmitting || loading}
                className="w-full h-12 text-base font-semibold shadow-md hover:shadow-lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {copy.signingIn}
                  </>
                ) : (
                  <>
                    {copy.enterAdmin}
                    <ArrowRight className="w-5 h-5 ml-1" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-border/60 space-y-3 text-center">
              <p className="text-sm text-muted-foreground">
                {copy.invitedNoAccount}{' '}
                <Link to="/admin/signup" className="text-accent hover:text-accent/80 font-semibold hover:underline">
                  {copy.createAdminAccount}
                </Link>
              </p>
              <p className="text-sm text-muted-foreground">
                {copy.notAdmin}{' '}
                <Link to="/login" className="text-accent hover:text-accent/80 font-semibold hover:underline">
                  {copy.userLogin}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
